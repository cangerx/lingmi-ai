package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

type ImageHandler struct {
	DB *gorm.DB
}

// ProductPhoto handles AI product photo generation
func (h *ImageHandler) ProductPhoto(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传商品图片"})
		return
	}

	scene := c.PostForm("scene")
	ratio := c.PostForm("ratio")

	params, _ := json.Marshal(map[string]string{"scene": scene, "ratio": ratio, "filename": file.Filename})

	gen := model.Generation{
		UserID:    userID,
		Type:      "product_photo",
		Model:     "product-photo-v1",
		Prompt:    scene,
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	// TODO: async call image generation service, update gen status & result_url
	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Cutout handles smart background removal
func (h *ImageHandler) Cutout(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传图片"})
		return
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename})

	gen := model.Generation{
		UserID:    userID,
		Type:      "cutout",
		Model:     "cutout-v1",
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Eraser handles AI object removal
func (h *ImageHandler) Eraser(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传图片"})
		return
	}

	maskFile, _ := c.FormFile("mask")
	maskName := ""
	if maskFile != nil {
		maskName = maskFile.Filename
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename, "mask": maskName})

	gen := model.Generation{
		UserID:    userID,
		Type:      "eraser",
		Model:     "eraser-v1",
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Expand handles AI image outpainting
func (h *ImageHandler) Expand(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传图片"})
		return
	}

	direction := c.PostForm("direction")
	scale := c.PostForm("scale")

	params, _ := json.Marshal(map[string]string{"filename": file.Filename, "direction": direction, "scale": scale})

	gen := model.Generation{
		UserID:    userID,
		Type:      "expand",
		Model:     "expand-v1",
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Upscale handles image super-resolution
func (h *ImageHandler) Upscale(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传图片"})
		return
	}

	scale := c.PostForm("scale")
	if scale == "" {
		scale = "2"
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename, "scale": scale})

	gen := model.Generation{
		UserID:    userID,
		Type:      "upscale",
		Model:     "upscale-v1",
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Poster handles AI poster generation
func (h *ImageHandler) Poster(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Prompt   string `json:"prompt" binding:"required"`
		Category string `json:"category"`
		Size     string `json:"size"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入海报描述"})
		return
	}

	params, _ := json.Marshal(map[string]string{"category": req.Category, "size": req.Size})

	gen := model.Generation{
		UserID:    userID,
		Type:      "poster",
		Model:     "poster-v1",
		Prompt:    req.Prompt,
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Generate handles generic text-to-image generation
func (h *ImageHandler) Generate(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Prompt string `json:"prompt" binding:"required"`
		Model  string `json:"model"`
		Size   string `json:"size"`
		N      int    `json:"n"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入图片描述"})
		return
	}

	if req.Model == "" {
		req.Model = "dall-e-3"
	}
	if req.N == 0 {
		req.N = 1
	}

	params, _ := json.Marshal(map[string]interface{}{"size": req.Size, "n": req.N})

	gen := model.Generation{
		UserID:    userID,
		Type:      "image",
		Model:     req.Model,
		Prompt:    req.Prompt,
		Params:    model.JSON(params),
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	// TODO: async call image generation API, update gen status & result_url
	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// ListGenerations returns user's generation history
func (h *ImageHandler) ListGenerations(c *gin.Context) {
	userID := c.GetUint("user_id")

	var generations []model.Generation
	h.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&generations)

	c.JSON(http.StatusOK, gin.H{"data": generations})
}
