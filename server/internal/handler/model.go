package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type ModelHandler struct {
	DB *gorm.DB
}

func (h *ModelHandler) List(c *gin.Context) {
	modelType := c.Query("type")

	query := h.DB.Model(&model.Model{}).Where("status = ?", "active")
	if modelType != "" {
		query = query.Where("type = ?", modelType)
	}

	var models []model.Model
	query.Order("sort ASC, id ASC").Find(&models)

	c.JSON(http.StatusOK, gin.H{"data": models})
}
