package handler

import (
	"bytes"
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

type AdminModelHandler struct {
	DB *gorm.DB
}

func (h *AdminModelHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	modelType := c.Query("type")
	search := c.Query("search")

	var models []model.Model
	var total int64

	query := h.DB.Model(&model.Model{})
	if modelType != "" {
		query = query.Where("type = ?", modelType)
	}
	if search != "" {
		query = query.Where("name ILIKE ? OR display_name ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	query.Count(&total)
	query.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&models)

	// Load all enabled channels to build model→channel mapping
	var channels []model.Channel
	h.DB.Where("status = ?", "enabled").Find(&channels)

	type channelBrief struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
		Type string `json:"type"`
	}
	type modelResp struct {
		model.Model
		ChannelCount int            `json:"channel_count"`
		Channels     []channelBrief `json:"channels"`
	}

	result := make([]modelResp, len(models))
	for i, m := range models {
		var chList []channelBrief
		for _, ch := range channels {
			var modelNames []string
			json.Unmarshal(ch.Models, &modelNames)
			for _, mn := range modelNames {
				if mn == m.Name {
					chList = append(chList, channelBrief{ID: ch.ID, Name: ch.Name, Type: ch.Type})
					break
				}
			}
		}
		result[i] = modelResp{
			Model:        m,
			ChannelCount: len(chList),
			Channels:     chList,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      result,
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

// UnlinkedModels returns models that exist in channels but not yet in the Model table.
func (h *AdminModelHandler) UnlinkedModels(c *gin.Context) {
	// Get all model names from channels
	var channels []model.Channel
	h.DB.Where("status = ?", "enabled").Find(&channels)

	channelModelSet := map[string][]string{} // modelName -> []channelName
	for _, ch := range channels {
		var names []string
		json.Unmarshal(ch.Models, &names)
		for _, n := range names {
			channelModelSet[n] = append(channelModelSet[n], ch.Name)
		}
	}

	// Get all existing model names
	var existingModels []model.Model
	h.DB.Select("name").Find(&existingModels)
	existingSet := map[string]bool{}
	for _, m := range existingModels {
		existingSet[m.Name] = true
	}

	// Find unlinked
	type unlinkedItem struct {
		Name     string   `json:"name"`
		Channels []string `json:"channels"`
	}
	var result []unlinkedItem
	for name, chNames := range channelModelSet {
		if !existingSet[name] {
			result = append(result, unlinkedItem{Name: name, Channels: chNames})
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": result, "total": len(result)})
}

// Probe sends a lightweight test request to each channel that supports the model
// and returns latency + status for each channel.
func (h *AdminModelHandler) Probe(c *gin.Context) {
	var req struct {
		ModelName string `json:"model_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var channels []model.Channel
	h.DB.Where("status = ?", "enabled").Find(&channels)

	// Filter channels supporting this model
	var matched []model.Channel
	for _, ch := range channels {
		var modelNames []string
		json.Unmarshal(ch.Models, &modelNames)
		for _, mn := range modelNames {
			if mn == req.ModelName {
				matched = append(matched, ch)
				break
			}
		}
	}

	if len(matched) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}, "message": "没有渠道支持该模型"})
		return
	}

	type probeResult struct {
		ChannelID   uint   `json:"channel_id"`
		ChannelName string `json:"channel_name"`
		ChannelType string `json:"channel_type"`
		Status      string `json:"status"`      // ok, error, timeout
		LatencyMs   int64  `json:"latency_ms"`
		Error       string `json:"error,omitempty"`
		FirstToken  string `json:"first_token,omitempty"`
	}

	// Probe each channel concurrently
	resultCh := make(chan probeResult, len(matched))
	for _, ch := range matched {
		go func(ch model.Channel) {
			pr := probeResult{
				ChannelID:   ch.ID,
				ChannelName: ch.Name,
				ChannelType: ch.Type,
			}

			payload := map[string]interface{}{
				"model": req.ModelName,
				"messages": []map[string]string{
					{"role": "user", "content": "Hi"},
				},
				"max_tokens": 5,
				"stream":     false,
			}
			body, _ := json.Marshal(payload)

			url := strings.TrimRight(ch.BaseURL, "/") + "/v1/chat/completions"
			httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
			if err != nil {
				pr.Status = "error"
				pr.Error = err.Error()
				resultCh <- pr
				return
			}
			httpReq.Header.Set("Content-Type", "application/json")
			httpReq.Header.Set("Authorization", "Bearer "+ch.APIKey)

			timeout := ch.Timeout
			if timeout == 0 || timeout > 15 {
				timeout = 15
			}
			client := &http.Client{Timeout: time.Duration(timeout) * time.Second}

			start := time.Now()
			resp, err := client.Do(httpReq)
			latency := time.Since(start).Milliseconds()
			pr.LatencyMs = latency

			if err != nil {
				pr.Status = "timeout"
				pr.Error = err.Error()
				resultCh <- pr
				return
			}
			defer resp.Body.Close()
			respBody, _ := io.ReadAll(resp.Body)

			if resp.StatusCode != http.StatusOK {
				pr.Status = "error"
				pr.Error = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBody[:min(len(respBody), 200)]))
				resultCh <- pr
				return
			}

			// Parse first token from response
			var chatResp struct {
				Choices []struct {
					Message struct {
						Content string `json:"content"`
					} `json:"message"`
				} `json:"choices"`
			}
			json.Unmarshal(respBody, &chatResp)
			if len(chatResp.Choices) > 0 {
				pr.FirstToken = chatResp.Choices[0].Message.Content
			}

			pr.Status = "ok"
			resultCh <- pr
		}(ch)
	}

	// Collect results
	results := make([]probeResult, 0, len(matched))
	for range matched {
		results = append(results, <-resultCh)
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// ─── Image Model Config ────────────────────────────────────────────

// SeedImageModels pre-populates image models and their config into the DB.
func (h *AdminModelHandler) SeedImageModels(c *gin.Context) {
	type seedModel struct {
		Name        string
		DisplayName string
		Provider    string
		Icon        string
		Badge       string
		Tags        []string
		VipOnly     bool
		Sort        int
		Description string
		Versions    string // JSON
		PricePerCall float64
		Config      map[string]struct {
			Values     []string
			DefaultVal string
		}
	}

	seeds := []seedModel{
		{
			Name: "gpt-image-2", DisplayName: "GPT-Image-2", Provider: "openai",
			Icon: "/icons/openai.svg", Badge: "", Tags: []string{"上新", "会员"},
			VipOnly: true, Sort: 1, PricePerCall: 5,
			Description: "会员专享，点击升级",
			Versions: `[{"name":"2.0","model":"gpt-image-2"},{"name":"1.0","model":"gpt-image-1","tag":"旧版"}]`,
			Config: map[string]struct {
				Values     []string
				DefaultVal string
			}{
				"resolutions":  {[]string{"1K", "2K", "4K"}, "2K"},
				"ratios":       {[]string{"auto", "1:1", "2:3", "3:4", "4:5", "9:16", "3:2", "4:3", "5:4", "16:9", "21:9"}, "1:1"},
				"qualities":    {[]string{"low", "medium", "high"}, "medium"},
				"max_count":    {[]string{"4"}, "4"},
				"formats":      {[]string{"png", "jpeg", "webp"}, "png"},
				"backgrounds":  {[]string{"auto", "transparent", "opaque"}, "auto"},
			},
		},
		{
			Name: "nano-banana-2", DisplayName: "Nano Banana 2", Provider: "nanobanana",
			Icon: "/icons/nanobanana.svg", Badge: "", Tags: []string{"推荐", "会员"},
			VipOnly: true, Sort: 2, PricePerCall: 3,
			Description: "会员专享，点击升级",
			Config: map[string]struct {
				Values     []string
				DefaultVal string
			}{
				"resolutions":  {[]string{"1K", "2K"}, "1K"},
				"ratios":       {[]string{"1:1", "2:3", "3:4", "9:16", "3:2", "4:3", "16:9"}, "1:1"},
				"qualities":    {[]string{"standard", "hd"}, "standard"},
				"max_count":    {[]string{"4"}, "4"},
				"formats":      {[]string{"png", "jpeg", "webp"}, "png"},
			},
		},
		{
			Name: "nano-banana-pro", DisplayName: "Nano Banana Pro", Provider: "nanobanana",
			Icon: "/icons/nanobanana.svg", Badge: "", Tags: []string{"会员"},
			VipOnly: true, Sort: 3, PricePerCall: 4,
			Description: "会员专享，点击升级",
			Config: map[string]struct {
				Values     []string
				DefaultVal string
			}{
				"resolutions":  {[]string{"1K", "2K", "4K"}, "2K"},
				"ratios":       {[]string{"1:1", "2:3", "3:4", "4:5", "9:16", "3:2", "4:3", "5:4", "16:9"}, "1:1"},
				"qualities":    {[]string{"standard", "hd"}, "standard"},
				"max_count":    {[]string{"4"}, "4"},
				"formats":      {[]string{"png", "jpeg", "webp"}, "png"},
			},
		},
		{
			Name: "wanx-2.7", DisplayName: "万相2.7", Provider: "alibaba",
			Icon: "/icons/wanx.svg", Badge: "", Tags: []string{"上新", "仅图片"},
			VipOnly: false, Sort: 4, PricePerCall: 1,
			Description: "只生成图片设计",
			Config: map[string]struct {
				Values     []string
				DefaultVal string
			}{
				"resolutions":  {[]string{"1K", "2K"}, "1K"},
				"ratios":       {[]string{"1:1", "2:3", "3:4", "9:16", "3:2", "4:3", "16:9"}, "1:1"},
				"max_count":    {[]string{"4"}, "4"},
				"formats":      {[]string{"png", "jpeg"}, "png"},
			},
		},
		{
			Name: "gemini-3.1-pro", DisplayName: "Gemini 3.1 Pro", Provider: "google",
			Icon: "/icons/gemini.svg", Badge: "", Tags: []string{"推荐", "可编辑"},
			VipOnly: false, Sort: 5, PricePerCall: 2,
			Description: "生成可编辑图层源文件，适合图文排版",
			Config: map[string]struct {
				Values     []string
				DefaultVal string
			}{
				"resolutions":  {[]string{"1K", "2K"}, "1K"},
				"ratios":       {[]string{"1:1", "2:3", "3:4", "9:16", "3:2", "4:3", "16:9"}, "1:1"},
				"qualities":    {[]string{"standard", "hd"}, "standard"},
				"max_count":    {[]string{"4"}, "4"},
				"formats":      {[]string{"png", "jpeg", "webp"}, "png"},
			},
		},
		{
			Name: "jimeng-5.0", DisplayName: "即梦5.0", Provider: "bytedance",
			Icon: "/icons/jimeng.svg", Badge: "", Tags: []string{"仅图片"},
			VipOnly: false, Sort: 6, PricePerCall: 1,
			Description: "只生成图片设计",
			Config: map[string]struct {
				Values     []string
				DefaultVal string
			}{
				"resolutions":  {[]string{"1K", "2K"}, "1K"},
				"ratios":       {[]string{"1:1", "2:3", "3:4", "9:16", "3:2", "4:3", "16:9"}, "1:1"},
				"max_count":    {[]string{"4"}, "4"},
				"formats":      {[]string{"png", "jpeg"}, "png"},
			},
		},
	}

	created, updated := 0, 0
	for _, s := range seeds {
		var m model.Model
		err := h.DB.Where("name = ?", s.Name).First(&m).Error
		tagsJSON, _ := json.Marshal(s.Tags)

		if err != nil {
			// Create
			m = model.Model{
				Name:         s.Name,
				DisplayName:  s.DisplayName,
				Type:         "image",
				Provider:     s.Provider,
				Icon:         s.Icon,
				Description:  s.Description,
				Badge:        s.Badge,
				Tags:         model.JSON(tagsJSON),
				VipOnly:      s.VipOnly,
				PricingMode:  "per_call",
				PricePerCall: s.PricePerCall,
				Sort:         s.Sort,
				Status:       "active",
			}
			if s.Versions != "" {
				m.Versions = model.JSON(s.Versions)
			}
			h.DB.Create(&m)
			created++
		} else {
			// Update display fields
			updates := map[string]interface{}{
				"display_name":  s.DisplayName,
				"type":          "image",
				"provider":      s.Provider,
				"icon":          s.Icon,
				"description":   s.Description,
				"badge":         s.Badge,
				"tags":          model.JSON(tagsJSON),
				"vip_only":      s.VipOnly,
				"pricing_mode":  "per_call",
				"price_per_call": s.PricePerCall,
				"sort":          s.Sort,
			}
			if s.Versions != "" {
				updates["versions"] = model.JSON(s.Versions)
			}
			h.DB.Model(&m).Updates(updates)
			updated++
		}

		// Upsert config
		for key, cfg := range s.Config {
			valJSON, _ := json.Marshal(cfg.Values)
			var existing model.ModelConfig
			err := h.DB.Where("model_name = ? AND param_key = ?", s.Name, key).First(&existing).Error
			if err != nil {
				h.DB.Create(&model.ModelConfig{
					ModelName:   s.Name,
					ParamKey:    key,
					ParamValues: model.JSON(valJSON),
					DefaultVal:  cfg.DefaultVal,
				})
			} else {
				h.DB.Model(&existing).Updates(map[string]interface{}{
					"param_values": model.JSON(valJSON),
					"default_value": cfg.DefaultVal,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("预填完成: 新建 %d 个模型, 更新 %d 个模型", created, updated),
		"created": created,
		"updated": updated,
	})
}

// GetConfig returns all config entries for a given model name.
func (h *AdminModelHandler) GetConfig(c *gin.Context) {
	name := c.Param("name")
	var configs []model.ModelConfig
	h.DB.Where("model_name = ?", name).Order("sort_order ASC").Find(&configs)
	c.JSON(http.StatusOK, gin.H{"data": configs})
}

// UpdateConfig replaces config entries for a model.
func (h *AdminModelHandler) UpdateConfig(c *gin.Context) {
	name := c.Param("name")
	var req []struct {
		ParamKey    string   `json:"param_key"`
		ParamValues []string `json:"param_values"`
		DefaultVal  string   `json:"default_value"`
		SortOrder   int      `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, r := range req {
		valJSON, _ := json.Marshal(r.ParamValues)
		var existing model.ModelConfig
		err := h.DB.Where("model_name = ? AND param_key = ?", name, r.ParamKey).First(&existing).Error
		if err != nil {
			h.DB.Create(&model.ModelConfig{
				ModelName:   name,
				ParamKey:    r.ParamKey,
				ParamValues: model.JSON(valJSON),
				DefaultVal:  r.DefaultVal,
				SortOrder:   r.SortOrder,
			})
		} else {
			h.DB.Model(&existing).Updates(map[string]interface{}{
				"param_values":  model.JSON(valJSON),
				"default_value": r.DefaultVal,
				"sort_order":    r.SortOrder,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "配置已更新"})
}

// ListImageModels returns all image-type models with their configs (public API for user-facing app).
func (h *AdminModelHandler) ListImageModels(c *gin.Context) {
	var models []model.Model
	h.DB.Where("type = ? AND status = ?", "image", "active").Order("sort ASC, id ASC").Find(&models)

	// Load all configs at once
	var allConfigs []model.ModelConfig
	h.DB.Order("sort_order ASC").Find(&allConfigs)
	configMap := map[string][]model.ModelConfig{}
	for _, cfg := range allConfigs {
		configMap[cfg.ModelName] = append(configMap[cfg.ModelName], cfg)
	}

	type configEntry struct {
		Values  []string `json:"values"`
		Default string   `json:"default"`
	}
	type modelResp struct {
		Name        string                 `json:"name"`
		DisplayName string                 `json:"display_name"`
		Provider    string                 `json:"provider"`
		Icon        string                 `json:"icon"`
		Description string                 `json:"description"`
		Badge       string                 `json:"badge"`
		Tags        json.RawMessage        `json:"tags"`
		VipOnly     bool                   `json:"vip_only"`
		Versions    json.RawMessage        `json:"versions"`
		Config      map[string]configEntry `json:"config"`
	}

	result := make([]modelResp, 0, len(models))
	for _, m := range models {
		tags := json.RawMessage(m.Tags)
		if tags == nil || len(tags) == 0 {
			tags = json.RawMessage("[]")
		}
		resp := modelResp{
			Name:        m.Name,
			DisplayName: m.DisplayName,
			Provider:    m.Provider,
			Icon:        m.Icon,
			Description: m.Description,
			Badge:       m.Badge,
			Tags:        tags,
			VipOnly:     m.VipOnly,
			Versions:    json.RawMessage(m.Versions),
			Config:      map[string]configEntry{},
		}
		if resp.Versions == nil || len(resp.Versions) == 0 {
			resp.Versions = json.RawMessage("null")
		}

		for _, cfg := range configMap[m.Name] {
			var vals []string
			json.Unmarshal(cfg.ParamValues, &vals)
			resp.Config[cfg.ParamKey] = configEntry{Values: vals, Default: cfg.DefaultVal}
		}
		result = append(result, resp)
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
