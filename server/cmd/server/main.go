package main

import (
	"log"

	"github.com/lingmiai/server/internal/cache"
	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/database"
	"github.com/lingmiai/server/internal/handler"
	"github.com/lingmiai/server/internal/router"
	"github.com/lingmiai/server/internal/service"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// Connect Redis
	cache.Connect(&cfg.Redis)

	// Auto migrate
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Seed default settings
	handler.SeedAllSettings(db)

	// Background workers
	service.StartOrderExpireWorker(db)

	// Setup router
	r := router.Setup(cfg, db)

	// Start server
	addr := ":" + cfg.Server.Port
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
