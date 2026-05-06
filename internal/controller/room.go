package controller

import (
	"context"
	"encoding/json"

	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"
)

type RoomController struct {
	Storage storage.Storage
	logger  *zap.Logger
}

func NewRoomController(s storage.Storage, logger *zap.Logger) *RoomController {
	return &RoomController{Storage: s, logger: logger}
}

func shortID(value string) string {
	if len(value) <= 10 {
		return value
	}
	return value[:10]
}

func (r *RoomController) HandleJoin(user *pkg.User, ctx context.Context, conn pkg.JSONConn, data interface{}, hub interface{ GetConn(string) pkg.JSONConn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID string `json:"room_id"`
	}
	json.Unmarshal(b, &req)
	r.Storage.AddUserToRoom(ctx, req.RoomID, *user)
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)

		if c != nil && m.PublicID != user.PublicID {
			c.WriteJSON(map[string]interface{}{"event": "room-joined", "data": map[string]interface{}{"room_id": req.RoomID, "members": members}})
		}
	}
}

func (r *RoomController) HandleLeave(user *pkg.User, ctx context.Context, conn pkg.JSONConn, data interface{}, hub interface{ GetConn(string) pkg.JSONConn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID string `json:"room_id"`
	}
	json.Unmarshal(b, &req)
	r.Storage.RemoveUserFromRoom(ctx, req.RoomID, user.PublicID)
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil && m.PublicID != user.PublicID {
			c.WriteJSON(map[string]interface{}{"event": "room-left", "data": map[string]interface{}{"room_id": req.RoomID, "members": members}})
		}
	}
}

func (r *RoomController) HandleMessage(user *pkg.User, ctx context.Context, conn pkg.JSONConn, data interface{}, hub interface{ GetConn(string) pkg.JSONConn }) {
	b, _ := json.Marshal(data)
	var req struct {
		RoomID  string      `json:"room_id"`
		Message pkg.Message `json:"message"`
	}
	json.Unmarshal(b, &req)
	if req.RoomID == "" {
		req.RoomID = req.Message.ThreadUniqueID
	}
	members, _ := r.Storage.ListRoomMembers(ctx, req.RoomID)
	sentTOMSGRecipient := false
	for _, m := range members {
		c := hub.GetConn(m.PublicID)
		if c != nil && m.PublicID != req.Message.SenderID {
			err := c.WriteJSON(map[string]interface{}{"event": "room-message", "data": map[string]interface{}{"room_id": req.RoomID, "message": req.Message}})
			if err == nil {
				sentTOMSGRecipient = m.PublicID == req.Message.SenderID
			}
		}
	}

	// HACK: if the recipient isn't in the room (common when room IDs differ per user),
	// try direct delivery by recipient public_id.
	if !sentTOMSGRecipient && req.Message.RecipientID != "" {
		rc := hub.GetConn(req.Message.RecipientID)
		if rc == nil {
			r.logger.Warn(
				"WARN recipient not connected",
				zap.String("recipient_id", shortID(req.Message.RecipientID)),
				zap.String("room_id", shortID(req.RoomID)),
			)
			return
		}
		if err := rc.WriteJSON(map[string]interface{}{"event": "room-message", "data": map[string]interface{}{"room_id": req.RoomID, "message": req.Message}}); err != nil {
			r.logger.Warn(
				"WARN direct deliver failed",
				zap.String("recipient_id", shortID(req.Message.RecipientID)),
				zap.String("room_id", shortID(req.RoomID)),
			)
		}
	}
}
