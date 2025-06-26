# Strategic Insight Analyst - Frontend

This is the Next.js frontend for the Strategic Insight Analyst application, built with modern React, TypeScript, and ShadCN UI components.

## Features

- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Authentication**: Firebase Authentication integration
- **Document Management**: Upload and manage business documents
- **AI Chat Interface**: Interactive chat for document analysis
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Live document processing status and chat updates

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI (Radix UI primitives)
- **State Management**: Zustand
- **Authentication**: Firebase Auth
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Setup

### Prerequisites

1. **Node.js 18+**
2. **Firebase Project** with Authentication enabled

### Environment Variables

Create a `.env.local` file with the following variables:

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

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication with Email/Password provider
3. Get your web app configuration from Project Settings
4. Add the configuration values to your `.env.local` file

### Installation and Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:3000

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main page
├── components/         # React components
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard and document management
│   └── ui/            # Reusable UI components (ShadCN)
├── lib/               # Utility libraries
│   ├── api.ts         # API client
│   ├── firebase.ts    # Firebase configuration
│   └── utils.ts       # Utility functions
└── store/             # State management
    └── auth.ts        # Authentication store
```

## Key Components

### Authentication
- **AuthForm**: Handles login and signup with validation
- **useAuthStore**: Zustand store for authentication state

### Dashboard
- **Dashboard**: Main application interface
- **DocumentList**: Display and manage uploaded documents
- **DocumentUpload**: File upload with drag-and-drop support
- **ChatInterface**: AI-powered document analysis chat

### UI Components
- Built with ShadCN UI for consistency and accessibility
- Fully customizable with Tailwind CSS
- Responsive design patterns

## Features

### Document Upload
- Drag-and-drop file upload
- Support for PDF and TXT files
- File size validation (32MB max)
- Real-time upload progress

### AI Chat Interface
- Interactive chat with document-specific AI
- Suggested questions for strategic analysis
- Real-time typing indicators
- Chat history persistence
- Markdown-formatted responses

### User Experience
- Responsive design for all screen sizes
- Loading states and error handling
- Smooth animations and transitions
- Accessible UI components

## API Integration

The frontend communicates with the Go backend through a REST API:

- **Authentication**: JWT tokens from Firebase
- **Document Management**: CRUD operations for documents
- **Chat**: Real-time AI analysis and chat history

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deployment

The application can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Docker** containers

### Environment Variables for Production

Make sure to set all required environment variables in your deployment platform:

1. Firebase configuration variables
2. Backend API URL (production backend)
3. Any additional platform-specific variables

## Development Tips

### Adding New Components

1. Use ShadCN CLI to add new UI components:
   ```bash
   npx shadcn-ui@latest add [component-name]
   ```

2. Follow the existing patterns for component structure

### State Management

- Use Zustand for global state (authentication, etc.)
- Use React's built-in state for component-specific state
- Consider React Query for server state if needed

### Styling

- Use Tailwind CSS utility classes
- Follow the design system defined in the CSS variables
- Use the `cn()` utility for conditional classes

## Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**
   - Check if all Firebase config variables are set correctly
   - Ensure the domain is authorized in Firebase console

2. **API Connection Issues**
   - Verify the backend server is running
   - Check if CORS is properly configured
   - Confirm the API URL is correct

3. **Build Errors**
   - Clear `.next` directory and rebuild
   - Check for TypeScript errors
   - Ensure all dependencies are installed

### Performance Optimization

- Images are optimized with Next.js Image component
- Components are lazy-loaded where appropriate
- Bundle analysis available with `npm run analyze`
