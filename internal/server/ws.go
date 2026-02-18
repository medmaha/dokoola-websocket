package server

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/dokoola/websocket/internal/controller"
	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
    WriteBufferSize: 1024,
	// Reuse buffers to save memory
    WriteBufferPool: &sync.Pool{}, 
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS: allow all origins (for now)
	},
}

type Hub struct {
	storage storage.Storage
	conns   map[string]*websocket.Conn // publicID -> conn
	mu      sync.RWMutex
}

func NewHub(storage storage.Storage) *Hub {
	return &Hub{
		storage: storage,
		conns:   make(map[string]*websocket.Conn),
	}
}

func (h *Hub) RegisterConn(publicID string, conn *websocket.Conn) {
	h.mu.Lock(); defer h.mu.Unlock()
	h.conns[publicID] = conn
}

func (h *Hub) UnregisterConn(publicID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	delete(h.conns, publicID)
}

func (h *Hub) GetConn(publicID string) *websocket.Conn {
	h.mu.RLock(); defer h.mu.RUnlock()
	return h.conns[publicID]
}

// WebSocketHandler upgrades HTTP to WebSocket and dispatches events
func WebSocketHandler(hub *Hub, auth *controller.AuthController, call *controller.CallController, room *controller.RoomController, config *pkg.GlobalConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := config.Logger

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Warn("WARN WebSocket upgrade failed", zap.Error(err))
			return
		}
		defer conn.Close()

		ctx := context.Background()
		var publicID string

		// Auto-close inactive connections after 30 minutes
		idleTimeout := time.Duration(pkg.GetEnvInt("MAX_CONN_IDLE", 30)) * time.Minute
		lastActive := time.Now()
		done := make(chan struct{})

		// Watchdog goroutine		
		go func() {
			ticker := time.NewTicker(5 * time.Minute)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					if time.Since(lastActive) > idleTimeout {
						conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Connection closed due to inactivity"))
						conn.Close()
						close(done)
						return
					}
				case <-done:
					return
				}
			}
		}()


		
		for {
			var msg map[string]interface{}
			conn.SetReadDeadline(time.Now().Add(idleTimeout))
			if err := conn.ReadJSON(&msg); err != nil {
				break
			}
			lastActive = time.Now()
				event, _ := msg["event"].(string)
				data := msg["data"]
				logger.Info("INFO Received WebSocket event - event=%s data=%v", zap.String("event", event), zap.Any("data", data))
			switch event {
			case "login":
				pid := auth.HandleLogin(ctx, conn, data)
				if pid != "" {
					publicID = pid
					hub.RegisterConn(publicID, conn)
				}
			case "logout":
				if publicID != "" {
					auth.HandleLogout(ctx, conn, publicID)
					hub.UnregisterConn(publicID)
					publicID = ""
				}
			case "online-users":
				auth.HandleOnlineUsers(ctx, conn)
			case "call-initiate":
				call.HandleInitiate(ctx, conn, data, hub)
			case "call-accept":
				call.HandleAccept(ctx, conn, data, hub)
			case "call-decline":
				call.HandleDecline(ctx, conn, data, hub)
			case "call-cancel":
				call.HandleCancel(ctx, conn, data, hub)
			case "call-end":
				call.HandleEnd(ctx, conn, data, hub)
			case "media-state":
				call.HandleMediaState(ctx, conn, data, hub)
			case "room-join":
				room.HandleJoin(ctx, conn, data, hub)
			case "room-leave":
				room.HandleLeave(ctx, conn, data, hub)
			case "room-message":
				room.HandleMessage(ctx, conn, data, hub)
			default:
				// Unknown event
			}
		}
		close(done)
		if publicID != "" {
			hub.UnregisterConn(publicID)
			auth.HandleLogout(ctx, conn, publicID)
		}
	}
}
