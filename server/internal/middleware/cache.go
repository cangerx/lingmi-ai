package middleware

import (
	"context"
	"crypto/md5"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/cache"
)

// CacheResponse caches GET responses in Redis for the given TTL.
// Cache key is based on the full request URI.
func CacheResponse(ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet || cache.Client == nil {
			c.Next()
			return
		}

		key := fmt.Sprintf("cache:%x", md5.Sum([]byte(c.Request.RequestURI)))

		// Try cache hit
		if cached, err := cache.GetRaw(context.Background(), key); err == nil {
			c.Data(http.StatusOK, "application/json; charset=utf-8", cached)
			c.Abort()
			return
		}

		// Use a response writer wrapper to capture the response
		w := &cacheWriter{ResponseWriter: c.Writer, body: make([]byte, 0, 1024)}
		c.Writer = w
		c.Next()

		// Only cache successful responses (store raw bytes to avoid double encoding)
		if w.Status() >= 200 && w.Status() < 300 && len(w.body) > 0 {
			_ = cache.SetRaw(context.Background(), key, w.body, ttl)
		}
	}
}

type cacheWriter struct {
	gin.ResponseWriter
	body []byte
}

func (w *cacheWriter) Write(data []byte) (int, error) {
	w.body = append(w.body, data...)
	return w.ResponseWriter.Write(data)
}
