package service

import (
	"log"
	"time"

	"gorm.io/gorm"
)

// StartOrderExpireWorker runs a background goroutine that expires unpaid orders older than 30 minutes
func StartOrderExpireWorker(db *gorm.DB) {
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			expireTime := time.Now().Add(-30 * time.Minute)
			result := db.Exec(
				"UPDATE orders SET status = 'expired', updated_at = ? WHERE status = 'pending' AND created_at < ?",
				time.Now(), expireTime,
			)
			if result.RowsAffected > 0 {
				log.Printf("[OrderExpire] Expired %d unpaid orders", result.RowsAffected)
			}
		}
	}()
	log.Println("[OrderExpire] Worker started (30min timeout, checks every 2min)")
}
