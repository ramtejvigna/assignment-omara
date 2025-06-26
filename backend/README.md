# Strategic Insight Analyst - Backend

This is the Go backend for the Strategic Insight Analyst application.

## Features

- **Firebase Authentication**: Secure user authentication with JWT token verification
- **Document Management**: Upload, store, and process PDF/TXT documents
- **AI-Powered Analysis**: Integration with Google Gemini for strategic insights
- **PostgreSQL Database**: Robust data storage with proper schema design
- **Google Cloud Storage**: Secure file storage for uploaded documents

## Setup

### Prerequisites

1. **Go 1.21+**
2. **PostgreSQL** (local or cloud instance)
3. **Google Cloud Storage** bucket
4. **Firebase Project** with Authentication enabled
5. **Google Gemini API** key

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgres://user:password@localhost/strategy_analyst?sslmode=disable

# Google Cloud Storage
GCS_BUCKET=strategy-analyst-documents

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=strategy-analyst
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# Server Configuration
PORT=8080
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication with Email/Password provider
3. Generate a service account key and save it as `firebase-credentials.json`
4. Update the `FIREBASE_PROJECT_ID` in your environment variables

### Google Cloud Setup

1. Create a Google Cloud Storage bucket
2. Set up authentication (service account or application default credentials)
3. Update the `GCS_BUCKET` name in your environment variables

### Gemini API Setup

1. Get an API key from Google AI Studio
2. Set the `GEMINI_API_KEY` environment variable

### Running the Server

```bash
# Install dependencies
go mod tidy

# Run the server
go run main.go
```

## Troubleshooting

### Common Issues

#### 1. SQL Parameter Mismatch Error
**Error**: `bind message supplies 2 parameters, but prepared statement "" requires 1`

**Causes**:
- Database connection issues
- Malformed SQL queries due to special characters in data
- Database schema migration failures

**Solutions**:
1. Check your `DATABASE_URL` format:
   ```
   postgres://username:password@host:port/database?sslmode=disable
   ```
2. Restart the application to re-run migrations
3. Check database logs for more details
4. Ensure the database user has proper permissions

#### 2. Storage Service Not Available
**Error**: `storage: object doesn't exist` or `storage service is not initialized`

**Causes**:
- Missing or incorrect GCS configuration
- Service account permissions issues
- Network connectivity problems

**Solutions**:
1. Verify environment variables:
   ```bash
   echo $GCS_BUCKET
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```
2. Check service account permissions (requires `Storage Admin` role)
3. Test GCS connectivity:
   ```bash
   gsutil ls gs://your-bucket-name
   ```
4. Run the GCS setup scripts in the project root

#### 3. Document Processing Failures
**Error**: `Failed to download file` or `No valid chunks found`

**Causes**:
- File upload to storage failed but database record was created
- PDF processing library issues
- Storage service unavailable during processing

**Solutions**:
1. Check storage service status
2. Use the reprocess endpoint: `POST /api/documents/{id}/reprocess`
3. Check document status: `GET /api/documents/{id}/status`
4. Verify file format is supported (PDF or TXT only)

#### 4. Firebase Authentication Issues
**Error**: `Invalid token` or `Authorization header required`

**Solutions**:
1. Verify `firebase-credentials.json` is present and valid
2. Check `FIREBASE_PROJECT_ID` matches your Firebase project
3. Ensure Firebase Authentication is enabled
4. Verify JWT token format: `Bearer <token>`

### Debug Mode

Enable debug logging by setting:
```bash
export LOG_LEVEL=DEBUG
```

### Health Check

Test if the service is running:
```bash
curl http://localhost:8080/api/health
```

### Database Connection Test

The application will test the database connection on startup and report any issues.

## API Endpoints

### Health Check
- `GET /api/health` - Check server health

### User Management
- `GET /api/user/profile` - Get user profile (authenticated)

### Document Management
- `GET /api/documents` - List user documents (authenticated)
- `POST /api/documents` - Upload document (authenticated)
- `GET /api/documents/{id}` - Get document details (authenticated)
- `DELETE /api/documents/{id}` - Delete document (authenticated)

### Chat/AI Analysis
- `GET /api/documents/{id}/chat` - Get chat history for document (authenticated)
- `POST /api/documents/{id}/chat` - Send message and get AI analysis (authenticated)

## Database Schema

The application uses PostgreSQL with the following tables:

- `users` - User information from Firebase
- `documents` - Document metadata
- `document_chunks` - Text chunks from processed documents
- `chat_history` - Chat messages and AI responses

## Architecture

The backend follows a clean architecture pattern:

- `main.go` - Application entry point
- `internal/config/` - Configuration management
- `internal/database/` - Database connection and migrations
- `internal/models/` - Data models
- `internal/middleware/` - HTTP middleware
- `internal/services/` - Business logic
- `internal/handlers/` - HTTP handlers

## Development

### Adding New Features

1. Define models in `internal/models/`
2. Add business logic to appropriate service in `internal/services/`
3. Create HTTP handlers in `internal/handlers/`
4. Register routes in `main.go`

### Testing

```bash
go test ./...
```

## Deployment

The application is designed to be deployed on cloud platforms like Google Cloud Run, AWS Lambda, or similar serverless platforms.

Make sure to:
1. Set all required environment variables
2. Ensure proper IAM permissions for GCS and Firebase
3. Configure database connection for production
4. Set up proper CORS origins for your frontend domain 