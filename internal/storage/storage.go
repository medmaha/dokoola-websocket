package storage

import (
	"context"
	"os"
	"sync"
	"time"

	"github.com/dokoola/websocket/pkg"

	"github.com/go-redis/redis/v8"
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

// RedisStorage implements Storage using Redis
type RedisStorage struct {
	rdb *redis.Client
	sessionTTL time.Duration
}

func NewRedisStorage() *RedisStorage {
	url := os.Getenv("REDIS_URL")
	ttl := 24 * time.Hour
	if v := os.Getenv("SESSION_TTL"); v != "" {
		if t, err := time.ParseDuration(v+"s"); err == nil {
			ttl = t
		}
	}
	opt, _ := redis.ParseURL(url)
	rdb := redis.NewClient(opt)
	return &RedisStorage{rdb: rdb, sessionTTL: ttl}
}

func (s *RedisStorage) SetUser(ctx context.Context, user pkg.User) error {
	key := "user:" + user.PublicID
	err := s.rdb.HSet(ctx, key, map[string]interface{}{
		"public_id": user.PublicID,
		"name": user.Name,
		"avatar": user.Avatar,
		"socket_id": user.SocketID,
	}).Err()
	if err != nil { return err }
	s.rdb.Expire(ctx, key, s.sessionTTL)
	return nil
}

func (s *RedisStorage) GetUser(ctx context.Context, publicID string) (*pkg.User, error) {
	key := "user:" + publicID
	m, err := s.rdb.HGetAll(ctx, key).Result()
	if err != nil || len(m) == 0 { return nil, err }
	return &pkg.User{
		PublicID: m["public_id"],
		Name: m["name"],
		Avatar: m["avatar"],
		SocketID: m["socket_id"],
	}, nil
}

func (s *RedisStorage) DeleteUser(ctx context.Context, publicID string) error {
	key := "user:" + publicID
	s.rdb.Del(ctx, key)
	s.rdb.SRem(ctx, "online_users", publicID)
	return nil
}

func (s *RedisStorage) ListOnlineUsers(ctx context.Context) ([]string, error) {
	return s.rdb.SMembers(ctx, "online_users").Result()
}

func (s *RedisStorage) SetOnline(ctx context.Context, publicID string) error {
	return s.rdb.SAdd(ctx, "online_users", publicID).Err()
}

func (s *RedisStorage) SetOffline(ctx context.Context, publicID string) error {
	return s.rdb.SRem(ctx, "online_users", publicID).Err()
}

func (s *RedisStorage) AddUserToRoom(ctx context.Context, roomID string, user pkg.User) error {
	key := "room:" + roomID
	return s.rdb.HSet(ctx, key, user.PublicID, user.Name+"|"+user.Avatar+"|"+user.SocketID).Err()
}

func (s *RedisStorage) RemoveUserFromRoom(ctx context.Context, roomID, publicID string) error {
	key := "room:" + roomID
	return s.rdb.HDel(ctx, key, publicID).Err()
}

func (s *RedisStorage) ListRoomMembers(ctx context.Context, roomID string) ([]pkg.User, error) {
	key := "room:" + roomID
	m, err := s.rdb.HGetAll(ctx, key).Result()
	if err != nil { return nil, err }
	users := []pkg.User{}
	for pid, v := range m {
		parts := make([]string, 3)
		copy(parts, split3(v, '|'))
		users = append(users, pkg.User{
			PublicID: pid,
			Name: parts[0],
			Avatar: parts[1],
			SocketID: parts[2],
		})
	}
	return users, nil
}

func (s *RedisStorage) ClearAll(ctx context.Context) error {
	s.rdb.FlushDB(ctx)
	return nil
}

// InMemoryStorage implements Storage using Go maps (for fallback)
type InMemoryStorage struct {
	mu sync.RWMutex
	users map[string]pkg.User
	online map[string]struct{}
	rooms map[string]map[string]pkg.User
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		users: make(map[string]pkg.User),
		online: make(map[string]struct{}),
		rooms: make(map[string]map[string]pkg.User),
	}
}

func (s *InMemoryStorage) SetUser(ctx context.Context, user pkg.User) error {
	s.mu.Lock(); defer s.mu.Unlock()
	s.users[user.PublicID] = user
	return nil
}

func (s *InMemoryStorage) GetUser(ctx context.Context, publicID string) (*pkg.User, error) {
	s.mu.RLock(); defer s.mu.RUnlock()
	u, ok := s.users[publicID]
	if !ok { return nil, nil }
	return &u, nil
}

func (s *InMemoryStorage) DeleteUser(ctx context.Context, publicID string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	delete(s.users, publicID)
	delete(s.online, publicID)
	return nil
}

func (s *InMemoryStorage) ListOnlineUsers(ctx context.Context) ([]string, error) {
	s.mu.RLock(); defer s.mu.RUnlock()
	ids := make([]string, 0, len(s.online))
	for id := range s.online { ids = append(ids, id) }
	return ids, nil
}

func (s *InMemoryStorage) SetOnline(ctx context.Context, publicID string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	s.online[publicID] = struct{}{}
	return nil
}

func (s *InMemoryStorage) SetOffline(ctx context.Context, publicID string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	delete(s.online, publicID)
	return nil
}

func (s *InMemoryStorage) AddUserToRoom(ctx context.Context, roomID string, user pkg.User) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if s.rooms[roomID] == nil { s.rooms[roomID] = make(map[string]pkg.User) }
	s.rooms[roomID][user.PublicID] = user
	return nil
}

func (s *InMemoryStorage) RemoveUserFromRoom(ctx context.Context, roomID, publicID string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if s.rooms[roomID] != nil { delete(s.rooms[roomID], publicID) }
	return nil
}

func (s *InMemoryStorage) ListRoomMembers(ctx context.Context, roomID string) ([]pkg.User, error) {
	s.mu.RLock(); defer s.mu.RUnlock()
	m := s.rooms[roomID]
	users := make([]pkg.User, 0, len(m))
	for _, u := range m { users = append(users, u) }
	return users, nil
}

func (s *InMemoryStorage) ClearAll(ctx context.Context) error {
	s.mu.Lock(); defer s.mu.Unlock()
	s.users = make(map[string]pkg.User)
	s.online = make(map[string]struct{})
	s.rooms = make(map[string]map[string]pkg.User)
	return nil
}

// Helper for splitting up to 3 parts
func split3(s string, sep byte) []string {
	out := make([]string, 3)
	i := 0
	for i < 2 {
		idx := -1
		for j := 0; j < len(s); j++ {
			if s[j] == sep { idx = j; break }
		}
		if idx == -1 { break }
		out[i] = s[:idx]
		s = s[idx+1:]
		i++
	}
	out[i] = s
	return out
}
