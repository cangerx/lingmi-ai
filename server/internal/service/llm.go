package service

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

// ChatMessage represents a single message in the chat
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the request payload from client
type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

// ChatCompletionChoice is a single choice in the response
type ChatCompletionChoice struct {
	Index   int         `json:"index"`
	Message ChatMessage `json:"message"`
	Delta   ChatMessage `json:"delta,omitempty"`
}

// ChatCompletionUsage tracks token usage
type ChatCompletionUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatCompletionResponse is the full response
type ChatCompletionResponse struct {
	ID      string                 `json:"id"`
	Object  string                 `json:"object"`
	Choices []ChatCompletionChoice `json:"choices"`
	Usage   ChatCompletionUsage    `json:"usage"`
}

// LLMService handles AI model routing and proxying
type LLMService struct {
	DB *gorm.DB
}

func NewLLMService(db *gorm.DB) *LLMService {
	return &LLMService{DB: db}
}

// SelectChannel picks the best available channel for a given model
func (s *LLMService) SelectChannel(modelName string) (*model.Channel, error) {
	var channels []model.Channel
	// Find enabled channels that support this model
	err := s.DB.Where("status = ?", "enabled").
		Where("models @> ?", fmt.Sprintf(`["%s"]`, modelName)).
		Order("priority DESC, weight DESC").
		Find(&channels).Error
	if err != nil {
		return nil, fmt.Errorf("query channels: %w", err)
	}

	if len(channels) == 0 {
		return nil, fmt.Errorf("no available channel for model: %s", modelName)
	}

	// Simple weighted selection: pick first by priority
	return &channels[0], nil
}

// ChatCompletion sends a non-streaming request to the upstream
func (s *LLMService) ChatCompletion(channel *model.Channel, req *ChatRequest) (*ChatCompletionResponse, error) {
	body, _ := json.Marshal(req)

	url := strings.TrimRight(channel.BaseURL, "/") + "/v1/chat/completions"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+channel.APIKey)

	client := &http.Client{Timeout: time.Duration(channel.Timeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upstream error %d: %s", resp.StatusCode, string(respBody))
	}

	var result ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// StreamChatCompletion sends a streaming SSE request and writes chunks to the writer
func (s *LLMService) StreamChatCompletion(channel *model.Channel, req *ChatRequest, w http.ResponseWriter, flusher http.Flusher) error {
	req.Stream = true
	body, _ := json.Marshal(req)

	url := strings.TrimRight(channel.BaseURL, "/") + "/v1/chat/completions"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+channel.APIKey)

	client := &http.Client{Timeout: time.Duration(channel.Timeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("upstream request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upstream error %d: %s", resp.StatusCode, string(respBody))
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		// Forward SSE data lines as-is
		fmt.Fprintf(w, "%s\n\n", line)
		flusher.Flush()

		// Check for [DONE]
		if strings.Contains(line, "[DONE]") {
			break
		}
	}

	return scanner.Err()
}
