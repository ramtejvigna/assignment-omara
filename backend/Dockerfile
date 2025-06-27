# Build stage
FROM golang:1.24-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Create non-root user first
RUN adduser -D -s /bin/sh appuser

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Copy Firebase credentials
COPY --from=builder /app/firebase-credentials.json .

# Set proper permissions
RUN chmod +x main && chown appuser:appuser main firebase-credentials.json

USER appuser

# Expose port
EXPOSE 8080

# Set default PORT environment variable
ENV PORT=8080

# Run the application
CMD ["./main"] 