package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

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

	// Build response with masked api_key
	type channelResp struct {
		model.Channel
		APIKeyMasked string `json:"api_key_masked"`
	}
	result := make([]channelResp, len(channels))
	for i, ch := range channels {
		result[i] = channelResp{
			Channel:      ch,
			APIKeyMasked: maskKey(ch.APIKey),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      result,
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
	if req.APIKey != nil && *req.APIKey != "" && !strings.Contains(*req.APIKey, "***") {
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

func maskKey(key string) string {
	if len(key) <= 8 {
		return "***"
	}
	return key[:3] + "***" + key[len(key)-4:]
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

// FetchModels calls the provider's /v1/models endpoint and returns available models.
func (h *AdminChannelHandler) FetchModels(c *gin.Context) {
	var req struct {
		BaseURL   string `json:"base_url" binding:"required"`
		APIKey    string `json:"api_key"`
		ChannelID uint   `json:"channel_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If api_key is masked or empty, try to load from existing channel
	apiKey := req.APIKey
	if apiKey == "" || strings.Contains(apiKey, "***") {
		if req.ChannelID > 0 {
			var ch model.Channel
			if err := h.DB.First(&ch, req.ChannelID).Error; err == nil {
				apiKey = ch.APIKey
			}
		}
	}
	if apiKey == "" || strings.Contains(apiKey, "***") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请填写有效的 API Key"})
		return
	}

	baseURL := strings.TrimRight(req.BaseURL, "/")
	// Try common model list endpoints
	urls := []string{
		baseURL + "/v1/models",
		baseURL + "/models",
	}

	client := &http.Client{Timeout: 15 * time.Second}
	var lastErr error

	for _, u := range urls {
		httpReq, err := http.NewRequest("GET", u, nil)
		if err != nil {
			lastErr = err
			continue
		}
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
		httpReq.Header.Set("Accept", "application/json")

		resp, err := client.Do(httpReq)
		if err != nil {
			lastErr = err
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body[:min(len(body), 200)]))
			continue
		}

		// Parse OpenAI-compatible response: { "data": [ { "id": "model-name", ... } ] }
		var result struct {
			Data []struct {
				ID      string `json:"id"`
				Object  string `json:"object"`
				OwnedBy string `json:"owned_by"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &result); err != nil {
			lastErr = err
			continue
		}

		if len(result.Data) == 0 {
			lastErr = fmt.Errorf("no models returned")
			continue
		}

		models := make([]gin.H, 0, len(result.Data))
		for _, m := range result.Data {
			if m.ID == "" {
				continue
			}
			models = append(models, gin.H{
				"id":       m.ID,
				"owned_by": m.OwnedBy,
			})
		}

		c.JSON(http.StatusOK, gin.H{"data": models, "total": len(models)})
		return
	}

	errMsg := "无法获取模型列表"
	if lastErr != nil {
		errMsg = "获取模型列表失败: " + lastErr.Error()
	}
	c.JSON(http.StatusBadGateway, gin.H{"error": errMsg})
}

// AddModelsFromChannel fetches models from a channel and batch-creates them in the Model table.
func (h *AdminChannelHandler) AddModelsFromChannel(c *gin.Context) {
	var req struct {
		Models []struct {
			ID          string `json:"id" binding:"required"`
			DisplayName string `json:"display_name"`
			Type        string `json:"type"`
			Provider    string `json:"provider"`
		} `json:"models" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created := 0
	skipped := 0
	for _, m := range req.Models {
		displayName := m.DisplayName
		if displayName == "" {
			displayName = m.ID
		}
		modelType := m.Type
		if modelType == "" {
			modelType = "chat"
		}

		var existing model.Model
		if err := h.DB.Where("name = ?", m.ID).First(&existing).Error; err == nil {
			skipped++
			continue
		}

		record := model.Model{
			Name:        m.ID,
			DisplayName: displayName,
			Type:        modelType,
			Provider:    m.Provider,
			Status:      "active",
		}
		if err := h.DB.Create(&record).Error; err != nil {
			skipped++
			continue
		}
		created++
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("成功添加 %d 个模型，跳过 %d 个（已存在）", created, skipped),
		"created": created,
		"skipped": skipped,
	})
}
