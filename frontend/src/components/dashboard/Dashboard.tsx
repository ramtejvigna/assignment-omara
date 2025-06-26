"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth"
import { apiClient, type Document, type DocumentComparison } from "@/lib/api"
import { apiCallManager } from "@/lib/utils"
import { DocumentList } from "./DocumentList"
import { DocumentUpload } from "./DocumentUpload"
import { ChatInterface } from "./ChatInterface"
import { DocumentComparison as DocumentComparisonComponent } from "./DocumentComparison"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LogOut,
  Brain,
  FileText,
  Search,
  BarChart3,
  ChevronRight,
  Plus,
  Upload,
  RefreshCw,
  Eye,
} from "lucide-react"

export function Dashboard() {
  const { user, signOut } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [currentView, setCurrentView] = useState<"documents" | "chat" | "comparison">("documents")
  const [comparison, setComparison] = useState<DocumentComparison | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [filterBy, setFilterBy] = useState("all")
  const [commandOpen, setCommandOpen] = useState(false)

  // Fixed: Add proper dependency array and prevent duplicate calls
  useEffect(() => {
    let mounted = true

    const initializeDashboard = async () => {
      if (mounted) {
        await Promise.all([loadUserProfile(), loadDocuments()])
      }
    }

    initializeDashboard()

    // Cleanup function
    return () => {
      mounted = false
    }
  }, []) // Empty dependency array - only run once on mount

  // Command palette keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const loadUserProfile = async () => {
    try {
      await apiCallManager.executeOnce("getUserProfile", () => apiClient.getUserProfile())
    } catch (error: any) {
      console.error("Failed to load user profile:", error)
    }
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const docs = await apiCallManager.executeOnce("getDocuments", () => apiClient.getDocuments())
      setDocuments(docs)
    } catch (error: any) {
      console.error("Failed to load documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUploaded = () => {
    setShowUpload(false)
    loadDocuments()
  }

  const handleDocumentDeleted = () => {
    setSelectedDocument(null)
    loadDocuments()
  }

  const handleCompareDocuments = async (documentIds: string[]) => {
    try {
      const result = await apiClient.compareDocuments(documentIds, "summary")
      setComparison(result.comparison)
      setCurrentView("comparison")
    } catch (error: any) {
      console.error("Failed to compare documents:", error)
      alert(`Failed to compare documents: ${error.message}`)
    }
  }

  const handleBackToDocuments = () => {
    setCurrentView("documents")
    setComparison(null)
    setSelectedDocument(null)
  }

  const handleSelectDocument = (document: Document) => {
    setSelectedDocument(document)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User"
  const userInitials = getUserInitials(displayName)

  // Calculate statistics
  const totalDocuments = documents?.length || 0
  const processingDocuments = 0 // Mock value since status doesn't exist on Document type
  const completedDocuments = totalDocuments - processingDocuments
  const insightsGenerated = totalDocuments * 3 // Mock calculation

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing Enterprise Dashboard</h2>
          <p className="text-gray-600 animate-pulse">Loading your intelligent workspace...</p>
          <div className="flex justify-center gap-1 mt-4">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload Document</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Documents">
            {documents?.slice(0, 5).map((doc) => (
              <CommandItem key={doc.id} onSelect={() => handleSelectDocument(doc)}>
                <FileText className="mr-2 h-4 w-4" />
                <span>{doc.file_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex h-16 items-center px-6">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold">Strategic Insight Analyst</h1>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 ml-8">
            <span className="text-sm text-gray-500">Dashboard</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">Documents</span>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents... (⌘K)"
                className="w-64 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setCommandOpen(true)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL || undefined} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2 p-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground mt-1">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content - No Sidebar */}
      <main className="overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDocuments}</div>
                <p className="text-xs text-muted-foreground">+{Math.floor(totalDocuments * 0.2)} from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processingDocuments}</div>
                <p className="text-xs text-muted-foreground">Documents in queue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Selected</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedDocument ? 1 : 0}</div>
                <p className="text-xs text-muted-foreground">{selectedDocument ? selectedDocument.file_name : "None selected"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area - Side by Side Layout */}
          {currentView === "comparison" ? (
            <DocumentComparisonComponent comparison={comparison} onBack={handleBackToDocuments} />
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Side - Document List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Document Library</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Recent</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="size">Size</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterBy} onValueChange={setFilterBy}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="txt">Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => setShowUpload(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsContent value={activeTab} className="mt-6">
                      {showUpload ? (
                        <DocumentUpload 
                          onSuccess={handleDocumentUploaded} 
                          onCancel={() => setShowUpload(false)}
                          onViewDocuments={() => setShowUpload(false)}
                        />
                      ) : (
                        <DocumentList
                          documents={documents}
                          selectedDocument={selectedDocument}
                          onSelectDocument={handleSelectDocument}
                          onDocumentDeleted={handleDocumentDeleted}
                          onCompareDocuments={handleCompareDocuments}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Right Side - Chat Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Chat Interface
                    {selectedDocument && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedDocument.file_name}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDocument ? (
                    <ChatInterface document={selectedDocument} key={selectedDocument.id} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                        <Brain className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Document</h3>
                      <p className="text-gray-600 max-w-sm">
                        Choose a document from the list to start chatting with AI about its contents and insights.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
