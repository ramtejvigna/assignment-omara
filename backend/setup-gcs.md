# Google Cloud Storage Setup Guide

## Prerequisites
1. Google Cloud Platform account
2. Google Cloud SDK installed
3. Billing enabled on your GCP project

## Step 1: Create a Google Cloud Project
```bash
# Install Google Cloud SDK first if you haven't
# https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create your-project-id --name="Strategy Analyst"

# Set the project as default
gcloud config set project your-project-id
```

## Step 2: Enable Required APIs
```bash
# Enable Cloud Storage API
gcloud services enable storage.googleapis.com

# Enable Firebase Authentication API
gcloud services enable firebase.googleapis.com
```

## Step 3: Create a Storage Bucket
```bash
# Create a globally unique bucket name
export BUCKET_NAME="strategy-analyst-docs-$(date +%s)"

# Create the bucket
gcloud storage buckets create gs://$BUCKET_NAME --location=us-central1

# Set bucket permissions (optional - for production use more restrictive)
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
    --member="allUsers" \
    --role="roles/storage.objectViewer"
```

## Step 4: Create Service Account
```bash
# Create service account
gcloud iam service-accounts create strategy-analyst-sa \
    --display-name="Strategy Analyst Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:strategy-analyst-sa@your-project-id.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create ./gcs-service-account.json \
    --iam-account=strategy-analyst-sa@your-project-id.iam.gserviceaccount.com
```

## Step 5: Configure Environment Variables
Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=your_postgres_connection_string

# Google Cloud Storage Configuration
GCS_BUCKET=your-bucket-name-here
GOOGLE_APPLICATION_CREDENTIALS=./gcs-service-account.json

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# Server Configuration
PORT=8080
```

## Step 6: Test the Setup
```bash
# Build and run the application
go build -o main.exe .
./main.exe

# You should see:
# "Successfully initialized GCS client for bucket: your-bucket-name"
```

## Security Notes
- Keep your service account key file secure
- Use IAM roles with minimal required permissions
- Consider using Workload Identity in production
- Enable bucket versioning and lifecycle policies

## Troubleshooting
- Ensure billing is enabled on your GCP project
- Check that the service account has the correct permissions
- Verify the bucket name is globally unique
- Make sure the credentials file path is correct in the environment variables 