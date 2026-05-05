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

// Hub manages active WebSocket connections
type Hub struct {
	storage storage.Storage
	conns   map[string]*websocket.Conn
	mu      sync.RWMutex
}

func NewHub(storage storage.Storage) *Hub {
	return &Hub{
		storage: storage,
		conns:   make(map[string]*websocket.Conn),
	}
}

func (h *Hub) RegisterConn(publicID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.conns[publicID] = conn
}

func (h *Hub) UnregisterConn(publicID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns, publicID)
}

func (h *Hub) GetConn(publicID string) *websocket.Conn {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.conns[publicID]
}

// safeConn wraps a websocket.Conn with a write mutex to prevent concurrent writes
type safeConn struct {
	conn    *websocket.Conn
	writeMu sync.Mutex
}

func (s *safeConn) WriteJSON(v interface{}) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return s.conn.WriteJSON(v)
}

func (s *safeConn) WriteMessage(msgType int, data []byte) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return s.conn.WriteMessage(msgType, data)
}

func (s *safeConn) ReadJSON(v interface{}) error {
	return s.conn.ReadJSON(v)
}

func (s *safeConn) SetReadDeadline(t time.Time) error {
	return s.conn.SetReadDeadline(t)
}

func (s *safeConn) Close() error {
	return s.conn.Close()
}

// atomicTime is a thread-safe time.Time using atomic operations
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

// WebSocketHandler upgrades HTTP to WebSocket and dispatches events
func WebSocketHandler(
	hub *Hub,
	auth *controller.AuthController,
	call *controller.CallController,
	room *controller.RoomController,
	config *pkg.GlobalConfig,
) http.HandlerFunc {
	// Read env config once at startup, not per connection
	idleTimeout := time.Duration(pkg.GetEnvInt("MAX_CONN_IDLE", 30)) * time.Minute

	logger := *config.Logger

	return func(w http.ResponseWriter, r *http.Request) {

		rawConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Warn("websocket upgrade failed", zap.Error(err))
			return
		}

		// Wrap with write mutex for concurrent-safe writes
		conn := &safeConn{conn: rawConn}
		defer conn.Close()

		// Context with cancellation — propagated to all handlers
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		var user *pkg.User

		// done channel — closed exactly once via sync.Once
		done := make(chan struct{})
		var closeOnce sync.Once
		closeDone := func() {
			closeOnce.Do(func() { close(done) })
		}

		// Thread-safe last active timestamp
		lastActive := newAtomicTime(time.Now())

		// Watchdog goroutine — closes idle connections
		go func() {
			ticker := time.NewTicker(5 * time.Minute)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					if time.Since(lastActive.Load()) > idleTimeout {
						logger.Info("closing idle connection")
						conn.WriteMessage(
							websocket.CloseMessage,
							websocket.FormatCloseMessage(
								websocket.CloseNormalClosure,
								"connection closed due to inactivity",
							),
						)
						conn.Close()
						closeDone()
						return
					}
				case <-done:
					return
				}
			}
		}()

		// Main read loop
		connection := conn.conn

		fmt.Printf("\n[UserMemoeryID]: %p\n", &user)

		for {
			conn.SetReadDeadline(time.Now().Add(idleTimeout))

			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				break
			}

			lastActive.Store(time.Now())

			// Validate message fields
			event, ok := msg["event"].(string)
			if !ok || event == "" {
				conn.WriteJSON(map[string]string{"error": "missing event field"})
				continue
			}
			data := msg["data"]

			// Guard non-auth events behind login check
			if user == nil && event != "login" {
				conn.WriteJSON(map[string]string{"error": "unauthorized"})
				continue
			}

			switch event {
			case "login":
				u := auth.HandleLogin(ctx, connection, data)
				switch v := u.(type) {
				case pkg.User:
					user = &v
					hub.RegisterConn(user.PublicID, connection)
				default:
					conn.WriteJSON(map[string]string{"error": "login failed"})
				}

			case "logout":
				if user != nil {
					auth.HandleLogout(user, ctx, connection)
					hub.UnregisterConn(user.PublicID)
					user = nil
				}

			case "ping":
				lastActive.Store(time.Now())
				conn.WriteJSON(map[string]string{"event": "pong", "data": user.SocketID})

			case "get-online-users":
				auth.HandleOnlineUsers(user, ctx, connection)

			// case "call-initiate":
			// 	call.HandleInitiate(user, ctx, connection, data, hub)

			// case "call-accept":
			// 	call.HandleAccept(user, ctx, connection, data, hub)

			// case "call-decline":
			// 	call.HandleDecline(user, ctx, connection, data, hub)

			// case "call-cancel":
			// 	call.HandleCancel(user, ctx, connection, data, hub)

			// case "call-end":
			// 	call.HandleEnd(user, ctx, connection, data, hub)

			// case "media-state":
			// 	call.HandleMediaState(user, ctx, connection, data, hub)

			case "room-join":
				room.HandleJoin(user, ctx, connection, data, hub)

			case "room-leave":
				room.HandleLeave(user, ctx, connection, data, hub)

			case "room-message":
				room.HandleMessage(user, ctx, connection, data, hub)

			default:
				logger.Warn("unknown event received", zap.String("event", event))
				conn.WriteJSON(map[string]string{"error": "unknown event: " + event})
			}
		}

		// Connection dropped — clean up
		closeDone()
		cancel()

		if user != nil {
			hub.UnregisterConn(user.PublicID)
			auth.HandleLogout(user, ctx, connection)
			user = nil
		}
	}
}
