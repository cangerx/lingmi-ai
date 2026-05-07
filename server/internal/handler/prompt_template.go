package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type PromptTemplateHandler struct {
	DB *gorm.DB
}

// List returns prompt templates, optionally filtered by category.
func (h *PromptTemplateHandler) List(c *gin.Context) {
	category := c.Query("category")

	query := h.DB.Model(&model.PromptTemplate{}).Where("status = ?", "active")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var templates []model.PromptTemplate
	query.Order("sort ASC, id DESC").Limit(50).Find(&templates)

	c.JSON(http.StatusOK, gin.H{"data": templates})
}

// Categories returns distinct categories.
func (h *PromptTemplateHandler) Categories(c *gin.Context) {
	var categories []string
	h.DB.Model(&model.PromptTemplate{}).
		Where("status = ?", "active").
		Distinct("category").
		Pluck("category", &categories)

	c.JSON(http.StatusOK, gin.H{"data": categories})
}
