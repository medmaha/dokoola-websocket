package storage

import (
	"context"
	"log"

	"github.com/dokoola/websocket/pkg"
)

type Storage interface {
	SetUser(ctx context.Context, user pkg.User) error
	GetUser(ctx context.Context, publicID string) (*pkg.User, error)
	DeleteUser(ctx context.Context, publicID string) error
	ListOnlineUsers(ctx context.Context) ([]string, error)
	SetOnline(ctx context.Context, publicID string) error
	SetOffline(ctx context.Context, publicID string) error
	// Room management
	AddUserToRoom(ctx context.Context, roomID string, user pkg.User) error
	RemoveUserFromRoom(ctx context.Context, roomID, publicID string) error
	ListRoomMembers(ctx context.Context, roomID string) ([]pkg.User, error)
	// For test/dev: clear all
	ClearAll(ctx context.Context) error
}

// NewStorage initializes storage: Redis if available, otherwise in-memory
// No runtime fallback - storage type is determined once at startup for performance
func NewStorage() Storage {
	redis, err := NewRedisClient()
	if err != nil {
		log.Printf("Redis not available, using in-memory cache: %v", err)
		return NewInMemoryStorage()
	}

	if redis == nil {
		log.Println("Redis URL not configured, using in-memory cache")
		return NewInMemoryStorage()
	}

	log.Println("Using Redis storage")
	return redis
}
