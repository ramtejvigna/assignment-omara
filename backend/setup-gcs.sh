#!/bin/bash

echo "🚀 Google Cloud Storage Setup for Strategy Analyst"
echo "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID from user
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID cannot be empty"
    exit 1
fi

echo "🔧 Setting up project: $PROJECT_ID"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable storage.googleapis.com
gcloud services enable firebase.googleapis.com

# Create unique bucket name
BUCKET_NAME="strategy-analyst-docs-$(date +%s)"
echo "🪣 Creating storage bucket: $BUCKET_NAME"

# Create bucket
gcloud storage buckets create gs://$BUCKET_NAME --location=us-central1

# Create service account
echo "👤 Creating service account..."
gcloud iam service-accounts create strategy-analyst-sa --display-name="Strategy Analyst Service Account"

# Grant permissions
echo "🔐 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:strategy-analyst-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create service account key
echo "🔑 Creating service account key..."
gcloud iam service-accounts keys create ./gcs-service-account.json \
    --iam-account=strategy-analyst-sa@$PROJECT_ID.iam.gserviceaccount.com


echo "🪣 Your GCS bucket: $BUCKET_NAME"
echo "🔑 Service account key: ./gcs-service-account.json"
echo "" 