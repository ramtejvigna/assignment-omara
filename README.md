# Strategic Insight Analyst

A full-stack application that leverages AI to extract, summarize, and analyze strategic insights from business documents. Upload PDF or text files and get intelligent analysis powered by Google Gemini AI.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure email/password login with Firebase
- **Document Management**: Upload, store, and manage PDF/TXT business documents
- **AI-Powered Analysis**: Interactive chat interface for strategic document insights
- **Document Processing**: Automatic text extraction and intelligent chunking
- **Real-time Chat**: Persistent chat history with document-specific AI conversations

### Technical Highlights
- **Full-Stack Architecture**: Go backend with Next.js frontend
- **Modern UI**: Beautiful, responsive interface built with ShadCN UI
- **Cloud Storage**: Google Cloud Storage for secure document storage
- **SQL Database**: PostgreSQL with proper schema design and indexing
- **Production Ready**: Comprehensive error handling and security features

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (Next.js)     │◄──►│   (Go)          │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React/TS      │    │ • HTTP Server   │    │ • Firebase Auth │
│ • ShadCN UI     │    │ • Document Proc │    │ • Google Gemini │
│ • Zustand       │    │ • AI Integration│    │ • Cloud Storage │
│ • Tailwind      │    │ • PostgreSQL    │    │ • PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Standard library with Gorilla Mux
- **Database**: PostgreSQL
- **Storage**: Google Cloud Storage
- **AI**: Google Gemini API
- **Authentication**: Firebase Admin SDK
- **PDF Processing**: pdfcpu library

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI (Radix UI)
- **State Management**: Zustand
- **Authentication**: Firebase Client SDK
- **Icons**: Lucide React

## 📦 Prerequisites

Before running the application, ensure you have:

1. **Go 1.21+** installed
2. **Node.js 18+** installed
3. **PostgreSQL** database (local or cloud)
4. **Firebase Project** with Authentication enabled
5. **Google Cloud Storage** bucket
6. **Google Gemini API** key

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd strategic-insight-analyst
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
go mod tidy

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (automatic on startup)
# Start the server
go run main.go
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase config

# Start development server
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## ⚙️ Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL=postgres://user:password@localhost/strategy_analyst?sslmode=disable

# Google Cloud Storage
GCS_BUCKET=strategy-analyst-documents

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase
FIREBASE_PROJECT_ID=strategy-analyst
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# Server
PORT=8080
```

### Frontend Environment Variables

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following structure:

```sql
-- Users from Firebase Authentication
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document metadata
CREATE TABLE documents (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Text chunks for AI processing
CREATE TABLE document_chunks (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE (document_id, chunk_index)
);

-- Chat history for AI interactions
CREATE TABLE chat_history (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'ai')),
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 📝 API Endpoints

### Authentication Required Routes

All API routes except `/api/health` require Firebase JWT authentication.

### Document Management
- `GET /api/documents` - List user documents
- `POST /api/documents` - Upload new document
- `GET /api/documents/{id}` - Get document details
- `DELETE /api/documents/{id}` - Delete document

### AI Chat
- `GET /api/documents/{id}/chat` - Get chat history
- `POST /api/documents/{id}/chat` - Send message and get AI response

### User Management
- `GET /api/user/profile` - Get user profile

## 🎯 Usage Examples

### Upload a Document
1. Sign in with your email and password
2. Click "Upload" in the documents panel
3. Drag and drop a PDF or TXT file
4. Wait for processing to complete

### Analyze Documents
1. Select a document from the list
2. Use the chat interface to ask questions:
   - "Summarize the key strategic initiatives"
   - "What are the main financial highlights?"
   - "Identify competitive advantages mentioned"

### Example AI Queries
```
"What are the key strategic initiatives mentioned in this annual report?"
"Summarize the financial performance from Q3 2024"
"What competitive advantages does the company highlight?"
"What are the main risks and opportunities discussed?"
```

## 🚀 Deployment

### Backend Deployment (Google Cloud Run)

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/strategy-analyst-backend
gcloud run deploy --image gcr.io/PROJECT_ID/strategy-analyst-backend --platform managed
```

### Frontend Deployment (Vercel)

```bash
# Deploy with Vercel CLI
vercel --prod
```

## 🧪 Development

### Backend Development

```bash
cd backend

# Run with hot reload
go run main.go

# Run tests
go test ./...

# Format code
go fmt ./...
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## 🔧 Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**
   - Verify Firebase configuration
   - Check if email/password auth is enabled
   - Ensure domains are authorized

2. **Document Upload Failures**
   - Check Google Cloud Storage permissions
   - Verify file size limits (32MB max)
   - Ensure supported file types (PDF, TXT)

3. **AI Analysis Issues**
   - Verify Gemini API key is valid
   - Check document processing status
   - Ensure document chunks are created

4. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check connection string format
   - Ensure database exists

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the documentation in `/backend/README.md` and `/frontend/README.md`
3. Open an issue on GitHub

---

Built with ❤️ using Go, Next.js, and AI technology. 