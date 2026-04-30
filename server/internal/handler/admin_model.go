package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminModelHandler struct {
	DB *gorm.DB
}

func (h *AdminModelHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	modelType := c.Query("type")

	var models []model.Model
	var total int64

	query := h.DB.Model(&model.Model{})
	if modelType != "" {
		query = query.Where("type = ?", modelType)
	}

	query.Count(&total)
	query.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&models)

	c.JSON(http.StatusOK, gin.H{
		"data":      models,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminModelHandler) Create(c *gin.Context) {
	var m model.Model
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if m.Status == "" {
		m.Status = "active"
	}
	if err := h.DB.Create(&m).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create model"})
		return
	}
	c.JSON(http.StatusCreated, m)
}

func (h *AdminModelHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var m model.Model
	if err := h.DB.First(&m, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.DB.Model(&m).Updates(updates)
	h.DB.First(&m, id)
	c.JSON(http.StatusOK, m)
}

func (h *AdminModelHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.Model{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
