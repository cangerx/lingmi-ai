package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	sqlFile := "../scripts/seed_prompts.sql"
	if len(os.Args) > 1 {
		sqlFile = os.Args[1]
	}
	data, err := os.ReadFile(sqlFile)
	if err != nil {
		log.Fatalf("Failed to read SQL file: %v", err)
	}

	stmts := strings.Split(string(data), "\n")
	executed := 0
	for _, stmt := range stmts {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}
		if err := db.Exec(stmt).Error; err != nil {
			log.Printf("SQL error: %v\n  → %s", err, stmt[:min(len(stmt), 100)])
		} else {
			executed++
		}
	}
	fmt.Printf("✓ Executed %d SQL statements\n", executed)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
