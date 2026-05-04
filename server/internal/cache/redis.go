package cache

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/lingmiai/server/internal/config"
	"github.com/redis/go-redis/v9"
)

var Client *redis.Client

func Connect(cfg *config.RedisConfig) *redis.Client {
	Client = redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Client.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis] Connection failed: %v (cache disabled)", err)
		Client = nil
		return nil
	}

	log.Println("[Redis] Connected")
	return Client
}

// Set stores a value with optional TTL
func Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	if Client == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return Client.Set(ctx, key, data, ttl).Err()
}

// Get retrieves a value and unmarshals it into dest
func Get(ctx context.Context, key string, dest any) error {
	if Client == nil {
		return redis.Nil
	}
	data, err := Client.Get(ctx, key).Bytes()
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// SetRaw stores raw bytes directly (no JSON marshaling)
func SetRaw(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	if Client == nil {
		return nil
	}
	return Client.Set(ctx, key, data, ttl).Err()
}

// GetRaw retrieves raw bytes directly (no JSON unmarshaling)
func GetRaw(ctx context.Context, key string) ([]byte, error) {
	if Client == nil {
		return nil, redis.Nil
	}
	return Client.Get(ctx, key).Bytes()
}

// Del removes keys
func Del(ctx context.Context, keys ...string) error {
	if Client == nil {
		return nil
	}
	return Client.Del(ctx, keys...).Err()
}

// Exists checks if a key exists
func Exists(ctx context.Context, key string) bool {
	if Client == nil {
		return false
	}
	n, _ := Client.Exists(ctx, key).Result()
	return n > 0
}

// Incr increments a key and sets TTL if it's a new key
func IncrWithTTL(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	if Client == nil {
		return 0, nil
	}
	val, err := Client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	if val == 1 {
		Client.Expire(ctx, key, ttl)
	}
	return val, nil
}
