package storage

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/dokoola/websocket/pkg"
	"github.com/redis/go-redis/v9"
)

type Redis struct {
	ctx    context.Context
	client *redis.Client
}

func NewRedisClient() (*Redis, error) {
	redisURL := pkg.GetEnv("REDIS_URL", "")
	if redisURL == "" {
		return nil, nil // Redis not configured
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	client := redis.NewClient(opt)

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &Redis{ctx: ctx, client: client}, nil
}

// SetUser stores a user in Redis
func (r *Redis) SetUser(ctx context.Context, user pkg.User) error {
	data, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, "user:"+user.PublicID, data, 24*time.Hour).Err()
}

// GetUser retrieves a user from Redis
func (r *Redis) GetUser(ctx context.Context, publicID string) (*pkg.User, error) {
	data, err := r.client.Get(ctx, "user:"+publicID).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var user pkg.User
	if err := json.Unmarshal([]byte(data), &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// DeleteUser removes a user from Redis
func (r *Redis) DeleteUser(ctx context.Context, publicID string) error {
	pipe := r.client.Pipeline()
	pipe.Del(ctx, "user:"+publicID)
	pipe.SRem(ctx, "online_users", publicID)
	_, err := pipe.Exec(ctx)
	return err
}

// ListOnlineUsers retrieves all online user IDs from Redis
func (r *Redis) ListOnlineUsers(ctx context.Context) ([]string, error) {
	return r.client.SMembers(ctx, "online_users").Result()
}

// SetOnline marks a user as online
func (r *Redis) SetOnline(ctx context.Context, publicID string) error {
	return r.client.SAdd(ctx, "online_users", publicID).Err()
}

// SetOffline marks a user as offline
func (r *Redis) SetOffline(ctx context.Context, publicID string) error {
	return r.client.SRem(ctx, "online_users", publicID).Err()
}

// AddUserToRoom adds a user to a room
func (r *Redis) AddUserToRoom(ctx context.Context, roomID string, user pkg.User) error {
	data, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return r.client.HSet(ctx, "room:"+roomID, user.PublicID, data).Err()
}

// RemoveUserFromRoom removes a user from a room
func (r *Redis) RemoveUserFromRoom(ctx context.Context, roomID, publicID string) error {
	return r.client.HDel(ctx, "room:"+roomID, publicID).Err()
}

// ListRoomMembers retrieves all members of a room
func (r *Redis) ListRoomMembers(ctx context.Context, roomID string) ([]pkg.User, error) {
	vals, err := r.client.HGetAll(ctx, "room:"+roomID).Result()
	if err != nil {
		return nil, err
	}

	users := make([]pkg.User, 0, len(vals))
	for _, data := range vals {
		var user pkg.User
		if err := json.Unmarshal([]byte(data), &user); err != nil {
			log.Printf("failed to unmarshal user: %v", err)
			continue
		}
		users = append(users, user)
	}
	return users, nil
}

// ClearAll clears all data from Redis (for testing/dev only)
func (r *Redis) ClearAll(ctx context.Context) error {
	keys, err := r.client.Keys(ctx, "*").Result()
	if err != nil {
		return err
	}
	if len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}
