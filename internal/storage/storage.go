package storage

import (
	"context"
	"os"
	"time"

	"github.com/dokoola/websocket/pkg"
	"github.com/patrickmn/go-cache"
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

// InMemoryStorage implements Storage using go-cache for in-memory caching with expiration
type InMemoryStorage struct {
	users      *cache.Cache
	online     *cache.Cache
	rooms      *cache.Cache
	sessionTTL time.Duration
}

func NewInMemoryStorage() *InMemoryStorage {
	ttl := 24 * time.Hour
	if v := os.Getenv("SESSION_TTL"); v != "" {
		if t, err := time.ParseDuration(v + "s"); err == nil {
			ttl = t
		}
	}
	cleanupInterval := 5 * time.Minute
	store := &InMemoryStorage{
		users:      cache.New(ttl, cleanupInterval),
		online:     cache.New(cache.NoExpiration, cleanupInterval),
		rooms:      cache.New(cache.NoExpiration, cleanupInterval),
		sessionTTL: ttl,
	}
	// Verify caches are initialized
	if store.users == nil || store.online == nil || store.rooms == nil {
		// ERROR: One or more caches failed to initialize
	}
	return store
}

func (s *InMemoryStorage) SetUser(ctx context.Context, user pkg.User) error {
	s.users.Set(user.PublicID, user, cache.DefaultExpiration)
	return nil
}

func (s *InMemoryStorage) GetUser(ctx context.Context, publicID string) (*pkg.User, error) {
	if val, found := s.users.Get(publicID); found {
		u := val.(pkg.User)
		return &u, nil
	}
	return nil, nil
}

func (s *InMemoryStorage) DeleteUser(ctx context.Context, publicID string) error {
	s.users.Delete(publicID)
	s.online.Delete(publicID)
	return nil
}

func (s *InMemoryStorage) ListOnlineUsers(ctx context.Context) ([]string, error) {
	items := s.online.Items()
	ids := make([]string, 0, len(items))
	for id := range items {
		ids = append(ids, id)
	}
	// Log cache state for debugging
	if len(ids) == 0 {
		// Cache is empty - verify cache exists and is initialized
		if s.online == nil {
			// ERROR: online cache is nil!
		}
	}
	return ids, nil
}

func (s *InMemoryStorage) SetOnline(ctx context.Context, publicID string) error {
	s.online.Set(publicID, true, cache.NoExpiration)
	// Verify the user was actually added
	if _, found := s.online.Get(publicID); found {
		// User successfully added to online cache
	} else {
		// WARNING: User was not added to online cache
	}
	return nil
}

func (s *InMemoryStorage) SetOffline(ctx context.Context, publicID string) error {
	s.online.Delete(publicID)
	return nil
}

func (s *InMemoryStorage) AddUserToRoom(ctx context.Context, roomID string, user pkg.User) error {
	var roomMap map[string]pkg.User
	if val, found := s.rooms.Get(roomID); found {
		roomMap = val.(map[string]pkg.User)
	} else {
		roomMap = make(map[string]pkg.User)
	}
	roomMap[user.PublicID] = user
	s.rooms.Set(roomID, roomMap, cache.NoExpiration)
	return nil
}

func (s *InMemoryStorage) RemoveUserFromRoom(ctx context.Context, roomID, publicID string) error {
	if val, found := s.rooms.Get(roomID); found {
		roomMap := val.(map[string]pkg.User)
		delete(roomMap, publicID)
		if len(roomMap) == 0 {
			s.rooms.Delete(roomID)
		} else {
			s.rooms.Set(roomID, roomMap, cache.NoExpiration)
		}
	}
	return nil
}

func (s *InMemoryStorage) ListRoomMembers(ctx context.Context, roomID string) ([]pkg.User, error) {
	if val, found := s.rooms.Get(roomID); found {
		roomMap := val.(map[string]pkg.User)
		users := make([]pkg.User, 0, len(roomMap))
		for _, u := range roomMap {
			users = append(users, u)
		}
		return users, nil
	}
	return []pkg.User{}, nil
}

func (s *InMemoryStorage) ClearAll(ctx context.Context) error {
	s.users.Flush()
	s.online.Flush()
	s.rooms.Flush()
	return nil
}
