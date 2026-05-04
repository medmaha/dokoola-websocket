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

func (r *RoomController) HandleJoin(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{ GetConn(string) *websocket.Conn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID string   `json:"room_id"`
		User   pkg.User `json:"user"`
	}
	json.Unmarshal(b, &req)
	r.logger.Info("INFO User joined room", zap.String("room_id", req.RoomID), zap.String("user_id", req.User.PublicID))
	r.Storage.AddUserToRoom(ctx, req.RoomID, req.User)
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil {
			c.WriteJSON(map[string]interface{}{"event": "room-joined", "data": map[string]interface{}{"room_id": req.RoomID, "members": members}})
		}
	}
}

func (r *RoomController) HandleLeave(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{ GetConn(string) *websocket.Conn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID string `json:"room_id"`
		UserID string `json:"user_id"`
	}
	json.Unmarshal(b, &req)
	r.logger.Info("INFO User left room", zap.String("room_id", req.RoomID), zap.String("user_id", req.UserID))
	r.Storage.RemoveUserFromRoom(ctx, req.RoomID, req.UserID)
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil {
			c.WriteJSON(map[string]interface{}{"event": "room-left", "data": map[string]interface{}{"room_id": req.RoomID, "members": members}})
		}
	}
}

func (r *RoomController) HandleMessage(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{ GetConn(string) *websocket.Conn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID  string      `json:"room_id"`
		Message interface{} `json:"message"`
		Sender  struct {
			PublicID string `json:"public_id"`
		} `json:"sender"`
	}
	json.Unmarshal(b, &req)
	r.logger.Info("INFO Room message sent", zap.String("room_id", req.RoomID), zap.String("sender_id", req.Sender.PublicID))
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil {
			c.WriteJSON(map[string]interface{}{"event": "room-message", "data": map[string]interface{}{"room_id": req.RoomID, "message": req.Message, "sender": req.Sender}})
		}
	}
}
