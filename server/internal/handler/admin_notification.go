package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminNotificationHandler struct {
	DB *gorm.DB
}

func (h *AdminNotificationHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	nType := c.Query("type")

	query := h.DB.Model(&model.Notification{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if nType != "" {
		query = query.Where("type = ?", nType)
	}

	var total int64
	query.Count(&total)

	var notifications []model.Notification
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&notifications)

	c.JSON(http.StatusOK, gin.H{
		"data":      notifications,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminNotificationHandler) Create(c *gin.Context) {
	var n model.Notification
	if err := c.ShouldBindJSON(&n); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.DB.Create(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create notification"})
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *AdminNotificationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var n model.Notification
	if err := h.DB.First(&n, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "notification not found"})
		return
	}

	var req model.Notification
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.DB.Model(&n).Updates(map[string]interface{}{
		"title":      req.Title,
		"content":    req.Content,
		"type":       req.Type,
		"target":     req.Target,
		"status":     req.Status,
		"show_popup": req.ShowPopup,
		"start_at":   req.StartAt,
		"end_at":     req.EndAt,
	})

	c.JSON(http.StatusOK, n)
}

func (h *AdminNotificationHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.Notification{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "notification not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
