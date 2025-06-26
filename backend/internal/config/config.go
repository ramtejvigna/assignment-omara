package config

import (
	"bufio"    // Reads .env line by line
	"context"
	"os"
	"strings"  // Used for string manipulation

	firebase "firebase.google.com/go/v4"    // Official firebase go SDK
	"google.golang.org/api/option"          // Used for setting up firebase options
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
	// Set up firebase options with credentials file
	opt := option.WithCredentialsFile(credentialsPath)
	config := &firebase.Config{
		ProjectID: getEnv("FIREBASE_PROJECT_ID", ""),
	}

	// Initialize firebase app with credentials
	app, err := firebase.NewApp(context.Background(), config, opt)
	if err != nil {
		return nil, err
	}

	// Return the initialized firebase app
	return app, nil
}
