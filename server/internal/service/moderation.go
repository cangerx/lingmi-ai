package service

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/lingmiai/server/internal/model"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Aho-Corasick automaton (built-in, zero external deps)
// ---------------------------------------------------------------------------

type acNode struct {
	children map[rune]*acNode
	fail     *acNode
	output   []acMatch
}

type acMatch struct {
	Word     string
	Category string
	Level    string // block / review
}

type acMatcher struct {
	root *acNode
}

func newACMatcher(words []acMatch) *acMatcher {
	root := &acNode{children: make(map[rune]*acNode)}
	// build trie
	for _, w := range words {
		cur := root
		for _, ch := range strings.ToLower(w.Word) {
			if cur.children[ch] == nil {
				cur.children[ch] = &acNode{children: make(map[rune]*acNode)}
			}
			cur = cur.children[ch]
		}
		cur.output = append(cur.output, w)
	}
	// build fail links (BFS)
	queue := []*acNode{}
	for _, child := range root.children {
		child.fail = root
		queue = append(queue, child)
	}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		for ch, child := range cur.children {
			queue = append(queue, child)
			f := cur.fail
			for f != nil && f.children[ch] == nil {
				f = f.fail
			}
			if f == nil {
				child.fail = root
			} else {
				child.fail = f.children[ch]
			}
			child.output = append(child.output, child.fail.output...)
		}
	}
	return &acMatcher{root: root}
}

// Search returns all matches found in text
func (m *acMatcher) Search(text string) []acMatch {
	if m == nil || m.root == nil {
		return nil
	}
	var results []acMatch
	seen := map[string]bool{}
	cur := m.root
	for _, ch := range strings.ToLower(text) {
		for cur != m.root && cur.children[ch] == nil {
			cur = cur.fail
		}
		if cur.children[ch] != nil {
			cur = cur.children[ch]
		}
		for _, o := range cur.output {
			if !seen[o.Word] {
				seen[o.Word] = true
				results = append(results, o)
			}
		}
	}
	return results
}

// ---------------------------------------------------------------------------
// ModerationService
// ---------------------------------------------------------------------------

type ModerationService struct {
	DB  *gorm.DB
	LLM *LLMService

	mu      sync.RWMutex
	matcher *acMatcher
}

func NewModerationService(db *gorm.DB, llm *LLMService) *ModerationService {
	svc := &ModerationService{DB: db, LLM: llm}
	svc.RefreshWords()
	return svc
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

func (s *ModerationService) getSetting(key string) string {
	var setting model.SystemSetting
	if err := s.DB.Where("setting_group = ? AND setting_key = ?", "content_moderation", key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}

// IsEnabled checks if the overall moderation toggle is on
func (s *ModerationService) IsEnabled() bool {
	return s.getSetting("moderation_enabled") == "true"
}

func (s *ModerationService) isTextEnabled() bool {
	return s.getSetting("moderation_text_enabled") == "true"
}

func (s *ModerationService) isImageEnabled() bool {
	return s.getSetting("moderation_image_enabled") == "true"
}

func (s *ModerationService) isAIReviewEnabled() bool {
	return s.getSetting("moderation_ai_review_enabled") == "true"
}

func (s *ModerationService) aiModel() string {
	m := s.getSetting("moderation_ai_model")
	if m == "" {
		// fallback: pick first active chat model
		var mdl model.Model
		if err := s.DB.Where("type = ? AND status = ?", "chat", "active").Order("sort ASC").First(&mdl).Error; err == nil {
			return mdl.Name
		}
	}
	return m
}

// ---------------------------------------------------------------------------
// Word loading
// ---------------------------------------------------------------------------

// RefreshWords reloads the sensitive-word AC automaton from DB
func (s *ModerationService) RefreshWords() {
	var words []model.SensitiveWord
	s.DB.Where("status = ?", "active").Find(&words)

	patterns := make([]acMatch, 0, len(words))
	for _, w := range words {
		patterns = append(patterns, acMatch{
			Word:     w.Word,
			Category: w.Category,
			Level:    w.Level,
		})
	}
	s.mu.Lock()
	s.matcher = newACMatcher(patterns)
	s.mu.Unlock()
	log.Printf("[Moderation] loaded %d sensitive words", len(patterns))
}

// ---------------------------------------------------------------------------
// Text checking
// ---------------------------------------------------------------------------

// CheckTextResult holds the result of a text moderation check
type CheckTextResult struct {
	HitWords  []string // matched words
	RiskLevel string   // safe, suspect, block
}

// CheckText scans text against the local word list.
// Returns immediately without calling LLM.
func (s *ModerationService) CheckText(text string) *CheckTextResult {
	if !s.IsEnabled() || !s.isTextEnabled() {
		return &CheckTextResult{RiskLevel: "safe"}
	}
	if utf8.RuneCountInString(text) == 0 {
		return &CheckTextResult{RiskLevel: "safe"}
	}

	s.mu.RLock()
	matches := s.matcher.Search(text)
	s.mu.RUnlock()

	if len(matches) == 0 {
		return &CheckTextResult{RiskLevel: "safe"}
	}

	result := &CheckTextResult{RiskLevel: "review"}
	for _, m := range matches {
		result.HitWords = append(result.HitWords, m.Word)
		if m.Level == "block" {
			result.RiskLevel = "block"
		}
	}
	return result
}

// CheckTextWithAI calls LLM for a second opinion on suspicious text.
// Returns risk level (safe/block) and the AI's reasoning.
func (s *ModerationService) CheckTextWithAI(text string) (string, string) {
	if !s.isAIReviewEnabled() {
		return "suspect", ""
	}

	modelName := s.aiModel()
	if modelName == "" {
		return "suspect", "no AI model configured"
	}

	channel, err := s.LLM.SelectChannel(modelName)
	if err != nil {
		log.Printf("[Moderation] AI review channel error: %v", err)
		return "suspect", err.Error()
	}

	systemPrompt := `你是一个内容安全审核助手。请判断用户提供的文本是否包含违规内容（色情、暴力、政治敏感、广告、侮辱等）。
请严格以 JSON 格式返回：{"risk":"safe"} 或 {"risk":"block","reason":"简要说明"}。
只返回 JSON，不要有其他文字。`

	req := &ChatRequest{
		Model: modelName,
		Messages: []ChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: text},
		},
		Stream: false,
	}

	resp, err := s.LLM.ChatCompletion(channel, req)
	if err != nil {
		log.Printf("[Moderation] AI review error: %v", err)
		return "suspect", err.Error()
	}

	if len(resp.Choices) == 0 {
		return "suspect", "empty AI response"
	}

	raw := resp.Choices[0].Message.Content
	var result struct {
		Risk   string `json:"risk"`
		Reason string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &result); err != nil {
		// Try to extract JSON from markdown code block
		if idx := strings.Index(raw, "{"); idx >= 0 {
			if end := strings.LastIndex(raw, "}"); end > idx {
				_ = json.Unmarshal([]byte(raw[idx:end+1]), &result)
			}
		}
	}

	if result.Risk == "block" {
		return "block", result.Reason
	}
	return "safe", result.Reason
}

// ---------------------------------------------------------------------------
// Image checking (vision model)
// ---------------------------------------------------------------------------

// CheckImageWithAI uses a vision-capable model to check generated images.
func (s *ModerationService) CheckImageWithAI(imageURL string) (string, string) {
	if !s.IsEnabled() || !s.isImageEnabled() || !s.isAIReviewEnabled() {
		return "safe", ""
	}

	modelName := s.aiModel()
	if modelName == "" {
		return "safe", "no AI model"
	}

	channel, err := s.LLM.SelectChannel(modelName)
	if err != nil {
		return "safe", err.Error()
	}

	systemPrompt := `你是一个图片内容安全审核助手。请判断用户提供的图片URL是否可能包含违规内容（NSFW、色情、暴力血腥、政治敏感等）。
请严格以 JSON 格式返回：{"risk":"safe"} 或 {"risk":"block","reason":"简要说明"} 或 {"risk":"suspect","reason":"简要说明"}。
只返回 JSON，不要有其他文字。`

	req := &ChatRequest{
		Model: modelName,
		Messages: []ChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: fmt.Sprintf("请审核此图片: %s", imageURL)},
		},
		Stream: false,
	}

	resp, err := s.LLM.ChatCompletion(channel, req)
	if err != nil {
		log.Printf("[Moderation] image AI review error: %v", err)
		return "safe", err.Error()
	}

	if len(resp.Choices) == 0 {
		return "safe", "empty response"
	}

	raw := resp.Choices[0].Message.Content
	var result struct {
		Risk   string `json:"risk"`
		Reason string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &result); err != nil {
		if idx := strings.Index(raw, "{"); idx >= 0 {
			if end := strings.LastIndex(raw, "}"); end > idx {
				_ = json.Unmarshal([]byte(raw[idx:end+1]), &result)
			}
		}
	}

	switch result.Risk {
	case "block":
		return "block", result.Reason
	case "suspect":
		return "suspect", result.Reason
	default:
		return "safe", result.Reason
	}
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

// LogModeration writes a ModerationLog record
func (s *ModerationService) LogModeration(userID uint, contentType, source, text, imageURL string, refID uint, hitWords []string, aiResult, riskLevel string) {
	hw, _ := json.Marshal(hitWords)
	status := "pending"
	if riskLevel == "safe" {
		status = "approved"
	} else if riskLevel == "block" {
		status = "rejected"
	}

	logEntry := model.ModerationLog{
		UserID:       userID,
		ContentType:  contentType,
		Source:       source,
		OriginalText: text,
		ImageURL:     imageURL,
		RefID:        refID,
		HitWords:     model.JSON(hw),
		AIResult:     aiResult,
		RiskLevel:    riskLevel,
		Status:       status,
		CreatedAt:    time.Now(),
	}
	if err := s.DB.Create(&logEntry).Error; err != nil {
		log.Printf("[Moderation] failed to write log: %v", err)
	}
}
