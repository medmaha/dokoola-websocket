package controller

import (
	"context"
	"encoding/json"

	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"github.com/gorilla/websocket"
)

type CallController struct {
	Storage storage.Storage
	logger *zap.Logger
}

func NewCallController(s storage.Storage, logger *zap.Logger) *CallController {
	return &CallController{Storage: s, logger: logger}
}

func (c *CallController) HandleInitiate(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{GetConn(string) *websocket.Conn}) {
	b, _ := json.Marshal(data)
	var call pkg.CallData
	json.Unmarshal(b, &call)
	remoteConn := hub.GetConn(call.RemoteID)
	if remoteConn == nil {
		conn.WriteJSON(map[string]interface{}{"event": "call-not-found", "data": "user not online"})
		c.logger.Warn("WARN Call initiation failed: user not online", zap.String("remote_id", call.RemoteID))
		return
	}
	c.logger.Info("INFO Call initiated", zap.String("caller_id", call.CallerID), zap.String("remote_id", call.RemoteID))
	remoteConn.WriteJSON(map[string]interface{}{"event": "call-incoming", "data": call})
	conn.WriteJSON(map[string]interface{}{"event": "call-initiated", "data": call})
}

func (c *CallController) HandleAccept(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{GetConn(string) *websocket.Conn}) {
	b, _ := json.Marshal(data)
	var call pkg.CallData
	json.Unmarshal(b, &call)
	remoteConn := hub.GetConn(call.CallerID)
	if remoteConn != nil {
		remoteConn.WriteJSON(map[string]interface{}{"event": "call-accepted", "data": call})
	}

	c.logger.Info("INFO Call accepted", zap.String("caller_id", call.CallerID), zap.String("remote_id", call.RemoteID))
	conn.WriteJSON(map[string]interface{}{"event": "call-accepted", "data": call})
}

func (c *CallController) HandleDecline(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{GetConn(string) *websocket.Conn}) {
	b, _ := json.Marshal(data)
	var call pkg.CallData
	json.Unmarshal(b, &call)
	remoteConn := hub.GetConn(call.CallerID)
	if remoteConn != nil {
		remoteConn.WriteJSON(map[string]interface{}{"event": "call-declined", "data": call})
	}
	c.logger.Info("INFO Call declined", zap.String("caller_id", call.CallerID), zap.String("remote_id", call.RemoteID))
	conn.WriteJSON(map[string]interface{}{"event": "call-declined", "data": call})
}

func (c *CallController) HandleCancel(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{GetConn(string) *websocket.Conn}) {
	b, _ := json.Marshal(data)
	var call pkg.CallData
	json.Unmarshal(b, &call)
	remoteConn := hub.GetConn(call.RemoteID)
	if remoteConn != nil {
		remoteConn.WriteJSON(map[string]interface{}{"event": "call-cancelled", "data": call})
	}
	c.logger.Info("INFO Call cancelled", zap.String("caller_id", call.CallerID), zap.String("remote_id", call.RemoteID))
	conn.WriteJSON(map[string]interface{}{"event": "call-cancelled", "data": call})
}

func (c *CallController) HandleEnd(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{GetConn(string) *websocket.Conn}) {
	b, _ := json.Marshal(data)
	var call pkg.CallData
	json.Unmarshal(b, &call)
	remoteConn := hub.GetConn(call.RemoteID)
	if remoteConn != nil {
		remoteConn.WriteJSON(map[string]interface{}{"event": "call-ended", "data": call})
	}
	c.logger.Info("INFO Call ended", zap.String("caller_id", call.CallerID), zap.String("remote_id", call.RemoteID))
	conn.WriteJSON(map[string]interface{}{"event": "call-ended", "data": call})
}

func (c *CallController) HandleMediaState(ctx context.Context, conn *websocket.Conn, data interface{}, hub interface{GetConn(string) *websocket.Conn}) {
	b, _ := json.Marshal(data)
	var call pkg.CallData
	json.Unmarshal(b, &call)
	remoteConn := hub.GetConn(call.RemoteID)
	if remoteConn != nil {
		remoteConn.WriteJSON(map[string]interface{}{"event": "media-state", "data": call})
	}
	c.logger.Info("INFO Media state updated", zap.String("caller_id", call.CallerID), zap.String("remote_id", call.RemoteID))
	conn.WriteJSON(map[string]interface{}{"event": "media-state", "data": call})
}
