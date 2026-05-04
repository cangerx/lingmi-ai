package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdHandler struct {
	DB *gorm.DB
}

func (h *AdHandler) List(c *gin.Context) {
	slot := c.Query("slot")
	now := time.Now()

	query := h.DB.Model(&model.Ad{}).Where(
		"status = ? AND (start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?)",
		"enabled", now, now)

	if slot != "" {
		query = query.Where("slot = ?", slot)
	}

	var ads []model.Ad
	query.Order("sort ASC, id DESC").Find(&ads)

	c.JSON(http.StatusOK, gin.H{"data": ads})
}
