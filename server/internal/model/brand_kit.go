package model

import "time"

// BrandKit stores a user's brand identity configuration (Lovart-style).
type BrandKit struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index" json:"user_id"`
	BrandName    string    `gorm:"size:100" json:"brand_name"`
	Description  string    `gorm:"size:500" json:"description"`
	DesignGuide  string    `gorm:"type:text" json:"design_guide"`  // Brand design principles / guidelines text
	Colors       string    `gorm:"type:text" json:"colors"`        // JSON: [{"name":"Cloud","hex":"#F0F0F0"}]
	Fonts        string    `gorm:"type:text" json:"fonts"`         // JSON: [{"role":"heading","name":"Feature Display"},{"role":"body","name":"GT Standard"}]
	Keywords     string    `gorm:"size:500" json:"keywords"`       // comma-separated, injected into prompt
	Logos        string    `gorm:"type:text" json:"logos"`         // JSON: [{"type":"primary","name":"Primary Logo","file_id":1},{"type":"symbol",...}]
	BrandImages  string    `gorm:"type:text" json:"brand_images"`  // JSON: [{"file_id":1,"label":"AI Art Style","category":"style"}]
	LogoFileIDs  string    `gorm:"size:200" json:"logo_file_ids"`  // deprecated, kept for migration compatibility
	ManualFileID uint      `gorm:"default:0" json:"manual_file_id"`
	ManualParsed bool      `gorm:"default:false" json:"manual_parsed"`
	IsDefault    bool      `gorm:"default:false" json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
