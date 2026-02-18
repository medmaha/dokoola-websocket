package controller

import (
	"context"
	"encoding/json"

	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"github.com/gorilla/websocket"
)

type AuthController struct {
	Storage storage.Storage
	logger *zap.Logger
}

func NewAuthController(s storage.Storage, logger *zap.Logger) *AuthController {
	return &AuthController{Storage: s, logger: logger}
}

// HandleLogin processes login event, stores user, and confirms login
func (a *AuthController	) HandleLogin(ctx context.Context, conn *websocket.Conn, data interface{}) string {
	b, _ := json.Marshal(data)
	var user pkg.User
	logger := a.logger
	 

	if err := json.Unmarshal(b, &user); err != nil || user.PublicID == "" {
		logger.Warn("WARN Login failed: invalid user data", zap.Any("data", data))
		conn.WriteJSON(map[string]interface{}{"event": "login-error", "data": "invalid user data"})
		return ""
	}
	user.SocketID = conn.RemoteAddr().String()
	a.Storage.SetUser(ctx, user)
	a.Storage.SetOnline(ctx, user.PublicID)
	logger.Info("INFO User logged in", zap.String("publicID", user.PublicID))
	conn.WriteJSON(map[string]interface{}{"event": "login-success", "data": user})
	return user.PublicID
}

// HandleLogout processes logout event and confirms logout
func (a *AuthController) HandleLogout(ctx context.Context, conn *websocket.Conn, publicID string) {
	a.Storage.DeleteUser(ctx, publicID)
	logger := a.logger

	logger.Info("INFO User logged out", zap.String("publicID", publicID))
	conn.WriteJSON(map[string]interface{}{"event": "logout-success"})
}

// HandleOnlineUsers returns the list of online users
func (a *AuthController) HandleOnlineUsers(ctx context.Context, conn *websocket.Conn) {
	users, _ := a.Storage.ListOnlineUsers(ctx)
	logger := a.logger

	logger.Info("INFO Online users requested", zap.Int("count", len(users)))
	conn.WriteJSON(map[string]interface{}{"event": "online-users", "data": users})
}
