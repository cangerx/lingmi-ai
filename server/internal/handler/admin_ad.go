package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminAdHandler struct {
	DB *gorm.DB
}

func (h *AdminAdHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	slot := c.Query("slot")
	status := c.Query("status")

	query := h.DB.Model(&model.Ad{})
	if slot != "" {
		query = query.Where("slot = ?", slot)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var ads []model.Ad
	query.Order("sort ASC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&ads)

	c.JSON(http.StatusOK, gin.H{
		"data":      ads,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminAdHandler) Create(c *gin.Context) {
	var ad model.Ad
	if err := c.ShouldBindJSON(&ad); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.DB.Create(&ad).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ad"})
		return
	}
	c.JSON(http.StatusOK, ad)
}

func (h *AdminAdHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var ad model.Ad
	if err := h.DB.First(&ad, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ad not found"})
		return
	}

	var req model.Ad
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.DB.Model(&ad).Updates(map[string]interface{}{
		"name":                  req.Name,
		"slot":                  req.Slot,
		"image_url":             req.ImageURL,
		"video_url":             req.VideoURL,
		"title":                 req.Title,
		"description":           req.Description,
		"link":                  req.Link,
		"link_type":             req.LinkType,
		"target_users":          req.TargetUsers,
		"start_at":              req.StartAt,
		"end_at":                req.EndAt,
		"daily_max_impressions": req.DailyMaxImpressions,
		"sort":                  req.Sort,
		"status":                req.Status,
	})

	c.JSON(http.StatusOK, ad)
}

func (h *AdminAdHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.Ad{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ad not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *AdminAdHandler) Stats(c *gin.Context) {
	adID := c.Param("id")

	var stats []model.AdStat
	h.DB.Where("ad_id = ?", adID).Order("date DESC").Limit(30).Find(&stats)

	c.JSON(http.StatusOK, gin.H{"data": stats})
}
