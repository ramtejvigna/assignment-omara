package database

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// Connect function to connect to the database
func Connect(databaseURL string) (*sql.DB, error) {
	// Open a connection to the database
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	// Ping the database to check if the connection is successful (Validation)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	return db, nil
}

// Migrate function to run database migrations
func Migrate(db *sql.DB) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(255) PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS documents (
			id VARCHAR(255) PRIMARY KEY,
			user_id VARCHAR(255) NOT NULL,
			file_name VARCHAR(255) NOT NULL,
			storage_path VARCHAR(255),
			uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			processing_status TEXT DEFAULT 'pending',
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS document_chunks (
			id VARCHAR(255) PRIMARY KEY,
			document_id VARCHAR(255) NOT NULL,
			chunk_index INT NOT NULL,
			content TEXT NOT NULL,
			embedding JSONB,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
			UNIQUE (document_id, chunk_index)
		)`,
		`CREATE TABLE IF NOT EXISTS chat_history (
			id VARCHAR(255) PRIMARY KEY,
			document_id VARCHAR(255) NOT NULL,
			user_id VARCHAR(255) NOT NULL,
			message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'ai')),
			message_content TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id)`,
		`CREATE INDEX IF NOT EXISTS idx_chat_history_document_id ON chat_history(document_id)`,
		`CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id)`,
		// Migration to allow NULL storage_path for existing tables
		`ALTER TABLE documents ALTER COLUMN storage_path DROP NOT NULL`,
	}

	fmt.Println("Starting database migrations...")

	// Run each migration
	for i, migration := range migrations {
		fmt.Printf("Running migration %d/%d...\n", i+1, len(migrations))
		if _, err := db.Exec(migration); err != nil {
			fmt.Printf("Failed migration %d: %s\n", i+1, migration)
			return fmt.Errorf("error executing migration %d: %w", i+1, err)
		}
	}

	fmt.Println("Database migrations completed successfully")

	// Test a simple query to ensure the database is working properly
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		fmt.Printf("Warning: Database test query failed: %v\n", err)
	} else {
		fmt.Printf("Database test successful. Users table has %d rows.\n", count)
	}

	return nil
}
