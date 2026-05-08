package server

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
	"unsafe"

	"github.com/dokoola/websocket/internal/controller"
	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	WriteBufferPool: &sync.Pool{},
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS: allow all origins (for now)
	},
}

type Hub struct {
	storage storage.Storage
	conns   map[string]*pkg.WebsocketConn
	mu      sync.RWMutex
}

func NewHub(storage storage.Storage) *Hub {
	return &Hub{
		storage: storage,
		conns:   make(map[string]*pkg.WebsocketConn),
	}
}

func (h *Hub) RegisterConn(publicID string, conn *pkg.WebsocketConn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.conns[publicID] = conn
}

func (h *Hub) UnregisterConn(publicID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns, publicID)
}

func (h *Hub) GetConn(publicID string) pkg.JSONConn {
	h.mu.RLock()
	defer h.mu.RUnlock()
	conn, ok := h.conns[publicID]
	if !ok {
		return nil
	}
	return conn
}

func (h *Hub) SnapshotConns() []pkg.JSONConn {
	h.mu.RLock()
	defer h.mu.RUnlock()

	connections := make([]pkg.JSONConn, 0, len(h.conns))
	for _, c := range h.conns {
		if c != nil {
			connections = append(connections, c)
		}
	}
	return connections
}

// atomicTime is a thread-safe time.Time using atomic operations.
type atomicTime struct {
	v unsafe.Pointer
}

func newAtomicTime(t time.Time) *atomicTime {
	a := &atomicTime{}
	a.Store(t)
	return a
}

func (a *atomicTime) Store(t time.Time) {
	p := new(time.Time)
	*p = t
	atomic.StorePointer(&a.v, unsafe.Pointer(p))
}

func (a *atomicTime) Load() time.Time {
	return *(*time.Time)(atomic.LoadPointer(&a.v))
}

// WebSocketHandler upgrades HTTP to WebSocket and dispatches events.
func WebSocketHandler(
	hub *Hub,
	auth *controller.AuthController,
	call *controller.CallController,
	room *controller.RoomController,
	config *pkg.GlobalConfig,
) http.HandlerFunc {
	// Read env config once at startup, not per connection.
	idleTimeout := time.Duration(pkg.GetEnvInt("MAX_CONN_IDLE", 30)) * time.Minute

	logger := *config.Logger

	return func(w http.ResponseWriter, r *http.Request) {

		rawConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Warn("websocket upgrade failed", zap.Error(err))
			return
		}

		// Context with cancellation -- propagated to all handlers.
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		var user *pkg.User

		// done channel -- closed exactly once via sync.Once.
		done := make(chan struct{})
		var closeOnce sync.Once
		closeDone := func() {
			closeOnce.Do(func() { close(done) })
		}

		// Wrap with write mutex for concurrent-safe writes.
		ws := &pkg.WebsocketConn{
			Connenction: rawConn,
			StartTime:   time.Now(),
		}
		defer ws.Close()

		// Thread-safe last active timestamp.
		lastActive := newAtomicTime(time.Now())

		// Watchdog goroutine -- closes idle connections.
		go func() {
			ticker := time.NewTicker(5 * time.Minute)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					if time.Since(lastActive.Load()) > idleTimeout {
						logger.Info("closing idle connection")
						// FIX (Bug 4): cancel the context so any in-flight
						// handler that is blocked on ctx stops promptly.
						cancel()
						ws.WriteMessage(
							websocket.CloseMessage,
							websocket.FormatCloseMessage(
								websocket.CloseNormalClosure,
								"connection closed due to inactivity",
							),
						)
						ws.Close()
						closeDone()
						return
					}
				case <-done:
					return
				}
			}
		}()

		for {
			ws.SetReadDeadline(time.Now().Add(idleTimeout))

			var msg map[string]interface{}
			if err := ws.ReadJSON(&msg); err != nil {
				break
			}

			lastActive.Store(time.Now())

			// Validate message fields.
			event, ok := msg["event"].(string)
			if !ok || event == "" {
				ws.WriteJSON(map[string]string{"error": "missing event field"})
				continue
			}
			data := msg["data"]

			// Guard non-auth events behind login check.
			if user == nil && event != "login" {
				ws.WriteJSON(map[string]string{"error": "unauthorized"})
				continue
			}

			switch event {
			case "login":
				u := auth.HandleLogin(ctx, ws, data)
				v, ok := u.(*pkg.User)
				if ok {
					user = v
					ws.UserID = user.PublicID
					ws.SocketID = user.SocketID
					hub.RegisterConn(user.PublicID, ws)
					logger.Debug("INFO logged in", zap.String("name", user.Name[:12]), zap.String("pid", user.PublicID[:10]))
					ws.WriteJSON(map[string]any{"event": "login-success", "data": user.SocketID})
					auth.DispatchOnlineUsers(user, ctx, hub.SnapshotConns())
				} else {
					logger.Debug("Type assertion failed",
						zap.String("expected", "pkg.User"),
						zap.String("actual", fmt.Sprintf("%T", u)),
					)
					ws.WriteJSON(map[string]string{"error": "login failed"})
				}

			case "logout":
				if user != nil {
					auth.HandleLogout(user, ctx, ws)
					hub.UnregisterConn(user.PublicID)
					user = nil
				}

			case "ping":
				lastActive.Store(time.Now())
				ws.WriteJSON(map[string]string{"event": "pong", "data": user.SocketID})

			case "get-online-users":
				auth.HandleOnlineUsers(user, ctx, ws)

			case "initiate-call":
				call.HandleInitiate(user, ctx, ws, data, hub)

			case "accept-call":
				call.HandleAccept(user, ctx, ws, data, hub)

			case "decline-call":
				call.HandleDecline(user, ctx, ws, data, hub)

			case "cancel-call":
				call.HandleCancel(user, ctx, ws, data, hub)

			case "end-end":
				call.HandleEnd(user, ctx, ws, data, hub)

			case "media-state":
				call.HandleMediaState(user, ctx, ws, data, hub)

			case "room-join":
				room.HandleJoin(user, ctx, ws, data, hub)

			case "room-leave":
				room.HandleLeave(user, ctx, ws, data, hub)

			case "room-message":
				room.HandleMessage(user, ctx, ws, data, hub)

			default:
				logger.Warn("unknown event received", zap.String("event", event))
				ws.WriteJSON(map[string]string{"error": "unknown event: " + event})
			}
		}

		// Connection dropped -- clean up.
		closeDone()
		cancel()

		if user != nil {
			hub.UnregisterConn(user.PublicID)
			auth.HandleLogout(user, ctx, ws)
			user = nil
		}
	}
}
