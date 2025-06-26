package models

import (
	"time"
)

type User struct {
	ID        string    `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Document struct {
	ID          string     `json:"id" db:"id"`
	UserID      string     `json:"user_id" db:"user_id"`
	FileName    string     `json:"file_name" db:"file_name"`
	StoragePath *string    `json:"storage_path" db:"storage_path"`
	UploadedAt  *time.Time `json:"uploaded_at" db:"uploaded_at"`
}

type DocumentChunk struct {
	ID         string    `json:"id" db:"id"`
	DocumentID string    `json:"document_id" db:"document_id"`
	ChunkIndex int       `json:"chunk_index" db:"chunk_index"`
	Content    string    `json:"content" db:"content"`
	Embedding  *string   `json:"embedding,omitempty" db:"embedding"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type ChatMessage struct {
	ID             string    `json:"id" db:"id"`
	DocumentID     string    `json:"document_id" db:"document_id"`
	UserID         string    `json:"user_id" db:"user_id"`
	MessageType    string    `json:"message_type" db:"message_type"`
	MessageContent string    `json:"message_content" db:"message_content"`
	Timestamp      time.Time `json:"timestamp" db:"timestamp"`
}

type ChatRequest struct {
	Message string `json:"message"`
}

type ChatResponse struct {
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

type UploadResponse struct {
	DocumentID string `json:"document_id"`
	Message    string `json:"message"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type CompareDocumentsRequest struct {
	DocumentIDs []string `json:"document_ids"`
	CompareType string   `json:"compare_type"` // "summary", "detailed", "themes", "differences"
}

type CompareDocumentsResponse struct {
	Comparison DocumentComparison `json:"comparison"`
	Message    string             `json:"message"`
}

type DocumentComparison struct {
	Documents    []Document `json:"documents"`
	Summary      string     `json:"summary"`
	Similarities []string   `json:"similarities"`
	Differences  []string   `json:"differences"`
	KeyThemes    []string   `json:"key_themes"`
	Insights     []string   `json:"insights"`
	ComparedAt   time.Time  `json:"compared_at"`
}
