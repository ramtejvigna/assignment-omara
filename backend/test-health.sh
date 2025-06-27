#!/bin/bash

echo "Testing local server health check..."

# Set basic environment variables for testing
export PORT=8080
export DATABASE_URL=""
export GCS_BUCKET=""
export GEMINI_API_KEY=""
export FIREBASE_PROJECT_ID=""
export FIREBASE_CREDENTIALS_PATH="firebase-credentials.json"

# Build the application
echo "Building application..."
go build -o main .

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Start the server in background
echo "Starting server..."
./main &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Test health check
echo "Testing health check..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Health check passed!"
    echo "Server is working correctly"
else
    echo "❌ Health check failed! Response code: $RESPONSE"
    echo "Server logs:"
    jobs -p | xargs ps -p
fi

# Kill the server
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

# Cleanup
rm -f main

echo "Test completed." 