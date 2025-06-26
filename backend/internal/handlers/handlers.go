package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"

	"strategy-analyst/internal/middleware"
	"strategy-analyst/internal/models"
	"strategy-analyst/internal/services"
)

type Handlers struct {
	db              *sql.DB
	authClient      *auth.Client
	documentService *services.DocumentService
	chatService     *services.ChatService
}

func New(db *sql.DB, authClient *auth.Client, documentService *services.DocumentService, chatService *services.ChatService) *Handlers {
	return &Handlers{
		db:              db,
		authClient:      authClient,
		documentService: documentService,
		chatService:     chatService,
	}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (h *Handlers) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	// Ensure user exists in database (handles creation if needed)
	user, err := h.getOrCreateUser(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to get or create user profile for %s: %v\n", userID, err)
		http.Error(w, "Failed to get user profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handlers) GetDocuments(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	// Ensure user exists in database before fetching documents
	_, err := h.getOrCreateUser(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to ensure user exists before fetching documents for %s: %v\n", userID, err)
		http.Error(w, "Failed to validate user", http.StatusInternalServerError)
		return
	}

	documents, err := h.documentService.GetDocuments(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to get documents for user %s: %v\n", userID, err)
		http.Error(w, fmt.Sprintf("Failed to get documents: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(documents)
}

func (h *Handlers) UploadDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	// Ensure user exists in database before allowing upload
	_, err := h.getOrCreateUser(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to ensure user exists before document upload for %s: %v\n", userID, err)
		http.Error(w, "Failed to validate user", http.StatusInternalServerError)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(32 << 20) // 32MB max
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("document")
	if err != nil {
		http.Error(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" && ext != ".txt" {
		http.Error(w, "Only PDF and TXT files are supported", http.StatusBadRequest)
		return
	}

	// Create document
	document, err := h.documentService.CreateDocument(r.Context(), userID, header.Filename, file)
	if err != nil {
		fmt.Printf("Document upload failed for user %s, file %s: %v\n", userID, header.Filename, err)

		// Provide more specific error messages based on the error type
		errorMsg := "Failed to upload document"
		if strings.Contains(err.Error(), "storage service is not initialized") {
			errorMsg = "File storage service is currently unavailable. Please try again later or contact support."
		} else if strings.Contains(err.Error(), "failed to upload file to storage") {
			errorMsg = "Failed to upload file to storage. Please check your file and try again."
		} else if strings.Contains(err.Error(), "failed to create document record") {
			errorMsg = "Failed to save document information. Please try again."
		}

		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	response := models.UploadResponse{
		DocumentID: document.ID,
		Message:    "Document uploaded successfully. Processing started.",
	}

	fmt.Printf("Document uploaded successfully for user %s: %s (ID: %s)\n", userID, header.Filename, document.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *Handlers) GetDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	document, err := h.documentService.GetDocument(r.Context(), documentID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Document not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to get document: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(document)
}

func (h *Handlers) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	err := h.documentService.DeleteDocument(r.Context(), documentID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Document not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to delete document: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ReprocessDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	err := h.documentService.ReprocessDocument(r.Context(), documentID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Document not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to reprocess document: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Document reprocessing started"})
}

func (h *Handlers) GetDocumentStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	// Ensure user exists in database
	_, err := h.getOrCreateUser(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to ensure user exists for document status check %s: %v\n", userID, err)
		http.Error(w, "Failed to validate user", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	// Verify the user owns this document first
	_, err = h.documentService.GetDocument(r.Context(), documentID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Document not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to get document: %v", err), http.StatusInternalServerError)
		}
		return
	}

	// Get document chunks to check processing status
	chunks, err := h.documentService.GetDocumentChunks(r.Context(), documentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get document status: %v", err), http.StatusInternalServerError)
		return
	}

	status := "processing"
	if len(chunks) > 0 {
		status = "ready"
	}

	response := map[string]interface{}{
		"status":         status,
		"chunks_count":   len(chunks),
		"ready_for_chat": len(chunks) > 0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handlers) GetChatHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	// Ensure user exists in database
	_, err := h.getOrCreateUser(r.Context(), userID)
	if err != nil {
		fmt.Printf("Failed to ensure user exists for chat history %s: %v\n", userID, err)
		http.Error(w, "Failed to validate user", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	messages, err := h.chatService.GetChatHistory(r.Context(), documentID, userID)
	if err != nil {
		fmt.Printf("Failed to get chat history for user %s, document %s: %v\n", userID, documentID, err)
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Document not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to get chat history: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *Handlers) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	var req models.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Message) == "" {
		http.Error(w, "Message cannot be empty", http.StatusBadRequest)
		return
	}

	response, err := h.chatService.SendMessage(r.Context(), documentID, userID, req.Message)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Document not found", http.StatusNotFound)
		} else if strings.Contains(err.Error(), "still being processed") {
			http.Error(w, err.Error(), http.StatusAccepted)
		} else {
			http.Error(w, fmt.Sprintf("Failed to process message: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handlers) CompareDocuments(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.ensureAuthenticated(w, r)
	if !ok {
		return
	}

	var req models.CompareDocumentsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if len(req.DocumentIDs) < 2 {
		http.Error(w, "At least 2 documents are required for comparison", http.StatusBadRequest)
		return
	}

	if len(req.DocumentIDs) > 5 {
		http.Error(w, "Maximum 5 documents can be compared at once", http.StatusBadRequest)
		return
	}

	// Set default compare type if not provided
	if req.CompareType == "" {
		req.CompareType = "summary"
	}

	// Get documents and their content
	documents, documentsChunks, err := h.documentService.CompareDocuments(r.Context(), req.DocumentIDs, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "One or more documents not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to prepare documents for comparison: %v", err), http.StatusInternalServerError)
		}
		return
	}

	// Generate AI comparison
	comparison, err := h.chatService.CompareDocuments(r.Context(), documents, documentsChunks, req.CompareType)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate comparison: %v", err), http.StatusInternalServerError)
		return
	}

	response := models.CompareDocumentsResponse{
		Comparison: *comparison,
		Message:    "Document comparison completed successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ensureAuthenticated checks authentication and ensures user exists in database
func (h *Handlers) ensureAuthenticated(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return "", false
	}

	return userID, true
}

func (h *Handlers) getOrCreateUser(ctx context.Context, userID string) (*models.User, error) {
	// Validate userID to prevent SQL injection or empty queries
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("userID cannot be empty")
	}

	// Try to get existing user first
	query := `SELECT id, email, created_at FROM users WHERE id = $1`
	row := h.db.QueryRowContext(ctx, query, userID)

	user := &models.User{}
	err := row.Scan(&user.ID, &user.Email, &user.CreatedAt)
	if err == nil {
		// User exists, return it
		return user, nil
	}

	if err != sql.ErrNoRows {
		// Handle timestamp parsing errors gracefully
		if strings.Contains(err.Error(), "invalid timestamp") || strings.Contains(err.Error(), "time") {
			fmt.Printf("Timestamp parsing error for user %s, attempting to fix: %v\n", userID, err)
			// Try to fix timestamp issue by updating the record
			fixQuery := `UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE id = $1 AND (created_at IS NULL OR created_at = '')`
			_, fixErr := h.db.ExecContext(ctx, fixQuery, userID)
			if fixErr != nil {
				fmt.Printf("Failed to fix timestamp for user %s: %v\n", userID, fixErr)
			} else {
				// Try to get the user again after fixing timestamp
				row = h.db.QueryRowContext(ctx, query, userID)
				err = row.Scan(&user.ID, &user.Email, &user.CreatedAt)
				if err == nil {
					fmt.Printf("Successfully fixed timestamp issue for user %s\n", userID)
					return user, nil
				}
			}
		}
		fmt.Printf("Error querying user %s: %v\n", userID, err)
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	// User doesn't exist, get email from Firebase and create
	fmt.Printf("User %s not found in database, creating new user\n", userID)
	userRecord, err := h.authClient.GetUser(ctx, userID)
	if err != nil {
		fmt.Printf("Failed to get user %s from Firebase: %v\n", userID, err)
		return nil, fmt.Errorf("failed to get user from Firebase: %w", err)
	}

	// Sanitize email - ensure it's valid
	email := userRecord.Email
	if email == "" {
		email = "unknown@example.com"
	}

	// Check for suspicious content that might cause SQL parsing issues
	if strings.Contains(email, ".pdf") || strings.Contains(email, "Resume") {
		fmt.Printf("WARNING: Email contains suspicious content, sanitizing: '%s'\n", email)
		email = "sanitized@example.com"
	}

	// Additional validation: ensure email doesn't contain special characters that could cause SQL issues
	if strings.Contains(email, "'") || strings.Contains(email, "\"") || strings.Contains(email, ";") {
		fmt.Printf("WARNING: Email contains potentially harmful characters, sanitizing: '%s'\n", email)
		email = "sanitized@example.com"
	}

	fmt.Printf("Creating user with ID: %s, Email: %s\n", userID, email)

	// Use UPSERT (INSERT ... ON CONFLICT) to handle race conditions
	upsertQuery := `INSERT INTO users (id, email, created_at) 
                    VALUES ($1, $2, CURRENT_TIMESTAMP) 
                    ON CONFLICT (id) DO UPDATE SET 
                        email = EXCLUDED.email,
                        created_at = COALESCE(users.created_at, CURRENT_TIMESTAMP)
                    RETURNING id, email, created_at`

	row = h.db.QueryRowContext(ctx, upsertQuery, userID, email)
	newUser := &models.User{}
	err = row.Scan(&newUser.ID, &newUser.Email, &newUser.CreatedAt)
	if err != nil {
		fmt.Printf("Failed to upsert user %s in database: %v\n", userID, err)
		return nil, fmt.Errorf("failed to create or update user: %w", err)
	}

	fmt.Printf("Successfully upserted user: %s\n", newUser.ID)
	return newUser, nil
}
