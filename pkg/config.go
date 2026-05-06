package pkg

import (
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type GlobalConfig struct {
	Logger *zap.Logger
}

type WebsocketConn struct {
	UserID      string
	SocketID    string
	StartTime   string
	Connenction *websocket.Conn
}

type JSONConn interface {
	WriteJSON(v interface{}) error
}
