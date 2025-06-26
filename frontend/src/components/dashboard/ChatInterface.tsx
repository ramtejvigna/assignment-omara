"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { apiClient, type Document, type ChatMessage } from "@/lib/api"
import { formatDate, apiCallManager } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Bot,
  User,
  FileText,
  Lightbulb,
  Sparkles,
  Brain,
  Zap,
  TrendingUp,
  Target,
  Shield,
  Clock,
} from "lucide-react"
import { FormattedMessage } from "../Formatter"

interface ChatInterfaceProps {
  document: Document
}

export function ChatInterface({ document }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Add refs for cleanup and request management
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  // State for conversation history sidebar
  const [showHistory, setShowHistory] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([]) // Replace 'any' with your conversation history type

  // State for message threading and replies
  const [threads, setThreads] = useState<{ [messageId: string]: ChatMessage[] }>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  // State for AI confidence scores and source citations
  const [confidenceScores, setConfidenceScores] = useState<{ [messageId: string]: number }>({})
  const [sourceCitations, setSourceCitations] = useState<{ [messageId: string]: string[] }>({})

  // State for message reactions and bookmarks
  const [reactions, setReactions] = useState<{ [messageId: string]: string[] }>({})
  const [bookmarks, setBookmarks] = useState<string[]>([])

  // State for AI model selection
  const [selectedModel, setSelectedModel] = useState("default") // Default AI model
  const [modelConfig, setModelConfig] = useState<{ temperature?: number }>({}) // Configuration options for the model

  // State for message search and filtering
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])

  // Memoized functions to prevent unnecessary re-renders
  const loadChatHistory = useCallback(async () => {
    try {
      // Use API call manager to prevent duplicate calls
      const history = await apiCallManager.executeOnce(`getChatHistory-${document.id}`, () =>
        apiClient.getChatHistory(document.id),
      )
      setMessages(Array.isArray(history) ? history : [])
      setError(null) // Clear any previous errors

      // Load conversation history for the sidebar - mock data for now
      const conversationHistoryData: any[] = [] // Mock empty array since API method doesn't exist
      setConversationHistory(conversationHistoryData)
    } catch (error: any) {
      console.error("Failed to load chat history:", error)
      setError("Failed to load chat history")
      setMessages([])
    }
  }, [document.id])

  const checkDocumentStatus = useCallback(async () => {
    try {
      // Use API call manager to prevent duplicate calls
      const status = await apiCallManager.executeOnce(`getDocumentStatus-${document.id}`, () =>
        apiClient.getDocumentStatus(document.id),
      )
      setIsProcessing(status.status === "processing")

      // Only schedule next check if still processing and component is mounted
      if (status.status === "processing") {
        statusCheckInterval.current = setTimeout(() => {
          // Clear the API call manager cache for status checks to allow polling
          apiCallManager.clear(`getDocumentStatus-${document.id}`)
          checkDocumentStatus()
        }, 3000)
      }
    } catch (error: any) {
      console.error("Failed to check document status:", error)
    }
  }, [document.id])

  // Fixed: Combined useEffect with proper cleanup
  useEffect(() => {
    let mounted = true

    const initializeChat = async () => {
      if (mounted) {
        // Cancel any previous requests
        if (abortController.current) {
          abortController.current.abort()
        }
        abortController.current = new AbortController()

        // Reset states
        setError(null)
        setMessages([])
        setIsProcessing(false)

        // Load data
        await Promise.all([loadChatHistory(), checkDocumentStatus()])
      }
    }

    initializeChat()

    // Cleanup function
    return () => {
      mounted = false
      // Clear any ongoing status checks
      if (statusCheckInterval.current) {
        clearTimeout(statusCheckInterval.current)
        statusCheckInterval.current = null
      }
      // Cancel any ongoing requests
      if (abortController.current) {
        abortController.current.abort()
      }
      // Clear any pending API calls for this document
      apiCallManager.clear(`getChatHistory-${document.id}`)
      apiCallManager.clear(`getDocumentStatus-${document.id}`)
    }
  }, [document.id, loadChatHistory, checkDocumentStatus])

  // Separate useEffect for scrolling
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // useEffect for filtering messages based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = messages.filter((message) =>
        message.message_content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredMessages(filtered)
    } else {
      setFilteredMessages(messages)
    }
  }, [searchTerm, messages])

  const handleReprocess = async () => {
    if (reprocessing) return // Prevent duplicate calls

    try {
      setReprocessing(true)
      await apiClient.reprocessDocument(document.id)
      setError(null)

      // Check status after a delay
      setTimeout(() => {
        apiCallManager.clear(`getDocumentStatus-${document.id}`)
        checkDocumentStatus()
        setReprocessing(false)
      }, 2000)
    } catch (error: any) {
      setError("Failed to reprocess document")
      setReprocessing(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || reprocessing) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setError(null)
    setIsTyping(true)

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: "temp-" + Date.now(),
      document_id: document.id,
      user_id: "current",
      message_type: "user",
      message_content: userMessage,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), tempUserMessage])

    try {
      setLoading(true)
      const response = await apiClient.sendMessage(document.id, userMessage)

      // Simulate AI confidence score and source citations
      const aiConfidenceScore = Math.random() * 100
      const aiSourceCitations = ["Source 1", "Source 2"]

      // Store confidence score and source citations
      setConfidenceScores((prev) => ({ ...prev, ["ai-" + Date.now()]: aiConfidenceScore }))
      setSourceCitations((prev) => ({ ...prev, ["ai-" + Date.now()]: aiSourceCitations }))

      // Replace temp message and add AI response
      const aiMessage: ChatMessage = {
        id: "ai-" + Date.now(),
        document_id: document.id,
        user_id: "current",
        message_type: "ai",
        message_content: response.message,
        timestamp: response.timestamp,
      }

      // Reload chat history to get proper IDs from server
      // Clear the cache first to ensure fresh data
      apiCallManager.clear(`getChatHistory-${document.id}`)
      await loadChatHistory()
    } catch (error: any) {
      setError(error.message)
      // Check if it's a processing error and update state
      if (error.message.includes("still being processed")) {
        setIsProcessing(true)
        // Clear cache and check status
        apiCallManager.clear(`getDocumentStatus-${document.id}`)
        checkDocumentStatus()
      }
      // Remove the temporary user message on error
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((msg) => msg.id !== tempUserMessage.id))
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const suggestedQuestions = [
    {
      icon: TrendingUp,
      text: "Summarize the key strategic initiatives mentioned in this document.",
      category: "Strategy",
    },
    {
      icon: Target,
      text: "What are the main financial highlights?",
      category: "Finance",
    },
    {
      icon: Shield,
      text: "Identify any competitive advantages or disadvantages mentioned.",
      category: "Competition",
    },
    {
      icon: Zap,
      text: "What are the key risks and opportunities discussed?",
      category: "Analysis",
    },
  ]

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question)
  }

  // Function to handle message reactions
  const handleReactToMessage = (messageId: string, reaction: string) => {
    setReactions((prev) => {
      const currentReactions = prev[messageId] || []
      if (currentReactions.includes(reaction)) {
        return {
          ...prev,
          [messageId]: currentReactions.filter((r) => r !== reaction),
        }
      } else {
        return {
          ...prev,
          [messageId]: [...currentReactions, reaction],
        }
      }
    })
  }

  // Function to handle bookmarking messages
  const handleBookmarkMessage = (messageId: string) => {
    if (bookmarks.includes(messageId)) {
      setBookmarks(bookmarks.filter((id) => id !== messageId))
    } else {
      setBookmarks([...bookmarks, messageId])
    }
  }

  // Function to handle replying to a message
  const handleReplyToMessage = (messageId: string) => {
    setReplyingTo(messageId)
  }

  // Function to handle sending a reply
  const handleSendReply = async (parentMessageId: string, replyContent: string) => {
    // Implement logic to send the reply to the server and update the threads state
    // This is a placeholder for the actual implementation
    console.log(`Replying to ${parentMessageId} with: ${replyContent}`)
    setReplyingTo(null) // Clear the replyingTo state after sending the reply
  }

  // Function to handle exporting the conversation
  const handleExportConversation = async () => {
    try {
      // Implement logic to export the conversation to a file (e.g., JSON, TXT)
      // This is a placeholder for the actual implementation
      const conversationData = JSON.stringify(messages, null, 2)
      const blob = new Blob([conversationData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = "conversation.json"
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export conversation:", error)
      setError("Failed to export conversation")
    }
  }

  // Function to handle AI model selection
  const handleModelSelection = (model: string) => {
    setSelectedModel(model)
  }

  // Function to handle model configuration changes
  const handleModelConfigChange = (config: any) => {
    setModelConfig(config)
  }

  // Function to handle conversation analytics
  const handleConversationAnalytics = async () => {
    try {
      // Implement logic to fetch and display conversation analytics
      // This is a placeholder for the actual implementation - mock data since API method doesn't exist
      const analyticsData = { totalMessages: messages.length, userMessages: messages.filter(m => m.message_type === 'user').length }
      console.log("Conversation Analytics:", analyticsData)
    } catch (error) {
      console.error("Failed to fetch conversation analytics:", error)
      setError("Failed to fetch conversation analytics")
    }
  }

  return (
    <div className="h-full max-h-[700px] flex">
      {/* Conversation History Sidebar */}
      {showHistory && (
        <div className="w-64 bg-gray-100 border-r border-gray-200 p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Conversation History</h4>
          <ul>
            {conversationHistory.map((conversation) => (
              <li key={conversation.id} className="py-2 border-b border-gray-200">
                <button className="text-sm text-gray-700 hover:text-blue-600">
                  {conversation.title} {/* Replace 'title' with the appropriate property */}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Document Header */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 truncate max-w-xs">{document.file_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <span className="text-sm text-gray-500">{formatDate(document.uploaded_at)}</span>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      isProcessing ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {isProcessing ? "Processing..." : "AI Ready"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="text-sm text-yellow-700 font-medium">Document is being processed...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocess}
                disabled={reprocessing}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                {reprocessing ? "Reprocessing..." : "Retry Processing"}
              </Button>
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              This usually takes a few moments. You can try sending a message anyway, or click "Retry Processing" if
              it's taking too long.
            </p>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-6">
            {messages?.length === 0 && !loading && !isProcessing && (
              <div className="text-center py-8">
                {/* AI Avatar */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analysis Ready</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  I'm ready to analyze your document and provide strategic insights. Ask me anything about the content,
                  key points, or specific information you need.
                </p>

                {/* Suggested Questions */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Suggested Questions
                  </p>
                  {suggestedQuestions.map((suggestion, index) => {
                    const IconComponent = suggestion.icon
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(suggestion.text)}
                        className="group w-full text-left p-4 bg-white border border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300">
                            <IconComponent className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {suggestion.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 group-hover:text-blue-700 transition-colors">
                              {suggestion.text}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {(searchTerm ? filteredMessages : messages)?.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.message_type === "user" ? "justify-end" : "justify-start"}`}
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`,
                }}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm transition-all duration-300 hover:shadow-md ${
                    message.message_type === "user"
                      ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.message_type === "user"
                          ? "bg-white/20"
                          : "bg-gradient-to-br from-purple-500 to-pink-500"
                      }`}
                    >
                      {message.message_type === "user" ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="prose prose-sm max-w-none">
                        <div
                          className={`whitespace-pre-wrap ${
                            message.message_type === "user" ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {message.message_type === "ai" ? (
                            <FormattedMessage content={message.message_content} />
                          ) : (
                            message.message_content
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-xs mt-2 ${message.message_type === "user" ? "text-white/70" : "text-gray-500"}`}
                      >
                        {formatDate(message.timestamp)}
                      </p>

                      {/* AI Confidence Score and Source Citations */}
                      {message.message_type === "ai" && (
                        <div>
                          {confidenceScores[message.id] && (
                            <p className="text-xs text-gray-500 mt-1">
                              Confidence: {confidenceScores[message.id].toFixed(2)}%
                            </p>
                          )}
                          {sourceCitations[message.id] && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">Sources:</p>
                              <ul className="list-disc list-inside">
                                {sourceCitations[message.id].map((source, index) => (
                                  <li key={index} className="text-xs text-gray-500">
                                    {source}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-[85%] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <span className="ml-2 text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {error}
            </p>
          </div>
        )}

        {/* Input Area */}
        <div className="relative">
          <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isProcessing
                  ? "Document is being processed..."
                  : reprocessing
                    ? "Reprocessing document..."
                    : "Ask about strategic insights, key points, or specific information..."
              }
              disabled={loading || reprocessing}
              className="flex-1 border-0 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || loading || reprocessing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading || reprocessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
