# Quick Setup Guide

## Resolving Dependency Issues

### Frontend Setup

The frontend is experiencing dependency conflicts due to React 19 compatibility. Here's how to fix it:

1. **Install with legacy peer deps** (recommended for quick setup):
```bash
cd frontend
npm install --legacy-peer-deps
```

2. **Or use alternative installation**:
```bash
cd frontend
npm install --force
```

3. **Or downgrade React** (if you prefer stable versions):
```bash
cd frontend
npm uninstall react react-dom @types/react @types/react-dom
npm install react@^18.2.0 react-dom@^18.2.0 @types/react@^18 @types/react-dom@^18
npm install
```

### Backend Setup

The backend requires Go modules to be properly downloaded:

```bash
cd backend
go mod tidy
go mod download
```

### Quick Start Commands

Once dependencies are resolved:

**Backend:**
```bash
cd backend
go run main.go
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Environment Setup

Don't forget to set up your environment variables:

1. Copy `.env.example` files in both directories
2. Fill in your Firebase, Google Cloud, and database credentials
3. Ensure PostgreSQL is running and accessible

### Common Solutions

- **Node version**: Use Node.js 18 or higher
- **Go version**: Use Go 1.21 or higher
- **Clear caches**: Run `npm cache clean --force` if issues persist
- **Delete node_modules**: Remove and reinstall if dependency conflicts persist 