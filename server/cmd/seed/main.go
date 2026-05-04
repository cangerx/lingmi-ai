package main

import (
	"fmt"
	"log"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/database"
	"github.com/lingmiai/server/internal/model"
	"golang.org/x/crypto/bcrypt"
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

	// Seed default role
	var role model.Role
	result := db.Where("name = ?", "super_admin").First(&role)
	if result.RowsAffected == 0 {
		role = model.Role{
			Name:        "super_admin",
			Description: "超级管理员",
			Permissions: model.JSON(`["*"]`),
		}
		db.Create(&role)
		fmt.Println("✓ Created role: super_admin")
	} else {
		fmt.Println("→ Role super_admin already exists")
	}

	// Seed default admin user
	var admin model.AdminUser
	result = db.Where("username = ?", "admin").First(&admin)
	if result.RowsAffected == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		admin = model.AdminUser{
			Username:     "admin",
			PasswordHash: string(hash),
			RoleID:       role.ID,
			Status:       "active",
		}
		db.Create(&admin)
		fmt.Println("✓ Created admin user: admin / admin123")
	} else {
		fmt.Println("→ Admin user already exists")
	}

	fmt.Println("\nSeed completed!")
	fmt.Println("Login: username=admin, password=admin123")
}
