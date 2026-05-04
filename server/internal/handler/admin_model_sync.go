package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AdminModelSyncHandler struct {
	DB *gorm.DB
}

type openRouterModel struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	ContextLength  int    `json:"context_length"`
	Architecture   struct {
		InputModalities  []string `json:"input_modalities"`
		OutputModalities []string `json:"output_modalities"`
	} `json:"architecture"`
	Pricing struct {
		Prompt     string `json:"prompt"`
		Completion string `json:"completion"`
		Image      string `json:"image"`
		Request    string `json:"request"`
	} `json:"pricing"`
	TopProvider struct {
		ContextLength      int  `json:"context_length"`
		MaxCompletionTokens int  `json:"max_completion_tokens"`
		IsModerated        bool `json:"is_moderated"`
	} `json:"top_provider"`
	SupportedParameters []string `json:"supported_parameters"`
}

type openRouterResponse struct {
	Data []openRouterModel `json:"data"`
}

func (h *AdminModelSyncHandler) SyncOpenRouter(c *gin.Context) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get("https://openrouter.ai/api/v1/models?output_modalities=all")
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch OpenRouter models: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to read response: " + err.Error()})
		return
	}

	var orResp openRouterResponse
	if err := json.Unmarshal(body, &orResp); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to parse response: " + err.Error()})
		return
	}

	created := 0
	updated := 0
	for _, m := range orResp.Data {
		if m.ID == "" || m.ID == "openrouter/auto" {
			continue
		}

		// Determine type from output modalities
		modelType := "chat"
		for _, mod := range m.Architecture.OutputModalities {
			if mod == "image" {
				modelType = "image"
				break
			}
			if mod == "audio" {
				modelType = "voice"
				break
			}
		}

		// Extract provider from id (e.g. "openai/gpt-4o" -> "openai")
		provider := ""
		if parts := strings.SplitN(m.ID, "/", 2); len(parts) == 2 {
			provider = parts[0]
		}

		inputMod, _ := json.Marshal(m.Architecture.InputModalities)
		outputMod, _ := json.Marshal(m.Architecture.OutputModalities)
		supportedParams, _ := json.Marshal(m.SupportedParameters)

		// Parse pricing (USD per token -> credits per 1K tokens, 1 USD = 1000 credits)
		priceInput := parsePrice(m.Pricing.Prompt) * 1000.0 * 1000.0
		priceOutput := parsePrice(m.Pricing.Completion) * 1000.0 * 1000.0
		pricePerCall := parsePrice(m.Pricing.Image) * 1000.0

		maxOutput := m.TopProvider.MaxCompletionTokens
		ctxLen := m.ContextLength
		if m.TopProvider.ContextLength > 0 && m.TopProvider.ContextLength < ctxLen {
			ctxLen = m.TopProvider.ContextLength
		}

		record := model.Model{
			Name:             m.ID,
			DisplayName:      m.Name,
			Type:             modelType,
			Description:      truncate(m.Description, 490),
			Provider:         provider,
			ContextLength:    ctxLen,
			MaxOutputTokens:  maxOutput,
			InputModalities:  model.JSON(inputMod),
			OutputModalities: model.JSON(outputMod),
			SupportedParams:  model.JSON(supportedParams),
			PricingMode:      "per_token",
			PriceInput:       priceInput,
			PriceOutput:      priceOutput,
			PricePerCall:     pricePerCall,
			Status:           "active",
		}

		result := h.DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"display_name", "type", "description", "provider",
				"context_length", "max_output_tokens",
				"input_modalities", "output_modalities", "supported_params",
				"pricing_mode", "price_input", "price_output", "price_per_call",
				"updated_at",
			}),
		}).Create(&record)

		if result.Error == nil {
			if result.RowsAffected > 0 {
				// Check if it was an insert or update
				var existing model.Model
				h.DB.Where("name = ?", m.ID).First(&existing)
				if existing.CreatedAt.Before(time.Now().Add(-2 * time.Second)) {
					updated++
				} else {
					created++
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Sync completed",
		"total":   len(orResp.Data),
		"created": created,
		"updated": updated,
	})
}

func parsePrice(s string) float64 {
	if s == "" || s == "0" {
		return 0
	}
	var v float64
	json.Unmarshal([]byte(s), &v)
	return v
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
