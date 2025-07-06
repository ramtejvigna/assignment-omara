package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"strategy-analyst/internal/models"

	"github.com/google/uuid"
)

type ChatService struct {
	db              *sql.DB
	documentService *DocumentService
	aiService       *AIService
}

func NewChatService(db *sql.DB, documentService *DocumentService, aiService *AIService) *ChatService {
	return &ChatService{
		db:              db,
		documentService: documentService,
		aiService:       aiService,
	}
}

func (cs *ChatService) GetChatHistory(ctx context.Context, documentID, userID string) ([]*models.ChatMessage, error) {
	// Validate inputs
	if strings.TrimSpace(documentID) == "" {
		return nil, fmt.Errorf("documentID cannot be empty")
	}
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("userID cannot be empty")
	}

	// First verify the user owns this document
	_, err := cs.documentService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, err
	}

	// Fixed SQL query formatting to prevent parameter mismatch issues
	query := "SELECT id, document_id, user_id, message_type, message_content, timestamp FROM chat_history WHERE document_id = $1 AND user_id = $2 ORDER BY timestamp ASC"
	rows, err := cs.db.QueryContext(ctx, query, documentID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query chat history: %w", err)
	}
	defer rows.Close()

	var messages []*models.ChatMessage
	for rows.Next() {
		msg := &models.ChatMessage{}
		err := rows.Scan(&msg.ID, &msg.DocumentID, &msg.UserID, &msg.MessageType, &msg.MessageContent, &msg.Timestamp)
		if err != nil {
			return nil, fmt.Errorf("failed to scan chat message: %w", err)
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

func (cs *ChatService) SendMessage(ctx context.Context, documentID, userID, message string) (*models.ChatResponse, error) {
	// Validate inputs
	if strings.TrimSpace(documentID) == "" {
		return nil, fmt.Errorf("documentID cannot be empty")
	}
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("userID cannot be empty")
	}
	if strings.TrimSpace(message) == "" {
		return nil, fmt.Errorf("message cannot be empty")
	}

	// Verify the user owns this document
	document, err := cs.documentService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, err
	}

	// Store user message
	userMsgID := uuid.New().String()
	userQuery := `INSERT INTO chat_history (id, document_id, user_id, message_type, message_content, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`
	_, err = cs.db.ExecContext(ctx, userQuery, userMsgID, documentID, userID, "user", message)
	if err != nil {
		return nil, fmt.Errorf("failed to store user message: %w", err)
	}

	// Get document chunks for context
	chunks, err := cs.documentService.GetDocumentChunks(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get document chunks: %w", err)
	}

	if len(chunks) == 0 {
		return nil, fmt.Errorf("document is still being processed, please try again in a moment")
	}

	// Convert chunks to string array
	var chunkTexts []string
	for _, chunk := range chunks {
		chunkTexts = append(chunkTexts, chunk.Content)
	}

	// Generate AI response
	aiResponse, err := cs.aiService.GenerateInsight(ctx, message, chunkTexts, document.FileName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate AI response: %w", err)
	}

	// Store AI response
	aiMsgID := uuid.New().String()
	aiQuery := `INSERT INTO chat_history (id, document_id, user_id, message_type, message_content, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`
	_, err = cs.db.ExecContext(ctx, aiQuery, aiMsgID, documentID, userID, "ai", aiResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to store AI response: %w", err)
	}

	return &models.ChatResponse{
		Message:   aiResponse,
		Timestamp: time.Now(),
	}, nil
}

func (cs *ChatService) DeleteChatHistory(ctx context.Context, documentID, userID string) error {
	// Verify the user owns this document
	_, err := cs.documentService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return err
	}

	query := `DELETE FROM chat_history WHERE document_id = $1 AND user_id = $2`
	_, err = cs.db.ExecContext(ctx, query, documentID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete chat history: %w", err)
	}

	return nil
}

// CompareDocuments generates AI-powered comparison between multiple documents
func (cs *ChatService) CompareDocuments(ctx context.Context, documents []*models.Document, documentsChunks [][]string, compareType string) (*models.DocumentComparison, error) {
	// Validate inputs
	if len(documents) < 2 {
		return nil, fmt.Errorf("at least 2 documents are required for comparison")
	}

	if cs.aiService == nil {
		return nil, fmt.Errorf("AI service not available")
	}

	// Generate comparison using AI service
	comparison, err := cs.aiService.CompareDocuments(ctx, documents, documentsChunks, compareType)
	if err != nil {
		return nil, fmt.Errorf("failed to generate document comparison: %w", err)
	}

	return comparison, nil
}
