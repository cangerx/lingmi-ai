package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type AdminChannelHandler struct {
	DB *gorm.DB
}

func (h *AdminChannelHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var channels []model.Channel
	var total int64

	h.DB.Model(&model.Channel{}).Count(&total)
	h.DB.Order("priority DESC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&channels)

	c.JSON(http.StatusOK, gin.H{
		"data":      channels,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminChannelHandler) Create(c *gin.Context) {
	var req struct {
		Name     string   `json:"name" binding:"required"`
		Type     string   `json:"type" binding:"required"`
		APIKey   string   `json:"api_key" binding:"required"`
		BaseURL  string   `json:"base_url" binding:"required"`
		Models   []string `json:"models"`
		Priority int      `json:"priority"`
		Weight   int      `json:"weight"`
		RPMLimit int      `json:"rpm_limit"`
		TPMLimit int      `json:"tpm_limit"`
		Timeout  int      `json:"timeout"`
		Remark   string   `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	modelsJSON, _ := json.Marshal(req.Models)

	timeout := req.Timeout
	if timeout == 0 {
		timeout = 60
	}
	weight := req.Weight
	if weight == 0 {
		weight = 1
	}

	channel := model.Channel{
		Name:     req.Name,
		Type:     req.Type,
		APIKey:   req.APIKey,
		BaseURL:  req.BaseURL,
		Models:   model.JSON(modelsJSON),
		Priority: req.Priority,
		Weight:   weight,
		Status:   "enabled",
		RPMLimit: req.RPMLimit,
		TPMLimit: req.TPMLimit,
		Timeout:  timeout,
		Remark:   req.Remark,
	}

	if err := h.DB.Create(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create channel"})
		return
	}

	c.JSON(http.StatusCreated, channel)
}

func (h *AdminChannelHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var channel model.Channel
	if err := h.DB.First(&channel, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	var req struct {
		Name     *string  `json:"name"`
		Type     *string  `json:"type"`
		APIKey   *string  `json:"api_key"`
		BaseURL  *string  `json:"base_url"`
		Models   []string `json:"models"`
		Priority *int     `json:"priority"`
		Weight   *int     `json:"weight"`
		Status   *string  `json:"status"`
		RPMLimit *int     `json:"rpm_limit"`
		TPMLimit *int     `json:"tpm_limit"`
		Timeout  *int     `json:"timeout"`
		Remark   *string  `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Type != nil {
		updates["type"] = *req.Type
	}
	if req.APIKey != nil {
		updates["api_key"] = *req.APIKey
	}
	if req.BaseURL != nil {
		updates["base_url"] = *req.BaseURL
	}
	if req.Models != nil {
		m, _ := json.Marshal(req.Models)
		updates["models"] = model.JSON(m)
	}
	if req.Priority != nil {
		updates["priority"] = *req.Priority
	}
	if req.Weight != nil {
		updates["weight"] = *req.Weight
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.RPMLimit != nil {
		updates["rpm_limit"] = *req.RPMLimit
	}
	if req.TPMLimit != nil {
		updates["tpm_limit"] = *req.TPMLimit
	}
	if req.Timeout != nil {
		updates["timeout"] = *req.Timeout
	}
	if req.Remark != nil {
		updates["remark"] = *req.Remark
	}

	h.DB.Model(&channel).Updates(updates)
	h.DB.First(&channel, id)
	c.JSON(http.StatusOK, channel)
}

func (h *AdminChannelHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result := h.DB.Delete(&model.Channel{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
