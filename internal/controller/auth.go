package controller

import (
	"context"
	"encoding/json"

	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"crypto/sha256"
	"encoding/hex"
)

type AuthController struct {
	Storage storage.Storage
	logger  *zap.Logger
}

func NewAuthController(s storage.Storage, logger *zap.Logger) *AuthController {
	return &AuthController{Storage: s, logger: logger}
}

var hashSalt = pkg.GetEnv("SOCKET_ID_HASH", "653a3cd231a67ba8b7799e")

func generateSocketIdHex(input string) string {
	// 1. Hash the input string using SHA-256
	hash := sha256.Sum256([]byte(input + hashSalt))
	// 2. Encode the hash to a hexadecimal string
	hexStr := hex.EncodeToString(hash[:])
	// 3. Truncate to 32 characters
	return hexStr[:32]
}

// HandleLogin processes login event, stores user, and confirms login
func (a *AuthController) HandleLogin(ctx context.Context, conn pkg.JSONConn, data any) any {
	b, _ := json.Marshal(data)

	var user pkg.User
	logger := a.logger

	if err := json.Unmarshal(b, &user); err != nil || user.PublicID == "" {
		logger.Warn("WARN Login failed: invalid user data", zap.Any("data", data))
		conn.WriteJSON(map[string]any{"event": "login-error", "data": "invalid user data"})
		return nil
	}

	if err := a.Storage.SetUser(ctx, user); err != nil {
		logger.Warn("WARN Failed to set user", zap.String("publicID", user.PublicID), zap.Error(err))
		conn.WriteJSON(map[string]any{"event": "login-error", "data": "failed to store user"})
		return nil
	}

	if err := a.Storage.SetOnline(ctx, user.PublicID); err != nil {
		logger.Warn("WARN Failed to set user online", zap.String("publicID", user.PublicID), zap.Error(err))
		conn.WriteJSON(map[string]any{"event": "login-error", "data": "failed to set online status"})
		return nil
	}
	// set the user's socket-id
	user.SocketID = generateSocketIdHex(user.PublicID)

	return &user
}

// HandleLogout processes logout event and confirms logout
func (a *AuthController) HandleLogout(user *pkg.User, ctx context.Context, conn pkg.JSONConn) {
	a.Storage.DeleteUser(ctx, user.PublicID)
	logger := a.logger
	logger.Debug("INFO logged out", zap.String("publicID", user.PublicID))
	conn.WriteJSON(map[string]interface{}{"event": "logout-success"})
}

// HandleOnlineUsers returns the list of online users
func (a *AuthController) HandleOnlineUsers(user *pkg.User, ctx context.Context, conn pkg.JSONConn) {
	users, err := a.Storage.ListOnlineUsers(ctx)
	logger := a.logger
	if err != nil {
		logger.Warn("WARN Failed to get online users", zap.Error(err))
	}
	conn.WriteJSON(map[string]interface{}{"event": "online-users-list", "data": users})
}

// HandleOnlineUsers returns the list of online users
func (a *AuthController) DispatchOnlineUsers(user *pkg.User, ctx context.Context, connections []pkg.JSONConn) {
	users, err := a.Storage.ListOnlineUsers(ctx)
	logger := a.logger
	if err != nil {
		logger.Warn("WARN Failed to get online users", zap.Error(err))
	}
	for _, conn := range connections {
		if conn != nil { // defensive nil check here too
			conn.WriteJSON(map[string]interface{}{"event": "online-users-list", "data": users})
		}
	}
}
