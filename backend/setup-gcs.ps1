# Google Cloud Storage Setup for Strategy Analyst (Windows PowerShell)

Write-Host "🚀 Google Cloud Storage Setup for Strategy Analyst" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Google Cloud SDK is not installed." -ForegroundColor Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Get project ID from user
$PROJECT_ID = Read-Host "Enter your Google Cloud Project ID"
if ([string]::IsNullOrEmpty($PROJECT_ID)) {
    Write-Host "❌ Project ID cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Setting up project: $PROJECT_ID" -ForegroundColor Blue

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "🔌 Enabling required APIs..." -ForegroundColor Blue
gcloud services enable storage.googleapis.com
gcloud services enable firebase.googleapis.com

# Create unique bucket name
$BUCKET_NAME = "strategy-analyst-docs-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Host "🪣 Creating storage bucket: $BUCKET_NAME" -ForegroundColor Blue

# Create bucket
gcloud storage buckets create "gs://$BUCKET_NAME" --location=us-central1

# Create service account
Write-Host "👤 Creating service account..." -ForegroundColor Blue
gcloud iam service-accounts create strategy-analyst-sa --display-name="Strategy Analyst Service Account"

# Grant permissions
Write-Host "🔐 Granting permissions..." -ForegroundColor Blue
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:strategy-analyst-sa@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.admin"

# Create service account key
Write-Host "🔑 Creating service account key..." -ForegroundColor Blue
gcloud iam service-accounts keys create "./gcs-service-account.json" --iam-account="strategy-analyst-sa@$PROJECT_ID.iam.gserviceaccount.com"

# Create .env file
Write-Host "📝 Creating .env file..." -ForegroundColor Blue
$envContent = @"
# Database Configuration
DATABASE_URL=postgres://username:password@localhost:5432/database?sslmode=disable

# Google Cloud Storage Configuration
GCS_BUCKET=$BUCKET_NAME
GOOGLE_APPLICATION_CREDENTIALS=./gcs-service-account.json

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=$PROJECT_ID
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# Server Configuration
PORT=8080
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host ""
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Update DATABASE_URL in .env with your PostgreSQL connection string" -ForegroundColor White
Write-Host "2. Add your GEMINI_API_KEY to .env" -ForegroundColor White
Write-Host "3. Ensure your firebase-credentials.json is in place" -ForegroundColor White
Write-Host "4. Run: go run main.go" -ForegroundColor White
Write-Host ""
Write-Host "🪣 Your GCS bucket: $BUCKET_NAME" -ForegroundColor Cyan
Write-Host "🔑 Service account key: ./gcs-service-account.json" -ForegroundColor Cyan
Write-Host "" 