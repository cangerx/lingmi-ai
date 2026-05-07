package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"github.com/lingmiai/server/internal/service"
	"github.com/lingmiai/server/internal/storage"
	"gorm.io/gorm"
)

type BrandKitHandler struct {
	DB      *gorm.DB
	Storage storage.Storage
	LLM     *service.LLMService
}

// List returns all brand kits for the current user.
func (h *BrandKitHandler) List(c *gin.Context) {
	userID := c.GetUint("user_id")

	var kits []model.BrandKit
	h.DB.Where("user_id = ?", userID).Order("is_default DESC, id ASC").Find(&kits)

	c.JSON(http.StatusOK, gin.H{"data": kits})
}

// Get returns a single brand kit by ID.
func (h *BrandKitHandler) Get(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, _ := strconv.Atoi(c.Param("id"))

	var kit model.BrandKit
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&kit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到品牌"})
		return
	}

	// Resolve logo files
	var logos []model.UserFile
	if kit.LogoFileIDs != "" {
		ids := parseIDs(kit.LogoFileIDs)
		if len(ids) > 0 {
			h.DB.Where("id IN ? AND user_id = ?", ids, userID).Find(&logos)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"brand_kit": kit, "logos": logos}})
}

// Create adds a new brand kit for the user.
func (h *BrandKitHandler) Create(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		BrandName   string `json:"brand_name"`
		Description string `json:"description"`
		Colors      string `json:"colors"`
		Fonts       string `json:"fonts"`
		Keywords    string `json:"keywords"`
		LogoFileIDs string `json:"logo_file_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}
	if len([]rune(req.BrandName)) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "品牌名称不能超过100字"})
		return
	}
	if len([]rune(req.Keywords)) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "关键词不能超过500字"})
		return
	}

	// Limit max 10 brands per user
	var count int64
	h.DB.Model(&model.BrandKit{}).Where("user_id = ?", userID).Count(&count)
	if count >= 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "最多创建10个品牌"})
		return
	}

	isFirst := count == 0
	kit := model.BrandKit{
		UserID:      userID,
		BrandName:   strings.TrimSpace(req.BrandName),
		Description: strings.TrimSpace(req.Description),
		Colors:      req.Colors,
		Fonts:       req.Fonts,
		Keywords:    strings.TrimSpace(req.Keywords),
		LogoFileIDs: req.LogoFileIDs,
		IsDefault:   isFirst,
	}
	if err := h.DB.Create(&kit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": kit})
}

// Update modifies an existing brand kit.
func (h *BrandKitHandler) Update(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, _ := strconv.Atoi(c.Param("id"))

	var kit model.BrandKit
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&kit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到品牌"})
		return
	}

	var req struct {
		BrandName   string `json:"brand_name"`
		Description string `json:"description"`
		DesignGuide string `json:"design_guide"`
		Colors      string `json:"colors"`
		Fonts       string `json:"fonts"`
		Keywords    string `json:"keywords"`
		Logos       string `json:"logos"`
		BrandImages string `json:"brand_images"`
		LogoFileIDs string `json:"logo_file_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}
	if len([]rune(req.BrandName)) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "品牌名称不能超过100字"})
		return
	}

	updates := map[string]interface{}{
		"brand_name":    strings.TrimSpace(req.BrandName),
		"description":   strings.TrimSpace(req.Description),
		"design_guide":  req.DesignGuide,
		"colors":        req.Colors,
		"fonts":         req.Fonts,
		"keywords":      strings.TrimSpace(req.Keywords),
		"logos":         req.Logos,
		"brand_images":  req.BrandImages,
		"logo_file_ids": req.LogoFileIDs,
	}
	h.DB.Model(&kit).Updates(updates)
	h.DB.First(&kit, kit.ID)

	c.JSON(http.StatusOK, gin.H{"data": kit, "message": "已保存"})
}

// Delete removes a brand kit.
func (h *BrandKitHandler) Delete(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, _ := strconv.Atoi(c.Param("id"))

	result := h.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&model.BrandKit{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到品牌"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

// SetDefault sets a brand kit as the default for generation.
func (h *BrandKitHandler) SetDefault(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, _ := strconv.Atoi(c.Param("id"))

	var kit model.BrandKit
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&kit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到品牌"})
		return
	}

	// Clear all defaults, then set this one
	h.DB.Model(&model.BrandKit{}).Where("user_id = ?", userID).Update("is_default", false)
	h.DB.Model(&kit).Update("is_default", true)

	c.JSON(http.StatusOK, gin.H{"message": "已设为默认品牌"})
}

// ParseManual handles brand manual upload and AI parsing.
func (h *BrandKitHandler) ParseManual(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, _ := strconv.Atoi(c.Param("id"))

	var kit model.BrandKit
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&kit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到品牌"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传品牌手册文件"})
		return
	}

	// Validate file size (20MB)
	if file.Size > 20*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件大小不能超过20MB"})
		return
	}

	// Validate file type
	ext := strings.ToLower(file.Filename[strings.LastIndex(file.Filename, "."):])
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持 PNG、JPG、PDF 格式"})
		return
	}

	// Upload to storage
	f, _ := file.Open()
	defer f.Close()
	url, _, err := h.Storage.Upload(f, file.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "文件上传失败"})
		return
	}

	if h.LLM == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI 服务暂不可用"})
		return
	}

	// Select vision-capable model
	var candidateModels []string
	var setting model.SystemSetting
	if h.DB.Where("setting_group = ? AND setting_key = ?", "prompt", "prompt_optimize_model").First(&setting).Error == nil && setting.Value != "" {
		candidateModels = append(candidateModels, setting.Value)
	}
	var chatModels []model.Model
	h.DB.Where("type = ? AND status = ?", "chat", "active").Order("sort ASC, id ASC").Find(&chatModels)
	for _, m := range chatModels {
		found := false
		for _, c := range candidateModels {
			if c == m.Name {
				found = true
				break
			}
		}
		if !found {
			candidateModels = append(candidateModels, m.Name)
		}
	}
	if len(candidateModels) == 0 {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "未配置AI模型"})
		return
	}

	systemPrompt := `你是品牌设计专家。请分析这份品牌手册/品牌素材图片，提取以下品牌信息并以 JSON 格式返回：
{
  "brand_name": "品牌名称",
  "description": "品牌简要描述",
  "design_guide": "设计指南/品牌理念（可多段文字）",
  "colors": [{"name": "颜色名称", "hex": "#十六进制色值"}],
  "fonts": [{"role": "heading或body", "name": "字体名称"}],
  "keywords": "关键词1,关键词2,关键词3"
}

规则：
1. 仅输出 JSON，不需要任何解释或 markdown 标记
2. 颜色从图片中提取主要品牌色（最多10个）
3. 字体从可见文字判断（如无法确定则留空数组）
4. 关键词描述品牌风格特征`

	// Call LLM with vision
	var resp *service.ChatCompletionResponse
	var lastErr error
	for _, modelName := range candidateModels {
		channel, err := h.LLM.SelectChannel(modelName)
		if err != nil {
			continue
		}
		log.Printf("[ParseManual] trying model: %s for brand kit %d", modelName, kit.ID)

		chatReq := &service.ChatRequest{
			Model: modelName,
			Messages: []service.ChatMessage{
				service.NewTextMessage("system", systemPrompt),
				service.NewVisionMessage("user", "请分析这份品牌素材：", url),
			},
		}
		origTimeout := channel.Timeout
		if channel.Timeout == 0 || channel.Timeout > 60 {
			channel.Timeout = 60
		}
		resp, lastErr = h.LLM.ChatCompletion(channel, chatReq)
		channel.Timeout = origTimeout
		if lastErr == nil {
			break
		}
		log.Printf("[ParseManual] model %s failed: %v", modelName, lastErr)
	}
	if lastErr != nil || resp == nil {
		log.Printf("[ParseManual] all models failed: %v", lastErr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI 解析失败，请稍后重试"})
		return
	}

	raw := ""
	if len(resp.Choices) > 0 {
		raw = resp.Choices[0].Message.ContentString()
	}
	if raw == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "未获取到解析结果"})
		return
	}

	// Parse JSON from response (handle potential markdown wrapping)
	jsonStr := raw
	if idx := strings.Index(raw, "{"); idx >= 0 {
		if end := strings.LastIndex(raw, "}"); end > idx {
			jsonStr = raw[idx : end+1]
		}
	}

	var parsed struct {
		BrandName   string              `json:"brand_name"`
		Description string              `json:"description"`
		DesignGuide string              `json:"design_guide"`
		Colors      []map[string]string `json:"colors"`
		Fonts       []map[string]string `json:"fonts"`
		Keywords    string              `json:"keywords"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		log.Printf("[ParseManual] JSON parse error: %v, raw: %s", err, raw)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析结果格式异常", "raw": raw})
		return
	}

	// Apply parsed data to brand kit
	updates := map[string]interface{}{
		"manual_parsed": true,
	}
	if parsed.BrandName != "" {
		updates["brand_name"] = parsed.BrandName
	}
	if parsed.Description != "" {
		updates["description"] = parsed.Description
	}
	if parsed.DesignGuide != "" {
		updates["design_guide"] = parsed.DesignGuide
	}
	if len(parsed.Colors) > 0 {
		colorsJSON, _ := json.Marshal(parsed.Colors)
		updates["colors"] = string(colorsJSON)
	}
	if len(parsed.Fonts) > 0 {
		fontsJSON, _ := json.Marshal(parsed.Fonts)
		updates["fonts"] = string(fontsJSON)
	}
	if parsed.Keywords != "" {
		updates["keywords"] = parsed.Keywords
	}

	h.DB.Model(&kit).Updates(updates)
	h.DB.First(&kit, kit.ID)

	c.JSON(http.StatusOK, gin.H{"data": kit, "message": "品牌手册解析完成"})
}

func parseIDs(s string) []uint {
	parts := strings.Split(s, ",")
	var ids []uint
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if id, err := strconv.ParseUint(p, 10, 32); err == nil && id > 0 {
			ids = append(ids, uint(id))
		}
	}
	return ids
}
