package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminPackageHandler struct {
	DB *gorm.DB
}

func (h *AdminPackageHandler) List(c *gin.Context) {
	var packages []model.Package
	h.DB.Order("sort ASC, id ASC").Find(&packages)
	c.JSON(http.StatusOK, gin.H{"data": packages})
}

func (h *AdminPackageHandler) Create(c *gin.Context) {
	var pkg model.Package
	if err := c.ShouldBindJSON(&pkg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.DB.Create(&pkg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create package"})
		return
	}
	c.JSON(http.StatusOK, pkg)
}

func (h *AdminPackageHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var pkg model.Package
	if err := h.DB.First(&pkg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
		return
	}

	var req model.Package
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.DB.Model(&pkg).Updates(map[string]interface{}{
		"name":             req.Name,
		"type":             req.Type,
		"original_price":   req.OriginalPrice,
		"price":            req.Price,
		"credits":          req.Credits,
		"daily_free_chat":  req.DailyFreeChat,
		"daily_free_image": req.DailyFreeImage,
		"features":         req.Features,
		"description":      req.Description,
		"sort":             req.Sort,
		"status":           req.Status,
	})

	c.JSON(http.StatusOK, pkg)
}

func (h *AdminPackageHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.Package{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
