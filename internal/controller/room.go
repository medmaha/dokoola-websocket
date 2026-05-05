package controller

import (
	"context"
	"encoding/json"

	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"github.com/gorilla/websocket"
)

type RoomController struct {
	Storage storage.Storage
	logger  *zap.Logger
}

func NewRoomController(s storage.Storage, logger *zap.Logger) *RoomController {
	return &RoomController{Storage: s, logger: logger}
}

func (r *RoomController) HandleJoin(user *pkg.User, ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{ GetConn(string) *websocket.Conn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID string   `json:"room_id"`
		User   pkg.User `json:"user"`
	}
	json.Unmarshal(b, &req)
	r.logger.Debug("INFO joined room", zap.String("room_id", req.RoomID[:10]), zap.String("user_id", req.User.PublicID[:10]))
	r.Storage.AddUserToRoom(ctx, req.RoomID, req.User)
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)

		if c != nil && m.PublicID != req.User.PublicID {
			c.WriteJSON(map[string]interface{}{"event": "room-joined", "data": map[string]interface{}{"room_id": req.RoomID, "members": members}})
		}
	}
}

func (r *RoomController) HandleLeave(user *pkg.User, ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{ GetConn(string) *websocket.Conn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID string `json:"room_id"`
		UserID string `json:"user_id"`
	}
	json.Unmarshal(b, &req)
	r.logger.Debug("INFO left room", zap.String("room_id", req.RoomID), zap.String("user_id", req.UserID))
	r.Storage.RemoveUserFromRoom(ctx, req.RoomID, req.UserID)
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil && m.PublicID != req.UserID {
			c.WriteJSON(map[string]interface{}{"event": "room-left", "data": map[string]interface{}{"room_id": req.RoomID, "members": members}})
		}
	}
}

func (r *RoomController) HandleMessage(user *pkg.User, ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{ GetConn(string) *websocket.Conn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID  string      `json:"room_id"`
		Message pkg.Message `json:"message"`
	}
	json.Unmarshal(b, &req)
	r.logger.Debug("INFO message sent", zap.String("room_id", req.RoomID), zap.String("sender_id", req.Message.SenderID), zap.String("sender_id", req.Message.SenderID))
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil && m.PublicID != req.Message.SenderID {
			c.WriteJSON(map[string]interface{}{"event": "room-message", "data": map[string]interface{}{"room_id": req.RoomID, "message": req.Message, "sender": req.Message.SenderID}})
		}
	}
}
