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
	logger  *zap.Logger
}

func NewAuthController(s storage.Storage, logger *zap.Logger) *AuthController {
	return &AuthController{Storage: s, logger: logger}
}

// HandleLogin processes login event, stores user, and confirms login
func (a *AuthController) HandleLogin(ctx context.Context, conn *websocket.Conn, data interface{}) any {
	b, _ := json.Marshal(data)
	var user pkg.User
	logger := a.logger

	if err := json.Unmarshal(b, &user); err != nil || user.PublicID == "" {
		logger.Warn("WARN Login failed: invalid user data", zap.Any("data", data))
		conn.WriteJSON(map[string]interface{}{"event": "login-error", "data": "invalid user data"})
		return nil
	}
	user.SocketID = conn.RemoteAddr().String()

	if err := a.Storage.SetUser(ctx, user); err != nil {
		logger.Warn("WARN Failed to set user", zap.String("publicID", user.PublicID), zap.Error(err))
		conn.WriteJSON(map[string]interface{}{"event": "login-error", "data": "failed to store user"})
		return nil
	}

	if err := a.Storage.SetOnline(ctx, user.PublicID); err != nil {
		logger.Warn("WARN Failed to set user online", zap.String("publicID", user.PublicID), zap.Error(err))
		conn.WriteJSON(map[string]interface{}{"event": "login-error", "data": "failed to set online status"})
		return nil
	}

	logger.Debug("INFO User logged in", zap.String("publicID", user.Name))
	conn.WriteJSON(map[string]interface{}{"event": "login-success", "data": user})
	return user
}

// HandleLogout processes logout event and confirms logout
func (a *AuthController) HandleLogout(ctx context.Context, conn *websocket.Conn, user *pkg.User) {
	a.Storage.DeleteUser(ctx, user.PublicID)
	logger := a.logger

	uName := user.Name
	if uName == "" {
		uName = user.PublicID
	}
	logger.Debug("INFO User logged out", zap.String("publicID", uName))
	conn.WriteJSON(map[string]interface{}{"event": "logout-success"})
}

// HandleOnlineUsers returns the list of online users
func (a *AuthController) HandleOnlineUsers(ctx context.Context, conn *websocket.Conn) {
	users, err := a.Storage.ListOnlineUsers(ctx)
	logger := a.logger
	if err != nil {
		logger.Warn("WARN Failed to get online users", zap.Error(err))
	}
	conn.WriteJSON(map[string]interface{}{"event": "online-users", "data": users})
}
