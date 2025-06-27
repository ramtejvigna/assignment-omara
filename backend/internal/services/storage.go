package services

import (
	"context" // Context for handling requests
	"fmt"     // Used for formatting strings
	"io"      // Used for reading and writing files
	"time"

	"cloud.google.com/go/storage" // Google Cloud Storage client
)

// StorageService struct to store bucket name and client
type StorageService struct {
	bucketName string
	client     *storage.Client
}

// NewStorageService function to create a new storage service
func NewStorageService(bucketName string) *StorageService {
	if bucketName == "" {
		fmt.Printf("Warning: GCS bucket name is empty, storage service will be disabled\n")
		return &StorageService{bucketName: bucketName, client: nil}
	}

	// Create context with timeout for initialization
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Try to initialize GCS client with default credentials (works in Cloud Run)
	client, err := storage.NewClient(ctx)
	if err != nil {
		fmt.Printf("Failed to initialize GCS client with default credentials: %v\n", err)
		fmt.Printf("This is expected in local development. In Cloud Run, make sure the service account has Storage permissions.\n")
		// Return a storage service with the bucket name and nil client
		return &StorageService{bucketName: bucketName, client: nil}
	}

	// Test bucket access
	bucket := client.Bucket(bucketName)
	_, err = bucket.Attrs(ctx)
	if err != nil {
		fmt.Printf("Warning: Cannot access GCS bucket '%s': %v\n", bucketName, err)
		fmt.Printf("Storage service will be disabled. Check bucket name and permissions.\n")
		client.Close()
		return &StorageService{bucketName: bucketName, client: nil}
	}

	fmt.Printf("Successfully initialized GCS client for bucket: %s\n", bucketName)
	// Return a storage service with the bucket name and client
	return &StorageService{
		bucketName: bucketName,
		client:     client,
	}
}

// UploadFile function to upload a file to the storage service
func (s *StorageService) UploadFile(ctx context.Context, fileName string, content io.Reader) (string, error) {
	if s.client == nil {
		return "", fmt.Errorf("storage client not initialized")
	}

	bucket := s.client.Bucket(s.bucketName)

	// Create unique filename with timestamp
	uniqueFileName := fmt.Sprintf("%d_%s", time.Now().Unix(), fileName)

	obj := bucket.Object(uniqueFileName)
	writer := obj.NewWriter(ctx)

	defer writer.Close()

	if _, err := io.Copy(writer, content); err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	return uniqueFileName, nil
}

func (s *StorageService) DownloadFile(ctx context.Context, fileName string) (io.ReadCloser, error) {
	if s.client == nil {
		return nil, fmt.Errorf("storage client not initialized")
	}

	bucket := s.client.Bucket(s.bucketName)
	obj := bucket.Object(fileName)

	reader, err := obj.NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	return reader, nil
}

func (s *StorageService) DeleteFile(ctx context.Context, fileName string) error {
	if s.client == nil {
		return fmt.Errorf("storage client not initialized")
	}

	bucket := s.client.Bucket(s.bucketName)
	obj := bucket.Object(fileName)

	if err := obj.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// IsInitialized checks if the GCS client is properly initialized
func (s *StorageService) IsInitialized() bool {
	return s.client != nil
}
