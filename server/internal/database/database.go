package database

import (
	"log"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Info
	if cfg.Server.Mode == "release" {
		logLevel = logger.Warn
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("Database connected")
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	// Fix: drop old system_settings table that used PostgreSQL reserved words as column names
	if db.Migrator().HasTable("system_settings") {
		var count int64
		db.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'group'").Scan(&count)
		if count > 0 {
			log.Println("[Migration] Dropping old system_settings table (reserved word columns)")
			db.Exec("DROP TABLE IF EXISTS system_settings")
		}
	}

	return db.AutoMigrate(
		&model.User{},
		&model.UserCredits{},
		&model.CreditLog{},
		&model.Channel{},
		&model.Model{},
		&model.Conversation{},
		&model.Message{},
		&model.Generation{},
		&model.Order{},
		&model.Package{},
		&model.RedeemCode{},
		&model.RedeemLog{},
		&model.Notification{},
		&model.AdminUser{},
		&model.Role{},
		&model.AdminLog{},
		&model.Ad{},
		&model.AdSlot{},
		&model.AdStat{},
		&model.SystemSetting{},
		&model.ModelConfig{},
		&model.UserOAuthBinding{},
		&model.Inspiration{},
		&model.SensitiveWord{},
		&model.ModerationLog{},
		&model.Commission{},
		&model.UserFolder{},
		&model.UserFile{},
		&model.UserStorageQuota{},
		&model.Template{},
		&model.BrandKit{},
		&model.PromptTemplate{},
	)
}
