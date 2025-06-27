package main

import (
	"context"
	"database/sql"
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

	"firebase.google.com/go/v4/auth"
)

func main() {
	// Start server immediately to pass health checks
	log.Println("Starting server...")

	// Load environment configuration
	cfg := config.Load()

	// Initialize Firebase with error handling
	var authClient *auth.Client
	firebaseApp, err := config.InitFirebase(cfg.FirebaseCredentialsPath)
	if err != nil {
		log.Printf("WARNING: Firebase initialization failed: %v", err)
		log.Println("Starting server without Firebase authentication")
	} else {
		authClient, err = firebaseApp.Auth(context.Background())
		if err != nil {
			log.Printf("WARNING: Firebase Auth initialization failed: %v", err)
		} else {
			log.Println("Firebase authentication initialized successfully")
		}
	}

	// Initialize database with error handling
	var db *sql.DB
	if cfg.DatabaseURL != "" {
		db, err = database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Printf("WARNING: Database connection failed: %v", err)
			log.Println("Starting server without database")
		} else {
			defer db.Close()
			// Run database migrations
			if err := database.Migrate(db); err != nil {
				log.Printf("WARNING: Database migration failed: %v", err)
			} else {
				log.Println("Database connected and migrated successfully")
			}
		}
	} else {
		log.Println("WARNING: DATABASE_URL not provided")
	}

	// Initialize services with fallback behavior
	var storageService *services.StorageService
	var documentService *services.DocumentService
	var aiService *services.AIService
	var chatService *services.ChatService

	// Initialize storage service
	if cfg.GCSBucket != "" {
		storageService = services.NewStorageService(cfg.GCSBucket)
		log.Printf("Google Cloud Storage initialized with bucket: %s", cfg.GCSBucket)
	} else {
		log.Println("WARNING: GCS_BUCKET not configured, file storage will not work")
	}

	// Initialize document service
	if db != nil && storageService != nil {
		documentService = services.NewDocumentService(db, storageService)
		log.Println("Document service initialized successfully")
	} else {
		log.Println("WARNING: Document service not available (missing database or storage)")
	}

	// Initialize AI service
	if cfg.GeminiAPIKey != "" {
		aiService = services.NewAIService(cfg.GeminiAPIKey)
		log.Println("AI service initialized successfully")
	} else {
		log.Println("WARNING: GEMINI_API_KEY not configured, AI features will not work")
	}

	// Initialize chat service
	if db != nil && documentService != nil && aiService != nil {
		chatService = services.NewChatService(db, documentService, aiService)
		log.Println("Chat service initialized successfully")
	} else {
		log.Println("WARNING: Chat service not available (missing dependencies)")
	}

	// Initialize handlers
	h := handlers.New(db, authClient, documentService, chatService)

	// Setup routes
	router := mux.NewRouter()

	// Health check endpoint - always available
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Protected routes - only if auth is available
	if authClient != nil {
		api := router.PathPrefix("/api").Subrouter()
		api.Use(middleware.AuthMiddleware(authClient))
		api.Use(middleware.CORSMiddleware())

		// User routes
		api.HandleFunc("/user/profile", h.GetUserProfile).Methods("GET")

		// Document routes - only if document service is available
		if documentService != nil {
			api.HandleFunc("/documents", h.GetDocuments).Methods("GET")
			api.HandleFunc("/documents", h.UploadDocument).Methods("POST")
			api.HandleFunc("/documents/{id}", h.GetDocument).Methods("GET")
			api.HandleFunc("/documents/{id}", h.DeleteDocument).Methods("DELETE")
			api.HandleFunc("/documents/{id}/status", h.GetDocumentStatus).Methods("GET")
			api.HandleFunc("/documents/{id}/reprocess", h.ReprocessDocument).Methods("POST")
			api.HandleFunc("/documents/compare", h.CompareDocuments).Methods("POST")
		}

		// Chat routes - only if chat service is available
		if chatService != nil {
			api.HandleFunc("/documents/{id}/chat", h.GetChatHistory).Methods("GET")
			api.HandleFunc("/documents/{id}/chat", h.SendMessage).Methods("POST")
		}
	} else {
		log.Println("WARNING: API endpoints not available without authentication")
	}

	// Setup CORS for all routes
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
		Addr:         "0.0.0.0:" + port,
		Handler:      corsHandler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("Server starting on port %s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
