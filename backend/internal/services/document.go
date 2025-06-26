package services

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ledongthuc/pdf"

	"strategy-analyst/internal/models"
)

type DocumentService struct {
	db             *sql.DB
	storageService *StorageService
}

func NewDocumentService(db *sql.DB, storageService *StorageService) *DocumentService {
	return &DocumentService{
		db:             db,
		storageService: storageService,
	}
}

func (ds *DocumentService) CreateDocument(ctx context.Context, userID, fileName string, fileContent io.Reader) (*models.Document, error) {
	// Validate inputs
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("userID cannot be empty")
	}
	if strings.TrimSpace(fileName) == "" {
		return nil, fmt.Errorf("fileName cannot be empty")
	}
	if fileContent == nil {
		return nil, fmt.Errorf("fileContent cannot be nil")
	}

	// Generate unique document ID
	docID := uuid.New().String()

	// Check if storage service is initialized
	if !ds.storageService.IsInitialized() {
		return nil, fmt.Errorf("storage service is not initialized - please check your GCS configuration")
	}

	// Upload file to storage first
	storagePath, err := ds.storageService.UploadFile(ctx, fileName, fileContent)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// Create document record only after successful upload with proper transaction handling
	tx, err := ds.db.BeginTx(ctx, nil)
	if err != nil {
		// Clean up uploaded file if transaction fails to start
		cleanupErr := ds.storageService.DeleteFile(ctx, storagePath)
		if cleanupErr != nil {
			fmt.Printf("Warning: failed to cleanup uploaded file after transaction error: %v\n", cleanupErr)
		}
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		}
	}()

	query := `INSERT INTO documents (id, user_id, file_name, storage_path, uploaded_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`
	_, err = tx.ExecContext(ctx, query, docID, userID, fileName, storagePath)
	if err != nil {
		// Clean up uploaded file if database insert fails
		cleanupErr := ds.storageService.DeleteFile(ctx, storagePath)
		if cleanupErr != nil {
			fmt.Printf("Warning: failed to cleanup uploaded file after DB error: %v\n", cleanupErr)
		}
		return nil, fmt.Errorf("failed to create document record: %w", err)
	}

	if err = tx.Commit(); err != nil {
		// Clean up uploaded file if commit fails
		cleanupErr := ds.storageService.DeleteFile(ctx, storagePath)
		if cleanupErr != nil {
			fmt.Printf("Warning: failed to cleanup uploaded file after commit error: %v\n", cleanupErr)
		}
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Get the created document
	doc, err := ds.GetDocument(ctx, docID, userID)
	if err != nil {
		// Clean up both storage and database record if retrieval fails
		cleanupErr := ds.storageService.DeleteFile(ctx, storagePath)
		if cleanupErr != nil {
			fmt.Printf("Warning: failed to cleanup uploaded file after retrieval error: %v\n", cleanupErr)
		}
		return nil, fmt.Errorf("failed to retrieve created document: %w", err)
	}

	// Process document content in background
	go ds.processDocumentContent(context.Background(), doc)

	return doc, nil
}

func (ds *DocumentService) GetDocuments(ctx context.Context, userID string) ([]*models.Document, error) {
	// Validate userID to prevent empty or invalid queries
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("userID cannot be empty")
	}

	// Fixed SQL query formatting to prevent parameter mismatch issues
	query := `SELECT id, user_id, file_name, storage_path, CASE WHEN uploaded_at IS NULL THEN CURRENT_TIMESTAMP ELSE uploaded_at END as uploaded_at FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC`
	rows, err := ds.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query documents: %w", err)
	}
	defer rows.Close()

	var documents []*models.Document
	for rows.Next() {
		doc := &models.Document{}
		var uploadedAt time.Time
		err := rows.Scan(&doc.ID, &doc.UserID, &doc.FileName, &doc.StoragePath, &uploadedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan document: %w", err)
		}
		doc.UploadedAt = &uploadedAt
		documents = append(documents, doc)
	}

	return documents, nil
}

func (ds *DocumentService) GetDocument(ctx context.Context, docID, userID string) (*models.Document, error) {
	// Fixed SQL query formatting to prevent parameter mismatch issues
	query := `SELECT id, user_id, file_name, storage_path, CASE WHEN uploaded_at IS NULL THEN CURRENT_TIMESTAMP ELSE uploaded_at END as uploaded_at FROM documents WHERE id = $1 AND user_id = $2`
	row := ds.db.QueryRowContext(ctx, query, docID, userID)

	doc := &models.Document{}
	var uploadedAt time.Time
	err := row.Scan(&doc.ID, &doc.UserID, &doc.FileName, &doc.StoragePath, &uploadedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}
	doc.UploadedAt = &uploadedAt

	return doc, nil
}

func (ds *DocumentService) DeleteDocument(ctx context.Context, docID, userID string) error {
	// Get document first to get storage path
	doc, err := ds.GetDocument(ctx, docID, userID)
	if err != nil {
		return err
	}

	// Delete from database (will cascade to chunks and chat history)
	query := `DELETE FROM documents WHERE id = $1 AND user_id = $2`
	result, err := ds.db.ExecContext(ctx, query, docID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("document not found")
	}

	// Delete file from storage (only if storage path exists)
	if doc.StoragePath != nil {
		if err := ds.storageService.DeleteFile(ctx, *doc.StoragePath); err != nil {
			// Log error but don't fail the operation
			fmt.Printf("Warning: failed to delete file from storage: %v\n", err)
		}
	}

	return nil
}

func (ds *DocumentService) GetDocumentChunks(ctx context.Context, docID string) ([]*models.DocumentChunk, error) {
	// Fixed SQL query formatting to prevent parameter mismatch issues
	query := `SELECT id, document_id, chunk_index, content, embedding, created_at FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index`
	rows, err := ds.db.QueryContext(ctx, query, docID)
	if err != nil {
		return nil, fmt.Errorf("failed to query document chunks: %w", err)
	}
	defer rows.Close()

	var chunks []*models.DocumentChunk
	for rows.Next() {
		chunk := &models.DocumentChunk{}
		err := rows.Scan(&chunk.ID, &chunk.DocumentID, &chunk.ChunkIndex, &chunk.Content, &chunk.Embedding, &chunk.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan document chunk: %w", err)
		}
		chunks = append(chunks, chunk)
	}

	return chunks, nil
}

func (ds *DocumentService) processDocumentContent(ctx context.Context, doc *models.Document) {
	logPrefix := fmt.Sprintf("[Document: %s] ", doc.ID)
	log.Println(logPrefix + "Starting document processing...")

	defer func() {
		chunks, err := ds.GetDocumentChunks(ctx, doc.ID)
		if err != nil {
			log.Printf(logPrefix+"Error getting chunks: %v\n", err)
		}
		if len(chunks) == 0 {
			log.Println(logPrefix + "No valid chunks found. Creating fallback.")
			ds.createFallbackChunk(ctx, doc)
			// Recheck chunks after fallback creation
			chunks, _ = ds.GetDocumentChunks(ctx, doc.ID)
		}
		log.Printf(logPrefix+"Finished processing. Total chunks: %d\n", len(chunks))
	}()

	if doc.StoragePath == nil {
		log.Println(logPrefix + "Missing storage path - document was not properly uploaded.")
		return
	}

	// Check if storage service is available
	if !ds.storageService.IsInitialized() {
		log.Println(logPrefix + "Storage service not initialized - cannot process document.")
		return
	}

	reader, err := ds.storageService.DownloadFile(ctx, *doc.StoragePath)
	if err != nil {
		log.Printf(logPrefix+"Failed to download file from storage path '%s': %v\n", *doc.StoragePath, err)
		log.Println(logPrefix + "This usually indicates the file was not properly uploaded to storage.")
		return
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		log.Printf(logPrefix+"Failed to read file content: %v\n", err)
		return
	}

	log.Printf(logPrefix+"Successfully downloaded file. Size: %d bytes\n", len(content))

	var text string
	ext := strings.ToLower(filepath.Ext(doc.FileName))
	switch ext {
	case ".pdf":
		log.Println(logPrefix + "Extracting text from PDF...")
		text, err = ds.extractTextFromPDF(content)
		if err != nil {
			log.Printf(logPrefix+"PDF text extraction failed: %v\n", err)
		}
	case ".txt":
		log.Println(logPrefix + "Processing text file...")
		text = string(content)
	default:
		log.Printf(logPrefix+"Unsupported file extension: %s\n", ext)
		text = ""
	}

	if err != nil || strings.TrimSpace(text) == "" {
		log.Printf(logPrefix+"Text extraction failed or content empty: %v\n", err)
		text = fmt.Sprintf("Text extraction failed for file %s. Content not available for chat.", doc.FileName)
	} else {
		log.Printf(logPrefix+"Successfully extracted %d characters of text\n", len(text))
	}

	chunks := ds.chunkText(text, 1000)
	log.Printf(logPrefix+"Created %d text chunks for processing\n", len(chunks))

	successCount := 0
	for i, chunk := range chunks {
		chunkID := uuid.New().String()
		query := `INSERT INTO document_chunks (id, document_id, chunk_index, content) VALUES ($1, $2, $3, $4)`
		_, err := ds.db.ExecContext(ctx, query, chunkID, doc.ID, i, chunk)
		if err != nil {
			log.Printf(logPrefix+"Failed to store chunk %d: %v\n", i, err)
		} else {
			successCount++
		}
	}
	log.Printf(logPrefix+"Successfully stored %d out of %d chunks\n", successCount, len(chunks))
}

func (ds *DocumentService) createFallbackChunk(ctx context.Context, doc *models.Document) {
	fallbackText := fmt.Sprintf("This is document '%s' that was uploaded successfully. The document is ready for analysis and questions, although detailed content extraction may be limited.", doc.FileName)

	chunkID := uuid.New().String()
	query := `INSERT INTO document_chunks (id, document_id, chunk_index, content) VALUES ($1, $2, $3, $4)`
	_, err := ds.db.ExecContext(ctx, query, chunkID, doc.ID, 0, fallbackText)
	if err != nil {
		fmt.Printf("Error creating fallback chunk for document %s: %v\n", doc.ID, err)
	} else {
		fmt.Printf("Created fallback chunk for document %s\n", doc.ID)
	}
}

func (ds *DocumentService) extractTextFromPDF(content []byte) (string, error) {
	reader := bytes.NewReader(content)
	pdfReader, err := pdf.NewReader(reader, int64(len(content)))
	if err != nil {
		return "", fmt.Errorf("unable to create PDF reader: %w", err)
	}

	var textBuilder strings.Builder
	numPages := pdfReader.NumPage()
	for pageIndex := 1; pageIndex <= numPages; pageIndex++ {
		page := pdfReader.Page(pageIndex)
		pageText, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		textBuilder.WriteString(pageText)
	}

	return textBuilder.String(), nil
}

func (ds *DocumentService) chunkText(text string, chunkSize int) []string {
	if len(text) <= chunkSize {
		return []string{text}
	}

	var chunks []string
	words := strings.Fields(text)

	var currentChunk strings.Builder
	for _, word := range words {
		// If adding this word would exceed chunk size, start a new chunk
		if currentChunk.Len()+len(word)+1 > chunkSize && currentChunk.Len() > 0 {
			chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
			currentChunk.Reset()
		}

		if currentChunk.Len() > 0 {
			currentChunk.WriteString(" ")
		}
		currentChunk.WriteString(word)
	}

	// Add the last chunk if it has content
	if currentChunk.Len() > 0 {
		chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
	}

	return chunks
}

// ReprocessDocument manually processes a document that might be stuck
func (ds *DocumentService) ReprocessDocument(ctx context.Context, docID, userID string) error {
	doc, err := ds.GetDocument(ctx, docID, userID)
	if err != nil {
		return err
	}

	// Delete existing chunks if any
	deleteQuery := `DELETE FROM document_chunks WHERE document_id = $1`
	_, err = ds.db.ExecContext(ctx, deleteQuery, docID)
	if err != nil {
		fmt.Printf("Warning: failed to delete existing chunks: %v\n", err)
	}

	// Process the document again
	ds.processDocumentContent(ctx, doc)

	return nil
}

// CompareDocuments compares multiple documents and returns insights
func (ds *DocumentService) CompareDocuments(ctx context.Context, documentIDs []string, userID string) ([]*models.Document, [][]string, error) {
	// Validate inputs
	if len(documentIDs) < 2 {
		return nil, nil, fmt.Errorf("at least 2 documents are required for comparison")
	}
	if len(documentIDs) > 5 {
		return nil, nil, fmt.Errorf("maximum 5 documents can be compared at once")
	}

	// Verify all documents belong to the user and get document info
	documents := make([]*models.Document, 0, len(documentIDs))
	documentsChunks := make([][]string, 0, len(documentIDs))

	for _, docID := range documentIDs {
		// Verify document ownership
		doc, err := ds.GetDocument(ctx, docID, userID)
		if err != nil {
			return nil, nil, fmt.Errorf("document %s not found or access denied: %w", docID, err)
		}
		documents = append(documents, doc)

		// Get document chunks for content analysis
		chunks, err := ds.GetDocumentChunks(ctx, docID)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get chunks for document %s: %w", docID, err)
		}

		// Convert chunks to string slice
		chunkTexts := make([]string, 0, len(chunks))
		for _, chunk := range chunks {
			chunkTexts = append(chunkTexts, chunk.Content)
		}

		if len(chunkTexts) == 0 {
			// Create a fallback if no chunks exist
			chunkTexts = []string{fmt.Sprintf("Document '%s' content is not available for comparison", doc.FileName)}
		}

		documentsChunks = append(documentsChunks, chunkTexts)
	}

	return documents, documentsChunks, nil
}
