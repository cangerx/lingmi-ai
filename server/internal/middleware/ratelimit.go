package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/cache"
)

// RateLimit limits requests per user per minute.
// If Redis is unavailable, rate limiting is skipped.
func RateLimit(rpm int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cache.Client == nil || rpm <= 0 {
			c.Next()
			return
		}

		userID := c.GetUint("user_id")
		var key string
		if userID > 0 {
			key = fmt.Sprintf("rl:user:%d:%s", userID, time.Now().Format("200601021504"))
		} else {
			key = fmt.Sprintf("rl:ip:%s:%s", c.ClientIP(), time.Now().Format("200601021504"))
		}

		count, err := cache.IncrWithTTL(context.Background(), key, time.Minute)
		if err != nil {
			c.Next()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rpm))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, int64(rpm)-count)))

		if count > int64(rpm) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "请求过于频繁，请稍后再试",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ChatRateLimit specifically limits chat/image generation requests
func ChatRateLimit(rpm int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cache.Client == nil || rpm <= 0 {
			c.Next()
			return
		}

		userID := c.GetUint("user_id")
		if userID == 0 {
			c.Next()
			return
		}

		key := fmt.Sprintf("rl:chat:%d:%s", userID, time.Now().Format("200601021504"))

		count, err := cache.IncrWithTTL(context.Background(), key, time.Minute)
		if err != nil {
			c.Next()
			return
		}

		if count > int64(rpm) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "对话/生成请求过于频繁，请稍后再试",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
