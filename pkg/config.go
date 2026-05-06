package pkg

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type GlobalConfig struct {
	Logger *zap.Logger
}

type WebsocketConn struct {
	UserID      string
	SocketID    string
	StartTime   time.Time
	Connenction *websocket.Conn
	writeMu     sync.Mutex
}

func (s *WebsocketConn) WriteJSON(v any) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return s.Connenction.WriteJSON(v)
}

func (s *WebsocketConn) WriteMessage(msgType int, data []byte) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return s.Connenction.WriteMessage(msgType, data)
}

func (s *WebsocketConn) ReadJSON(v any) error {
	return s.Connenction.ReadJSON(v)
}

func (s *WebsocketConn) SetReadDeadline(t time.Time) error {
	return s.Connenction.SetReadDeadline(t)
}

func (s *WebsocketConn) Close() error {
	return s.Connenction.Close()
}

type JSONConn interface {
	WriteJSON(v any) error
}
