package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	gorilla "github.com/gorilla/handlers" // To handle CORS
	"github.com/gorilla/mux"              // To define endpoints. (Routing)
	_ "github.com/lib/pq"                 // PostgreSQL driver

	"strategy-analyst/internal/config"
	"strategy-analyst/internal/database"
	"strategy-analyst/internal/handlers"
	"strategy-analyst/internal/middleware"
	"strategy-analyst/internal/services"
)

func main() {
	// Load environment configuration
	cfg := config.Load()

	// Initialize Firebase
	firebaseApp, err := config.InitFirebase(cfg.FirebaseCredentialsPath)
	if err != nil {
		log.Fatalf("Error initializing Firebase: %v", err)
	}

	// Initialize Firebase Auth client
	authClient, err := firebaseApp.Auth(context.Background())
	if err != nil {
		log.Fatalf("Error initializing Firebase Auth: %v", err)
	}

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer db.Close()

	// Run database migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Error running migrations: %v", err)
	}

	// Initialize services - Cloud Storage Only
	storageService := services.NewStorageService(cfg.GCSBucket)
	// if !storageService.IsInitialized() {
	// 	log.Println("WARNING: Google Cloud Storage is not properly configured")
	// 	log.Println("Please ensure:")
	// 	log.Println("1. GCS_BUCKET environment variable is set")
	// 	log.Println("2. GOOGLE_APPLICATION_CREDENTIALS is set or you're running in a GCP environment")
	// 	log.Println("3. The service account has proper permissions")
	// 	log.Println("4. The bucket exists and is accessible")
	// 	log.Fatalf("Google Cloud Storage is required but not properly configured. Please set up GCS credentials and bucket.")
	// }

	// log.Printf("Successfully initialized Google Cloud Storage with bucket: %s", cfg.GCSBucket)

	documentService := services.NewDocumentService(db, storageService)
	aiService := services.NewAIService(cfg.GeminiAPIKey)
	chatService := services.NewChatService(db, documentService, aiService)

	// Initialize handlers
	h := handlers.New(db, authClient, documentService, chatService)

	// Setup routes
	router := mux.NewRouter()

	// Public routes
	router.HandleFunc("/api/health", h.HealthCheck).Methods("GET")

	// Protected routes
	api := router.PathPrefix("/api").Subrouter()
	api.Use(middleware.AuthMiddleware(authClient))
	api.Use(middleware.CORSMiddleware())
	// api.Use(middleware.RequestLoggerMiddleware)

	// User routes
	api.HandleFunc("/user/profile", h.GetUserProfile).Methods("GET")

	// Document routes
	api.HandleFunc("/documents", h.GetDocuments).Methods("GET")
	api.HandleFunc("/documents", h.UploadDocument).Methods("POST")
	api.HandleFunc("/documents/{id}", h.GetDocument).Methods("GET")
	api.HandleFunc("/documents/{id}", h.DeleteDocument).Methods("DELETE")
	api.HandleFunc("/documents/{id}/status", h.GetDocumentStatus).Methods("GET")
	api.HandleFunc("/documents/{id}/reprocess", h.ReprocessDocument).Methods("POST")
	api.HandleFunc("/documents/compare", h.CompareDocuments).Methods("POST")

	// Chat routes
	api.HandleFunc("/documents/{id}/chat", h.GetChatHistory).Methods("GET")
	api.HandleFunc("/documents/{id}/chat", h.SendMessage).Methods("POST")

	// Setup CORS for public routes
	corsHandler := gorilla.CORS(
		gorilla.AllowedOrigins([]string{"http://localhost:3000", "https://assignment-omara.vercel.app"}),
		gorilla.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		gorilla.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"}),
		gorilla.AllowCredentials(),
	)(router)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Server starting on port %s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
