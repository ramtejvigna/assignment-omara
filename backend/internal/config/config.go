package config

import (
	"bufio" // Reads .env line by line
	"context"
	"fmt"
	"os"
	"strings" // Used for string manipulation

	firebase "firebase.google.com/go/v4" // Official firebase go SDK
	"google.golang.org/api/option"       // Used for setting up firebase options
)

// Environment config structure to store configuration values
type Config struct {
	DatabaseURL             string
	GCSBucket               string
	GeminiAPIKey            string
	FirebaseCredentialsPath string
}

// Load function to load configuration from environment variables or .env file
func Load() *Config {
	// Load .env file if it exists
	loadEnvFile()

	return &Config{
		DatabaseURL:             getEnv("DATABASE_URL", ""),
		GCSBucket:               getEnv("GCS_BUCKET", ""),
		GeminiAPIKey:            getEnv("GEMINI_API_KEY", ""),
		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func loadEnvFile() {
	file, err := os.Open(".env")
	if err != nil {
		return // .env file doesn't exist
	}
	defer file.Close()

	// Initialize scanner to read .env file line by line
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split line into key and value
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			// Set environment variable into the system
			os.Setenv(key, value)
		}
	}
}

// Initialize Firebase app with credentials
func InitFirebase(credentialsPath string) (*firebase.App, error) {
	ctx := context.Background()

	// Check if we're in a local development environment with credentials file
	if credentialsPath != "" {
		if _, err := os.Stat(credentialsPath); err == nil {
			// File exists, use it
			opt := option.WithCredentialsFile(credentialsPath)
			config := &firebase.Config{
				ProjectID: getEnv("FIREBASE_PROJECT_ID", ""),
			}

			app, err := firebase.NewApp(ctx, config, opt)
			if err != nil {
				return nil, fmt.Errorf("failed to initialize Firebase with credentials file: %w", err)
			}
			return app, nil
		}
	}

	// Try to initialize with default credentials (Cloud Run environment)
	projectID := getEnv("FIREBASE_PROJECT_ID", "")
	if projectID == "" {
		return nil, fmt.Errorf("FIREBASE_PROJECT_ID environment variable is required")
	}

	config := &firebase.Config{
		ProjectID: projectID,
	}

	// Use default credentials (works in Cloud Run with proper service account)
	app, err := firebase.NewApp(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase with default credentials: %w", err)
	}

	return app, nil
}
