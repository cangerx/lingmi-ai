package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"gorm.io/gorm"
)

type ImageHandler struct {
	DB         *gorm.DB
	ImageSvc   *service.ImageService
	LLM        *service.LLMService
	Moderation *service.ModerationService
}

// checkPrompt runs content moderation on the prompt text. Returns true if blocked.
func (h *ImageHandler) checkPrompt(c *gin.Context, userID uint, prompt string) bool {
	if h.Moderation == nil || prompt == "" {
		return false
	}
	result := h.Moderation.CheckText(prompt)
	if result.RiskLevel == "block" {
		h.Moderation.LogModeration(userID, "text", "prompt", prompt, "", 0, result.HitWords, "", "block")
		c.JSON(http.StatusForbidden, gin.H{"error": "提示词包含违规信息，请修改后重试"})
		return true
	}
	if result.RiskLevel == "suspect" {
		risk, reason := h.Moderation.CheckTextWithAI(prompt)
		if risk == "block" {
			h.Moderation.LogModeration(userID, "text", "prompt", prompt, "", 0, result.HitWords, reason, "block")
			c.JSON(http.StatusForbidden, gin.H{"error": "提示词包含违规信息，请修改后重试"})
			return true
		}
	}
	return false
}

// processImageAsync runs the AI image generation in the background and updates the Generation record
func (h *ImageHandler) processImageAsync(genID uint, req *service.ImageGenerationRequest) {
	go func() {
		h.DB.Model(&model.Generation{}).Where("id = ?", genID).Updates(map[string]interface{}{
			"status":     "processing",
			"updated_at": time.Now(),
		})

		channel, err := h.ImageSvc.SelectImageChannel(req.Model)
		if err != nil {
			h.failGeneration(genID, "无可用渠道: "+err.Error())
			return
		}

		resp, err := h.ImageSvc.Generate(channel, req)
		if err != nil {
			h.failGeneration(genID, "生成失败: "+err.Error())
			return
		}

		if len(resp.Data) == 0 {
			h.failGeneration(genID, "未返回图片")
			return
		}

		prefix := fmt.Sprintf("gen_%d", genID)
		url, err := h.ImageSvc.SaveResultToStorage(&resp.Data[0], prefix)
		if err != nil {
			h.failGeneration(genID, "保存失败: "+err.Error())
			return
		}

		// Output-side image moderation
		moderationStatus := "skipped"
		if h.Moderation != nil {
			risk, reason := h.Moderation.CheckImageWithAI(url)
			switch risk {
			case "block":
				moderationStatus = "rejected"
				var gen model.Generation
				if h.DB.First(&gen, genID).Error == nil {
					h.Moderation.LogModeration(gen.UserID, "image", "image_gen", gen.Prompt, url, genID, nil, reason, "block")
				}
			case "suspect":
				moderationStatus = "pending"
				var gen model.Generation
				if h.DB.First(&gen, genID).Error == nil {
					h.Moderation.LogModeration(gen.UserID, "image", "image_gen", gen.Prompt, url, genID, nil, reason, "suspect")
				}
			default:
				moderationStatus = "approved"
			}
		}

		h.DB.Model(&model.Generation{}).Where("id = ?", genID).Updates(map[string]interface{}{
			"status":            "completed",
			"result_url":        url,
			"moderation_status": moderationStatus,
			"updated_at":        time.Now(),
		})
		log.Printf("[ImageGen] task %d completed (moderation=%s): %s", genID, moderationStatus, url)
	}()
}

// processEditAsync runs the AI image edit in the background
func (h *ImageHandler) processEditAsync(genID uint, req *service.ImageEditRequest) {
	go func() {
		h.DB.Model(&model.Generation{}).Where("id = ?", genID).Updates(map[string]interface{}{
			"status":     "processing",
			"updated_at": time.Now(),
		})

		modelName := req.Model
		if modelName == "" {
			modelName = "gpt-image-2"
		}
		channel, err := h.ImageSvc.SelectImageChannel(modelName)
		if err != nil {
			h.failGeneration(genID, "无可用渠道: "+err.Error())
			return
		}

		resp, err := h.ImageSvc.Edit(channel, req)
		if err != nil {
			h.failGeneration(genID, "编辑失败: "+err.Error())
			return
		}

		if len(resp.Data) == 0 {
			h.failGeneration(genID, "未返回图片")
			return
		}

		prefix := fmt.Sprintf("gen_%d", genID)
		url, err := h.ImageSvc.SaveResultToStorage(&resp.Data[0], prefix)
		if err != nil {
			h.failGeneration(genID, "保存失败: "+err.Error())
			return
		}

		// Output-side image moderation
		moderationStatus := "skipped"
		if h.Moderation != nil {
			risk, reason := h.Moderation.CheckImageWithAI(url)
			switch risk {
			case "block":
				moderationStatus = "rejected"
				var gen model.Generation
				if h.DB.First(&gen, genID).Error == nil {
					h.Moderation.LogModeration(gen.UserID, "image", "image_gen", gen.Prompt, url, genID, nil, reason, "block")
				}
			case "suspect":
				moderationStatus = "pending"
				var gen model.Generation
				if h.DB.First(&gen, genID).Error == nil {
					h.Moderation.LogModeration(gen.UserID, "image", "image_gen", gen.Prompt, url, genID, nil, reason, "suspect")
				}
			default:
				moderationStatus = "approved"
			}
		}

		h.DB.Model(&model.Generation{}).Where("id = ?", genID).Updates(map[string]interface{}{
			"status":            "completed",
			"result_url":        url,
			"moderation_status": moderationStatus,
			"updated_at":        time.Now(),
		})
		log.Printf("[ImageEdit] task %d completed (moderation=%s): %s", genID, moderationStatus, url)
	}()
}

// pickDefaultImageModel returns the first active image model that has an available channel
func (h *ImageHandler) pickDefaultImageModel() string {
	var imgModels []model.Model
	h.DB.Where("type = ? AND status = ?", "image", "active").Order("sort ASC, id ASC").Find(&imgModels)
	for _, m := range imgModels {
		if _, err := h.ImageSvc.SelectImageChannel(m.Name); err == nil {
			return m.Name
		}
	}
	return ""
}

func (h *ImageHandler) failGeneration(genID uint, errMsg string) {
	log.Printf("[ImageGen] task %d failed: %s", genID, errMsg)
	h.DB.Model(&model.Generation{}).Where("id = ?", genID).Updates(map[string]interface{}{
		"status":    "failed",
		"error_msg": truncateStr(errMsg, 490),
		"updated_at": time.Now(),
	})

	// Refund credits if any were deducted
	var gen model.Generation
	if err := h.DB.First(&gen, genID).Error; err != nil {
		return
	}
	if gen.CreditsCost > 0 {
		h.DB.Model(&model.UserCredits{}).Where("user_id = ?", gen.UserID).
			Update("balance", gorm.Expr("balance + ?", gen.CreditsCost))
		h.DB.Create(&model.CreditLog{
			UserID: gen.UserID,
			Type:   "refund",
			Amount: gen.CreditsCost,
			Detail: fmt.Sprintf("任务失败退回积分 (task #%d)", genID),
		})
		log.Printf("[ImageGen] refunded %.2f credits to user %d for failed task %d", gen.CreditsCost, gen.UserID, genID)
	}
}

// deductImageCredits checks credits and deducts the model's per-call price.
// Returns the credits cost and nil error, or 0 and an error if insufficient.
func (h *ImageHandler) deductImageCredits(userID uint, modelName string) (float64, error) {
	// Look up model pricing
	var m model.Model
	cost := 1.0 // default cost
	if err := h.DB.Where("name = ?", modelName).First(&m).Error; err == nil && m.PricePerCall > 0 {
		cost = m.PricePerCall
	}

	// Check balance
	var credits model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&credits)
	if credits.Balance < cost {
		return 0, fmt.Errorf("积分不足，需要 %.1f 积分", cost)
	}

	// Deduct
	h.DB.Model(&model.UserCredits{}).Where("user_id = ?", userID).
		Update("balance", gorm.Expr("balance - ?", cost))

	var updated model.UserCredits
	h.DB.Where("user_id = ?", userID).First(&updated)
	h.DB.Create(&model.CreditLog{
		UserID: userID,
		Type:   "consume",
		Amount: -cost,
		Balance: updated.Balance,
		Detail: fmt.Sprintf("图片生成 (%s)", modelName),
	})

	return cost, nil
}

func truncateStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

// resolveSize maps resolution (1K/2K/4K) + ratio (1:1, 3:4, etc.) to pixel dimensions like "1024x1024".
func resolveSize(resolution, ratio string) string {
	base := 1024
	switch resolution {
	case "2K":
		base = 2048
	case "4K":
		base = 4096
	}

	type pair struct{ w, h int }
	aspects := map[string]pair{
		"1:1": {1, 1}, "2:3": {2, 3}, "3:4": {3, 4}, "4:5": {4, 5}, "9:16": {9, 16},
		"3:2": {3, 2}, "4:3": {4, 3}, "5:4": {5, 4}, "16:9": {16, 9}, "21:9": {21, 9},
	}

	a, ok := aspects[ratio]
	if !ok || ratio == "auto" {
		return fmt.Sprintf("%dx%d", base, base)
	}

	// Scale so the longer side = base
	var w, h int
	if a.w >= a.h {
		w = base
		h = base * a.h / a.w
	} else {
		h = base
		w = base * a.w / a.h
	}
	// Round to nearest 64
	w = (w + 32) / 64 * 64
	h = (h + 32) / 64 * 64
	if w == 0 { w = 64 }
	if h == 0 { h = 64 }

	return fmt.Sprintf("%dx%d", w, h)
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
	prompt := c.PostForm("prompt")
	reqModel := c.PostForm("model")
	resolution := c.PostForm("resolution")
	quality := c.PostForm("quality")

	if reqModel == "" {
		reqModel = "gpt-image-2"
	}
	size := resolveSize(resolution, ratio)

	// Save uploaded image
	f, _ := file.Open()
	defer f.Close()
	uploadURL, _, _ := h.ImageSvc.Storage.Upload(f, file.Filename)

	if prompt == "" {
		prompt = fmt.Sprintf("Generate a professional product photo with %s background, aspect ratio %s", scene, ratio)
	}

	// Content moderation
	if h.checkPrompt(c, userID, prompt) {
		return
	}

	// Deduct credits
	cost, credErr := h.deductImageCredits(userID, reqModel)
	if credErr != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": credErr.Error()})
		return
	}

	params, _ := json.Marshal(map[string]string{"scene": scene, "ratio": ratio, "filename": file.Filename, "upload_url": uploadURL, "resolution": resolution, "quality": quality})

	gen := model.Generation{
		UserID:      userID,
		Type:        "product_photo",
		Model:       reqModel,
		Prompt:      prompt,
		Params:      model.JSON(params),
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	// Re-open file for editing
	f2, _ := file.Open()
	defer f2.Close()

	h.processEditAsync(gen.ID, &service.ImageEditRequest{
		Model:         reqModel,
		Prompt:        prompt,
		Image:         f2,
		ImageFilename: file.Filename,
		Size:          size,
	})

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

	cost, credErr := h.deductImageCredits(userID, "gpt-image-2")
	if credErr != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": credErr.Error()})
		return
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename})

	gen := model.Generation{
		UserID:      userID,
		Type:        "cutout",
		Model:       "gpt-image-2",
		Params:      model.JSON(params),
		Prompt:      "Remove the background from this image, keep only the main subject on a transparent background",
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	f, _ := file.Open()
	defer f.Close()

	h.processEditAsync(gen.ID, &service.ImageEditRequest{
		Model:         "gpt-image-2",
		Prompt:        gen.Prompt,
		Image:         f,
		ImageFilename: file.Filename,
		Size:          "1024x1024",
	})

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

	prompt := c.PostForm("prompt")
	if prompt == "" {
		prompt = "Remove the marked object from the image and fill with natural background"
	}

	cost, credErr := h.deductImageCredits(userID, "gpt-image-2")
	if credErr != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": credErr.Error()})
		return
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename})

	gen := model.Generation{
		UserID:      userID,
		Type:        "eraser",
		Model:       "gpt-image-2",
		Prompt:      prompt,
		Params:      model.JSON(params),
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	f, _ := file.Open()
	defer f.Close()

	editReq := &service.ImageEditRequest{
		Model:         "gpt-image-2",
		Prompt:        prompt,
		Image:         f,
		ImageFilename: file.Filename,
		Size:          "1024x1024",
	}

	if maskFile != nil {
		mf, _ := maskFile.Open()
		defer mf.Close()
		editReq.Mask = mf
		editReq.MaskFilename = maskFile.Filename
	}

	h.processEditAsync(gen.ID, editReq)

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

	prompt := fmt.Sprintf("Expand this image outward in the %s direction by %sx, maintaining consistent style and natural extension of the scene", direction, scale)

	cost, credErr := h.deductImageCredits(userID, "gpt-image-2")
	if credErr != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": credErr.Error()})
		return
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename, "direction": direction, "scale": scale})

	gen := model.Generation{
		UserID:      userID,
		Type:        "expand",
		Model:       "gpt-image-2",
		Prompt:      prompt,
		Params:      model.JSON(params),
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	f, _ := file.Open()
	defer f.Close()

	h.processEditAsync(gen.ID, &service.ImageEditRequest{
		Model:         "gpt-image-2",
		Prompt:        prompt,
		Image:         f,
		ImageFilename: file.Filename,
		Size:          "1024x1024",
	})

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

	prompt := fmt.Sprintf("Enhance and upscale this image to %sx resolution with improved details and sharpness", scale)

	cost, credErr := h.deductImageCredits(userID, "gpt-image-2")
	if credErr != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": credErr.Error()})
		return
	}

	params, _ := json.Marshal(map[string]string{"filename": file.Filename, "scale": scale})

	gen := model.Generation{
		UserID:      userID,
		Type:        "upscale",
		Model:       "gpt-image-2",
		Prompt:      prompt,
		Params:      model.JSON(params),
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	f, _ := file.Open()
	defer f.Close()

	h.processEditAsync(gen.ID, &service.ImageEditRequest{
		Model:         "gpt-image-2",
		Prompt:        prompt,
		Image:         f,
		ImageFilename: file.Filename,
		Size:          "1024x1024",
	})

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Poster handles AI poster generation
func (h *ImageHandler) Poster(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Prompt     string `json:"prompt" binding:"required"`
		Category   string `json:"category"`
		Size       string `json:"size"`
		Model      string `json:"model"`
		Resolution string `json:"resolution"`
		Quality    string `json:"quality"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入海报描述"})
		return
	}

	if req.Model == "" {
		req.Model = h.pickDefaultImageModel()
		if req.Model == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "没有可用的图片生成渠道"})
			return
		}
	}
	// Size field from frontend is now an aspect ratio like "1:1"
	pixelSize := resolveSize(req.Resolution, req.Size)

	// Content moderation
	if h.checkPrompt(c, userID, req.Prompt) {
		return
	}

	// Deduct credits
	cost, err := h.deductImageCredits(userID, req.Model)
	if err != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": err.Error()})
		return
	}

	params, _ := json.Marshal(map[string]string{"category": req.Category, "size": pixelSize, "resolution": req.Resolution, "quality": req.Quality})

	gen := model.Generation{
		UserID:      userID,
		Type:        "poster",
		Model:       req.Model,
		Prompt:      req.Prompt,
		Params:      model.JSON(params),
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	h.processImageAsync(gen.ID, &service.ImageGenerationRequest{
		Model:   req.Model,
		Prompt:  req.Prompt,
		Size:    pixelSize,
		N:       1,
		Quality: req.Quality,
	})

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// Generate handles generic text-to-image generation
func (h *ImageHandler) Generate(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Prompt     string `json:"prompt" binding:"required"`
		Model      string `json:"model"`
		Size       string `json:"size"`
		N          int    `json:"n"`
		Resolution string `json:"resolution"`
		Ratio      string `json:"ratio"`
		Quality    string `json:"quality"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入图片描述"})
		return
	}

	if req.Model == "" {
		req.Model = h.pickDefaultImageModel()
		if req.Model == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "没有可用的图片生成渠道"})
			return
		}
	}
	if req.N == 0 {
		req.N = 1
	}
	// If resolution or ratio provided, compute pixel size; otherwise fall back to explicit size
	if req.Resolution != "" || req.Ratio != "" {
		req.Size = resolveSize(req.Resolution, req.Ratio)
	}
	if req.Size == "" {
		req.Size = "1024x1024"
	}

	// Content moderation
	if h.checkPrompt(c, userID, req.Prompt) {
		return
	}

	// Deduct credits before starting task
	cost, err := h.deductImageCredits(userID, req.Model)
	if err != nil {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": err.Error()})
		return
	}

	params, _ := json.Marshal(map[string]interface{}{"size": req.Size, "n": req.N, "resolution": req.Resolution, "ratio": req.Ratio, "quality": req.Quality})

	gen := model.Generation{
		UserID:      userID,
		Type:        "image",
		Model:       req.Model,
		Prompt:      req.Prompt,
		Params:      model.JSON(params),
		Status:      "pending",
		CreditsCost: cost,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.DB.Create(&gen).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	h.processImageAsync(gen.ID, &service.ImageGenerationRequest{
		Model:   req.Model,
		Prompt:  req.Prompt,
		Size:    req.Size,
		N:       req.N,
		Quality: req.Quality,
	})

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// GetGeneration returns a single generation task status
func (h *ImageHandler) GetGeneration(c *gin.Context) {
	userID := c.GetUint("user_id")
	genID := c.Param("id")

	var gen model.Generation
	if err := h.DB.Where("id = ? AND user_id = ?", genID, userID).First(&gen).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gen})
}

// DeleteGeneration allows user to delete their own generation record
func (h *ImageHandler) DeleteGeneration(c *gin.Context) {
	userID := c.GetUint("user_id")
	genID := c.Param("id")

	result := h.DB.Where("id = ? AND user_id = ?", genID, userID).Delete(&model.Generation{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

// ListGenerations returns user's generation history with pagination and filters
func (h *ImageHandler) ListGenerations(c *gin.Context) {
	userID := c.GetUint("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	genType := c.Query("type")
	status := c.Query("status")

	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 20 }

	query := h.DB.Model(&model.Generation{}).Where("user_id = ?", userID)
	if genType != "" {
		query = query.Where("type = ?", genType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var generations []model.Generation
	query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&generations)

	c.JSON(http.StatusOK, gin.H{
		"data":      generations,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// PublishToInspiration allows user to publish a completed generation to the inspiration gallery
func (h *ImageHandler) PublishToInspiration(c *gin.Context) {
	userID := c.GetUint("user_id")
	var req struct {
		GenerationID uint   `json:"generation_id" binding:"required"`
		Title        string `json:"title"`
		Description  string `json:"description"`
		Tag          string `json:"tag"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var gen model.Generation
	if err := h.DB.Where("id = ? AND user_id = ?", req.GenerationID, userID).First(&gen).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "生成记录不存在"})
		return
	}
	if gen.Status != "completed" || gen.ResultURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该图片尚未生成完成"})
		return
	}

	// Check if already published
	var existing model.Inspiration
	if err := h.DB.Where("generation_id = ? AND user_id = ?", req.GenerationID, userID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "该图片已发布过", "data": existing})
		return
	}

	// Fetch user info for author name
	var user model.User
	h.DB.Select("nickname, avatar").Where("id = ?", userID).First(&user)

	title := req.Title
	if title == "" {
		title = gen.Prompt
		if len(title) > 50 {
			title = title[:50] + "..."
		}
	}

	inspiration := model.Inspiration{
		UserID:       userID,
		GenerationID: gen.ID,
		Title:        title,
		Description:  req.Description,
		ImageURL:     gen.ResultURL,
		Tag:          req.Tag,
		Author:       user.Nickname,
		AuthorAvatar: user.Avatar,
		Prompt:       gen.Prompt,
		ModelUsed:    gen.Model,
		Status:       "pending",
	}
	if err := h.DB.Create(&inspiration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "发布失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": inspiration, "message": "已提交审核"})
}

// OptimizePrompt uses LLM to enhance a short user prompt into a detailed image generation prompt
func (h *ImageHandler) OptimizePrompt(c *gin.Context) {
	var req struct {
		Prompt string `json:"prompt" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入提示词"})
		return
	}

	if h.LLM == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "服务暂不可用"})
		return
	}

	// Read configured model from settings, fallback to first available chat model
	modelName := ""
	var setting model.SystemSetting
	if h.DB.Where("setting_group = ? AND setting_key = ?", "prompt", "prompt_optimize_model").First(&setting).Error == nil {
		modelName = setting.Value
	}
	if modelName == "" {
		// Fallback: pick the first active chat model
		var m model.Model
		if h.DB.Where("type = ? AND status = ?", "chat", "active").Order("sort ASC, id ASC").First(&m).Error == nil {
			modelName = m.Name
		}
	}
	if modelName == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "未配置提示词优化模型"})
		return
	}

	channel, err := h.LLM.SelectChannel(modelName)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "无可用渠道"})
		return
	}

	chatReq := &service.ChatRequest{
		Model: modelName,
		Messages: []service.ChatMessage{
			{
				Role: "system",
				Content: `你是一位专业的AI图片生成提示词优化专家。用户会给你一个简短的图片描述，你需要将它扩展为一段详细、专业的英文图片生成提示词（prompt）。

规则：
1. 保留用户原始意图，补充画面细节（构图、光线、色调、风格、材质等）
2. 输出纯英文 prompt，不需要任何解释
3. 长度控制在 50-150 词之间
4. 使用逗号分隔不同描述维度
5. 如果用户输入是中文，翻译为英文并优化`,
			},
			{
				Role:    "user",
				Content: req.Prompt,
			},
		},
	}

	resp, err := h.LLM.ChatCompletion(channel, chatReq)
	if err != nil {
		log.Printf("[OptimizePrompt] LLM error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "优化失败，请稍后重试"})
		return
	}

	optimized := ""
	if len(resp.Choices) > 0 {
		optimized = resp.Choices[0].Message.Content
	}
	if optimized == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "未获取到优化结果"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"optimized_prompt": optimized})
}
