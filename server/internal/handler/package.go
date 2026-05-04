package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type PackageHandler struct {
	DB *gorm.DB
}

func (h *PackageHandler) List(c *gin.Context) {
	var packages []model.Package
	h.DB.Where("status = ?", "active").Order("sort ASC, id ASC").Find(&packages)
	c.JSON(http.StatusOK, gin.H{"data": packages})
}
