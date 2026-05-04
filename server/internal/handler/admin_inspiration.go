package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminInspirationHandler struct {
	DB *gorm.DB
}

func (h *AdminInspirationHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	tag := c.Query("tag")
	search := c.Query("search")

	query := h.DB.Model(&model.Inspiration{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if tag != "" {
		query = query.Where("tag = ?", tag)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR author ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var items []model.Inspiration
	query.Order("sort ASC, created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&items)

	c.JSON(http.StatusOK, gin.H{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminInspirationHandler) Create(c *gin.Context) {
	var item model.Inspiration
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if item.Status == "" {
		item.Status = "pending"
	}
	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *AdminInspirationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var item model.Inspiration
	if err := h.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.DB.Model(&item).Updates(updates)
	h.DB.First(&item, id)
	c.JSON(http.StatusOK, item)
}

func (h *AdminInspirationHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.Inspiration{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

func (h *AdminInspirationHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.DB.Model(&model.Inspiration{}).Where("id = ?", id).Update("status", req.Status)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "状态已更新"})
}

func (h *AdminInspirationHandler) ToggleFeatured(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var item model.Inspiration
	if err := h.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到"})
		return
	}

	h.DB.Model(&item).Update("featured", !item.Featured)
	c.JSON(http.StatusOK, gin.H{"featured": !item.Featured})
}
