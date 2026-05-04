package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	DB *gorm.DB
}

func (h *NotificationHandler) List(c *gin.Context) {
	now := time.Now()
	var notifications []model.Notification
	h.DB.Where("status = ? AND (start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?)",
		"published", now, now).
		Order("id DESC").Limit(20).Find(&notifications)

	c.JSON(http.StatusOK, gin.H{"data": notifications})
}
