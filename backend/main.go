package main

import (
	"context"
	"database/sql"
	"encoding/json"
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
	var firebaseHealthy bool
	firebaseApp, err := config.InitFirebase(cfg.FirebaseCredentialsPath)
	if err != nil {
		log.Printf("WARNING: Firebase initialization failed: %v", err)
		log.Println("Starting server without Firebase authentication")
		firebaseHealthy = false
	} else {
		authClient, err = firebaseApp.Auth(context.Background())
		if err != nil {
			log.Printf("WARNING: Firebase Auth initialization failed: %v", err)
			firebaseHealthy = false
		} else {
			log.Println("Firebase authentication initialized successfully")
			firebaseHealthy = true
		}
	}

	// Initialize database with error handling
	var db *sql.DB
	var databaseHealthy bool
	if cfg.DatabaseURL != "" {
		db, err = database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Printf("WARNING: Database connection failed: %v", err)
			log.Println("Starting server without database")
			databaseHealthy = false
		} else {
			// Ensure database is closed when main exits
			defer func() {
				if db != nil {
					db.Close()
				}
			}()

			// Test database connection
			if err := db.Ping(); err != nil {
				log.Printf("WARNING: Database ping failed: %v", err)
				db.Close()
				db = nil
				databaseHealthy = false
			} else {
				// Run database migrations
				if err := database.Migrate(db); err != nil {
					log.Printf("WARNING: Database migration failed: %v", err)
					db.Close()
					db = nil
					databaseHealthy = false
				} else {
					log.Println("Database connected and migrated successfully")
					databaseHealthy = true
				}
			}
		}
	} else {
		log.Println("WARNING: DATABASE_URL not provided")
		databaseHealthy = false
	}

	// Initialize services with fallback behavior
	var storageService *services.StorageService
	var documentService *services.DocumentService
	var aiService *services.AIService
	var chatService *services.ChatService
	var storageHealthy, documentHealthy, aiHealthy, chatHealthy bool

	// Initialize storage service
	if cfg.GCSBucket != "" {
		storageService = services.NewStorageService(cfg.GCSBucket)
		if storageService != nil && storageService.IsInitialized() {
			log.Printf("Google Cloud Storage initialized with bucket: %s", cfg.GCSBucket)
			storageHealthy = true
		} else {
			log.Println("WARNING: GCS storage service failed to initialize")
			storageHealthy = false
		}
	} else {
		log.Println("WARNING: GCS_BUCKET not configured, file storage will not work")
		storageHealthy = false
	}

	// Initialize document service
	if db != nil && storageService != nil && databaseHealthy && storageHealthy {
		documentService = services.NewDocumentService(db, storageService)
		log.Println("Document service initialized successfully")
		documentHealthy = true
	} else {
		log.Println("WARNING: Document service not available (missing database or storage)")
		documentHealthy = false
	}

	// Initialize AI service
	if cfg.GeminiAPIKey != "" {
		aiService = services.NewAIService(cfg.GeminiAPIKey)
		log.Println("AI service initialized successfully")
		aiHealthy = true
	} else {
		log.Println("WARNING: GEMINI_API_KEY not configured, AI features will not work")
		aiHealthy = false
	}

	// Initialize chat service
	if db != nil && documentService != nil && aiService != nil && databaseHealthy && documentHealthy && aiHealthy {
		chatService = services.NewChatService(db, documentService, aiService)
		log.Println("Chat service initialized successfully")
		chatHealthy = true
	} else {
		log.Println("WARNING: Chat service not available (missing dependencies)")
		chatHealthy = false
	}

	// Initialize handlers - always create them but they will handle nil services gracefully
	h := handlers.New(db, authClient, documentService, chatService)

	// Setup routes
	router := mux.NewRouter()

	// Simple health check for load balancers and startup probes
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Add a startup-specific health check that always returns OK
	router.HandleFunc("/startup", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("READY"))
	}).Methods("GET")

	// Enhanced health check endpoint with service status
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		status := map[string]interface{}{
			"status": "OK",
			"services": map[string]bool{
				"firebase": firebaseHealthy,
				"database": databaseHealthy,
				"storage":  storageHealthy,
				"document": documentHealthy,
				"ai":       aiHealthy,
				"chat":     chatHealthy,
			},
		}

		// Return 503 only if NO services are working (complete failure)
		if !firebaseHealthy && !databaseHealthy && !storageHealthy && !aiHealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
			status["status"] = "CRITICAL"
		} else if !firebaseHealthy || !databaseHealthy {
			w.WriteHeader(http.StatusOK) // Still return 200 but mark as degraded
			status["status"] = "DEGRADED"
		} else {
			w.WriteHeader(http.StatusOK)
		}

		json.NewEncoder(w).Encode(status)
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
	log.Printf("Service Status - Firebase: %v, Database: %v, Storage: %v, Document: %v, AI: %v, Chat: %v",
		firebaseHealthy, databaseHealthy, storageHealthy, documentHealthy, aiHealthy, chatHealthy)

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
