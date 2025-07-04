# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copy the binary from builder stage
COPY --from=builder --chown=appuser:appgroup /app/main .

# Ensure the binary is executable
RUN chmod +x main

# Drop privileges
USER appuser

# Cloud Run requires this port to be set via PORT env variable
ENV PORT=8080

# Important: Use exec form for proper signal handling
CMD ["./main"]