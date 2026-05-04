package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type InspirationHandler struct {
	DB *gorm.DB
}

// List returns approved inspirations for the public frontend
func (h *InspirationHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	tag := c.Query("tag")

	query := h.DB.Model(&model.Inspiration{}).Where("status = ?", "approved")
	if tag != "" && tag != "全部" {
		query = query.Where("tag = ?", tag)
	}

	var total int64
	query.Count(&total)

	var items []model.Inspiration
	query.Order("featured DESC, sort ASC, created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&items)

	// Increment views
	for i := range items {
		h.DB.Model(&items[i]).UpdateColumn("views", gorm.Expr("views + 1"))
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Tags returns distinct tags
func (h *InspirationHandler) Tags(c *gin.Context) {
	var tags []string
	h.DB.Model(&model.Inspiration{}).Where("status = ?", "approved").
		Distinct("tag").Where("tag != ''").Pluck("tag", &tags)
	c.JSON(http.StatusOK, gin.H{"data": tags})
}
