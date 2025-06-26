"use client"

import type React from "react"

import { useState } from "react"
import { apiClient, type Document } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Trash2,
  MoreVertical,
  Calendar,
  Zap,
  Sparkles,
  ArrowRight,
  Upload,
  Brain,
  GitCompare,
  CheckSquare,
  Square,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DocumentEmptyState } from "./DocumentEmptyState"

interface DocumentListProps {
  documents: Document[]
  selectedDocument: Document | null
  onSelectDocument: (document: Document) => void
  onDocumentDeleted: () => void
  onCompareDocuments?: (documentIds: string[]) => void
}

export function DocumentList({
  documents,
  selectedDocument,
  onSelectDocument,
  onDocumentDeleted,
  onCompareDocuments,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set())
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set()) // 2. Bulk Selection

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "FILE"
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    return ext === "pdf" ? "📄" : "📝"
  }

  const handleToggleComparison = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()


    const newSelection = new Set(selectedForComparison)
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId)
    } else {
      newSelection.add(documentId)
    }

    setSelectedForComparison(newSelection)
  }

  const handleStartComparison = () => {
    setIsComparisonMode(true)
    setSelectedForComparison(new Set())
  }

  const handleCancelComparison = () => {
    setIsComparisonMode(false)
    setSelectedForComparison(new Set())
  }

  const handleCompare = () => {
    if (onCompareDocuments && selectedForComparison.size >= 2) {
      onCompareDocuments(Array.from(selectedForComparison))
      setIsComparisonMode(false)
      setSelectedForComparison(new Set())
    }
  }

  // 2. Bulk Selection Handlers
  const toggleSelectDocument = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelection = new Set(selectedDocuments)
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId)
    } else {
      newSelection.add(documentId)
    }
    setSelectedDocuments(newSelection)
  }

  const isDocumentSelected = (documentId: string) => {
    return selectedDocuments.has(documentId)
  }

  // 2. Bulk Actions (Example: Delete Selected)
  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedDocuments.size} documents?`)) {
      return
    }

    try {
      for (const documentId of selectedDocuments) {
        setDeletingId(documentId)
        await apiClient.deleteDocument(documentId)
      }
      onDocumentDeleted()
      setSelectedDocuments(new Set()) // Clear selection after deletion
    } catch (error: any) {
      alert(`Failed to delete documents: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (documents?.length === 0) {
    return (
      <div className="relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 animate-pulse" />

        <div className="relative text-center py-16 px-6">
          {/* Floating icons animation */}
          <div className="relative mb-8">
            <div className="absolute -top-4 -left-4 animate-bounce delay-100">
              <Sparkles className="h-6 w-6 text-blue-400" />
            </div>
            <div className="absolute -top-2 -right-6 animate-bounce delay-300">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div className="absolute -bottom-2 left-2 animate-bounce delay-500">
              <Zap className="h-4 w-4 text-pink-400" />
            </div>

            <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center">
              <Upload className="h-10 w-10 text-blue-600 animate-pulse" />
            </div>
          </div>

          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Ready for Intelligence
          </h3>
          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
            Upload your first business document to unlock AI-powered strategic insights and intelligent analysis.
          </p>

          {/* Animated call-to-action */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium animate-pulse">
            <Sparkles className="h-4 w-4" />
            Start Your Journey
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 w-full">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">{documents?.length || 0} Documents</h3>
        </div>
        <div className="flex items-center gap-3">
          {!isComparisonMode ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Brain className="h-4 w-4" />
                AI Ready
              </div>
              {onCompareDocuments && documents?.length >= 2 && (
                <Button variant="outline" size="sm" onClick={handleStartComparison} className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4" />
                  Compare
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelComparison}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCompare}
                disabled={selectedForComparison.size < 2}
                className="flex items-center gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare {selectedForComparison.size} Documents
              </Button>
            </div>
          )}
          {/* 2. Bulk Delete Button */}
          {selectedDocuments.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deletingId !== null}>
              Delete Selected ({selectedDocuments.size})
            </Button>
          )}
        </div>
      </div>

      {!documents ? (
        <DocumentEmptyState />
      ) : (
        documents?.map((document, index) => {
          const isSelected = selectedDocument?.id === document.id
          const isHovered = hoveredId === document.id
          const isDeleting = deletingId === document.id
          const isSelectedForComparison = selectedForComparison.has(document.id)
          const isBulkSelected = isDocumentSelected(document.id) // 2. Check if document is bulk selected

          return (
            <div
              key={document.id}
              className={`group relative transform transition-all duration-300 ease-out ${
                isSelected ? "scale-[1.02] shadow-lg shadow-blue-500/20" : "hover:scale-[1.01] hover:shadow-md"
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: "slideInUp 0.5s ease-out forwards",
              }}
              onMouseEnter={() => setHoveredId(document.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Animated border gradient */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-r transition-opacity duration-300 ${
                  isSelected
                    ? "from-blue-500 via-purple-500 to-pink-500 opacity-100"
                    : "from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-50"
                }`}
                style={{ padding: "2px" }}
              >
                <div className="h-full w-full rounded-xl bg-white" />
              </div>

              <div
                className={`relative p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                  isComparisonMode && isSelectedForComparison
                    ? "bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200"
                    : isSelected
                      ? "bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-transparent"
                      : "bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                }`}
                onClick={(e) => {
                  if (isComparisonMode) {
                    handleToggleComparison(document.id, e)
                  } else {
                    onSelectDocument(document)
                  }
                }}
              >
                {/* Content */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      {/* Comparison checkbox */}
                      {isComparisonMode && (
                        <button
                          onClick={(e) => handleToggleComparison(document.id, e)}
                          className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 ${
                            isSelectedForComparison
                              ? "text-purple-600 hover:text-purple-700 bg-purple-50"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                          type="button"
                        >
                          {isSelectedForComparison ? (
                            <CheckSquare className="h-6 w-6" />
                          ) : (
                            <Square className="h-6 w-6" />
                          )}
                        </button>
                      )}

                      {/* File icon with animation */}
                      <div
                        className={`relative transition-all duration-300 ${
                          isSelected ? "scale-110" : "group-hover:scale-105"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all duration-300 ${
                            isSelected
                              ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg"
                              : "bg-gray-100 group-hover:bg-blue-100"
                          }`}
                        >
                          {getFileIcon(document.file_name)}
                        </div>

                        {/* File type badge */}
                        <div
                          className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold rounded transition-all duration-300 ${
                            isSelected ? "bg-white text-blue-600 shadow-sm" : "bg-blue-600 text-white"
                          }`}
                        >
                          {getFileExtension(document.file_name)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold truncate transition-colors duration-300 ${
                            isSelected ? "text-blue-900" : "text-gray-900 group-hover:text-blue-700"
                          }`}
                        >
                          {document.file_name}
                        </h3>

                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(document.uploaded_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected state indicator */}
                    {isSelected && !isComparisonMode && (
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 animate-pulse">
                        <Sparkles className="h-4 w-4" />
                        Ready for analysis
                      </div>
                    )}

                    {/* Comparison state indicator */}
                    {isComparisonMode && isSelectedForComparison && (
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-700 animate-pulse">
                        <GitCompare className="h-4 w-4" />
                        Selected for comparison
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div
                  className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 transition-opacity duration-300 ${
                    isHovered && !isSelected ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            </div>
          )
        })
      )}

      <style jsx>{`
        @keyframes slideInUp {
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
