package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/database"
	"github.com/lingmiai/server/internal/model"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}
	_ = database.AutoMigrate(db)

	var channels []model.Channel
	db.Find(&channels)

	fmt.Printf("=== Channels (%d) ===\n", len(channels))
	for _, ch := range channels {
		var models []string
		json.Unmarshal(ch.Models, &models)
		fmt.Printf("  ID=%d name=%q type=%s status=%s models=%v\n", ch.ID, ch.Name, ch.Type, ch.Status, models)
	}

	fmt.Println()

	var chatModels []model.Model
	db.Where("type = ? AND status = ?", "chat", "active").Order("sort ASC, id ASC").Find(&chatModels)
	fmt.Printf("=== Chat Models (%d) ===\n", len(chatModels))
	for _, m := range chatModels {
		fmt.Printf("  %s (sort=%d)\n", m.Name, m.Sort)
	}

	// Check which chat model has a channel
	for _, m := range chatModels {
		var count int64
		db.Model(&model.Channel{}).Where("status = ?", "enabled").
			Where("models @> ?", fmt.Sprintf(`["%s"]`, m.Name)).
			Count(&count)
		fmt.Printf("  %s -> %d channels\n", m.Name, count)
	}

	var setting model.SystemSetting
	if db.Where("setting_group = ? AND setting_key = ?", "prompt", "prompt_optimize_model").First(&setting).Error == nil {
		fmt.Printf("\nprompt_optimize_model = %q\n", setting.Value)
	} else {
		log.Println("No prompt_optimize_model setting found")
	}
}
