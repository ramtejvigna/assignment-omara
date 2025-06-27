# Deployment Guide: Docker Hub & Google Cloud Run

This guide will help you deploy your Strategy Analyst backend service to Docker Hub and Google Cloud Run.

## Prerequisites

1. **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Docker Hub Account** - Sign up at [hub.docker.com](https://hub.docker.com)
3. **Google Cloud Account** - Sign up at [cloud.google.com](https://cloud.google.com)
4. **Google Cloud CLI** - Install from [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install)

## Step 1: Prepare Your Environment

### 1.1 Update Configuration Files

Edit the following files and replace placeholder values:

**`deploy.sh` or `deploy.ps1`:**
```bash
DOCKER_USERNAME="your-actual-docker-username"
PROJECT_ID="your-actual-gcp-project-id"
```

**`cloudrun.yaml`:**
```yaml
image: docker.io/your-actual-docker-username/strategy-analyst-backend:latest
```

### 1.2 Login to Docker Hub

```bash
docker login
```

### 1.3 Login to Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Step 2: Set Up Environment Variables in Google Cloud

Create a secret in Google Secret Manager for your environment variables:

```bash
# Create secrets for sensitive data
gcloud secrets create backend-secrets --data-file=- <<EOF
DATABASE_URL=your_database_url
GCS_BUCKET=your_gcs_bucket_name
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
EOF
```

Or create them individually:

```bash
echo -n "your_database_url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your_gcs_bucket_name" | gcloud secrets create GCS_BUCKET --data-file=-
echo -n "your_gemini_api_key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your_firebase_project_id" | gcloud secrets create FIREBASE_PROJECT_ID --data-file=-
```

## Step 3: Build and Deploy

### Option A: Using Automated Script

**For Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**For Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy.ps1
```

### Option B: Manual Deployment

#### 3.1 Build Docker Image

```bash
cd backend
docker build -t your-docker-username/strategy-analyst-backend:latest .
```

#### 3.2 Push to Docker Hub

```bash
docker push your-docker-username/strategy-analyst-backend:latest
```

#### 3.3 Deploy to Cloud Run

```bash
gcloud run deploy strategy-analyst-backend \
    --image docker.io/your-docker-username/strategy-analyst-backend:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --set-env-vars "PORT=8080"
```

### Option C: Using Cloud Run Configuration File

```bash
gcloud run services replace cloudrun.yaml --region us-central1
```

## Step 4: Set Up IAM Permissions

Grant Cloud Run access to your secrets:

```bash
# Get the Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Grant Secret Manager access
gcloud secrets add-iam-policy-binding DATABASE_URL \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GCS_BUCKET \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding FIREBASE_PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

## Step 5: Configure Domain (Optional)

If you want to use a custom domain:

```bash
gcloud run domain-mappings create \
    --service strategy-analyst-backend \
    --domain your-domain.com \
    --region us-central1
```

## Step 6: Monitor Your Deployment

### Check Logs
```bash
gcloud run services logs read strategy-analyst-backend --region us-central1
```

### View Service Details
```bash
gcloud run services describe strategy-analyst-backend --region us-central1
```

### Test Health Check
```bash
curl https://your-service-url/api/health
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Ensure all dependencies are properly specified in `go.mod`
2. **Push Fails**: Check Docker Hub credentials with `docker login`
3. **Deploy Fails**: Verify GCP project ID and permissions
4. **Service Errors**: Check Cloud Run logs for detailed error messages

### Environment Variables

Make sure these environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `GCS_BUCKET`: Google Cloud Storage bucket name
- `GEMINI_API_KEY`: Google AI API key
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_CREDENTIALS_PATH`: Path to Firebase credentials file

### Updating the Service

To update your deployed service:

1. Make changes to your code
2. Rebuild and push the Docker image with a new tag
3. Update the Cloud Run service with the new image

```bash
# Build with version tag
docker build -t your-docker-username/strategy-analyst-backend:v1.1 .
docker push your-docker-username/strategy-analyst-backend:v1.1

# Update Cloud Run
gcloud run deploy strategy-analyst-backend \
    --image docker.io/your-docker-username/strategy-analyst-backend:v1.1 \
    --region us-central1
```

## Security Considerations

1. **Never commit credentials** to version control
2. **Use Google Secret Manager** for sensitive environment variables
3. **Enable HTTPS** (automatically handled by Cloud Run)
4. **Configure CORS** properly for your frontend domain
5. **Use IAM roles** with minimal required permissions

## Cost Optimization

1. **Set appropriate memory and CPU limits**
2. **Configure autoscaling** (min=0 for cost savings)
3. **Monitor usage** in Google Cloud Console
4. **Use appropriate regions** (closer to users = lower latency)

---

Your backend service should now be successfully deployed and accessible via the Cloud Run URL! 