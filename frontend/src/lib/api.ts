import { auth } from './firebase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

class ApiClient {
    private async getAuthToken(): Promise<string | null> {
        const user = auth.currentUser
        if (!user) return null

        try {
            const token = await user.getIdToken()
            return token
        } catch (error) {
            console.error('Error getting auth token:', error)
            return null
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = await this.getAuthToken()

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        }

        if (token) {
            (headers as Record<string, string>).Authorization = `Bearer ${token}`
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || `HTTP error! status: ${response.status}`)
        }

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
            return response.json()
        }

        return response.text() as unknown as T
    }

    // Health check
    async healthCheck(): Promise<{ status: string }> {
        return this.request('/api/health')
    }

    // User endpoints
    async getUserProfile(): Promise<UserProfile> {
        return this.request('/api/user/profile')
    }

    // Document endpoints
    async getDocuments(): Promise<Document[]> {
        return this.request('/api/documents')
    }

    async uploadDocument(file: File): Promise<UploadResponse> {
        const token = await this.getAuthToken()

        const formData = new FormData()
        formData.append('document', file)

        const headers: HeadersInit = {}
        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(`${API_BASE_URL}/api/documents`, {
            method: 'POST',
            headers,
            body: formData,
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || `HTTP error! status: ${response.status}`)
        }

        return response.json()
    }

    async getDocument(id: string): Promise<Document> {
        return this.request(`/api/documents/${id}`)
    }

    async deleteDocument(id: string): Promise<void> {
        return this.request(`/api/documents/${id}`, {
            method: 'DELETE',
        })
    }

    // Chat endpoints
    async getChatHistory(documentId: string): Promise<ChatMessage[]> {
        return this.request(`/api/documents/${documentId}/chat`)
    }

    async sendMessage(documentId: string, message: string): Promise<ChatResponse> {
        return this.request(`/api/documents/${documentId}/chat`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        })
    }

    async getDocumentStatus(documentId: string): Promise<DocumentStatus> {
        return this.request(`/api/documents/${documentId}/status`)
    }

    async reprocessDocument(documentId: string): Promise<{ message: string }> {
        return this.request(`/api/documents/${documentId}/reprocess`, {
            method: 'POST',
        })
    }

    // Document comparison
    async compareDocuments(documentIds: string[], compareType?: string): Promise<CompareDocumentsResponse> {
        return this.request('/api/documents/compare', {
            method: 'POST',
            body: JSON.stringify({
                document_ids: documentIds,
                compare_type: compareType || 'summary'
            }),
        })
    }
}

export const apiClient = new ApiClient()

// Type definitions
export interface UserProfile {
    id: string
    email: string
    created_at: string
}

export interface Document {
    id: string
    user_id: string
    file_name: string
    storage_path: string | null
    uploaded_at: string | null
}

export interface UploadResponse {
    document_id: string
    message: string
}

export interface ChatMessage {
    id: string
    document_id: string
    user_id: string
    message_type: 'user' | 'ai'
    message_content: string
    timestamp: string
}

export interface ChatResponse {
    message: string
    timestamp: string
}

export interface DocumentStatus {
    status: 'processing' | 'ready'
    chunks_count: number
    ready_for_chat: boolean
}

export interface CompareDocumentsResponse {
    comparison: DocumentComparison
    message: string
}

export interface DocumentComparison {
    documents: Document[]
    summary: string
    similarities: string[]
    differences: string[]
    key_themes: string[]
    insights: string[]
    compared_at: string
} 