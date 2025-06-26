"use client"

import type React from "react"

import { useState, useRef } from "react"
import { apiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, type File, X, CheckCircle, Zap, Sparkles, Brain, Shield, FileText } from "lucide-react"

interface DocumentUploadProps {
  onSuccess: () => void
  onCancel: () => void
  onViewDocuments?: () => void
}

export function DocumentUpload({ onSuccess, onCancel, onViewDocuments }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [".pdf", ".txt"]
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

    if (!validTypes.includes(fileExtension)) {
      setError("Please select a PDF or TXT file.")
      return
    }

    // Validate file size (32MB max)
    const maxSize = 32 * 1024 * 1024
    if (file.size > maxSize) {
      setError("File size must be less than 32MB.")
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile || uploading) return // Prevent duplicate uploads

    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 200)

      await apiClient.uploadDocument(selectedFile)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setSuccess(true)

      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (error: any) {
      setError(error.message || "Failed to upload document")
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const event = { target: { files } } as any
      handleFileSelect(event)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    return ext === "pdf" ? "📄" : "📝"
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-8 text-center">
          {/* Success Animation */}
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-green-900 mb-3">Upload Successful! 🎉</h3>
          <p className="text-green-700 mb-4">Your document is being processed by our AI engine.</p>

          {/* Processing Steps */}
          <div className="space-y-2 text-sm text-green-600">
            <div className="flex items-center justify-center gap-2">
              <Brain className="h-4 w-4 animate-pulse" />
              <span>AI analysis in progress...</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure processing complete</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
        {onViewDocuments && (
          <Button variant="outline" onClick={onViewDocuments} className="text-sm">
            <FileText className="h-4 w-4 mr-2" />
            View Documents
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            {error}
          </p>
        </div>
      )}

      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? "border-blue-500 bg-blue-50 scale-[1.02]"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300" />

          <div className="relative">
            {/* Upload Icon with Animation */}
            <div className="relative mb-6">
              <div
                className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg transition-transform duration-300 ${
                  dragActive ? "scale-110" : "hover:scale-105"
                }`}
              >
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {dragActive ? "Drop your file here!" : "Upload Your Document"}
            </h3>
            <p className="text-gray-600 mb-6">Drag and drop your file here, or click to browse</p>

            {/* File Type Support */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border">
                <span className="text-lg">📄</span>
                <span className="text-sm font-medium text-gray-700">PDF</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border">
                <span className="text-lg">📝</span>
                <span className="text-sm font-medium text-gray-700">TXT</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Secure upload • Up to 32MB • AI-ready processing
            </p>
          </div>

          <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleFileSelect} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Preview */}
          <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-xl shadow-md">
                  {getFileIcon(selectedFile.name)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 truncate max-w-xs">{selectedFile.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</span>
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      <Zap className="h-3 w-3" />
                      Ready for AI
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm} className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium text-blue-600">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Brain className="h-4 w-4 animate-pulse" />
                <span>Preparing for AI analysis...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3">
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm} disabled={uploading}>
                Cancel
              </Button>
              {onViewDocuments && (
                <Button variant="outline" onClick={onViewDocuments} disabled={uploading}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
              )}
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Start AI Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
