"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { type DocumentComparison } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import {
    FileText, Eye, TrendingUp, Lightbulb, Clock,
    CheckCircle, XCircle, Sparkles, Brain, ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { FormattedMessage } from "../Formatter"

interface DocumentComparisonProps {
    comparison: DocumentComparison | null
    onBack: () => void
}

const tabVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3 }
}

export function DocumentComparison({ comparison, onBack }: DocumentComparisonProps) {
    const [activeTab, setActiveTab] = useState<'summary' | 'similarities' | 'differences' | 'themes' | 'insights'>('summary')

    if (!comparison) {
        return (
            <div className="text-center py-16 animate-fade-in">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500 text-lg">No comparison data available</p>
            </div>
        )
    }

    const tabs = [
        { id: 'summary', label: 'Summary', icon: Eye, color: 'blue' },
        { id: 'similarities', label: 'Similarities', icon: CheckCircle, color: 'green' },
        { id: 'differences', label: 'Differences', icon: XCircle, color: 'red' },
        { id: 'themes', label: 'Key Themes', icon: TrendingUp, color: 'purple' },
        { id: 'insights', label: 'Insights', icon: Lightbulb, color: 'yellow' },
    ] as const

    const getTabContent = () => {
        const contentMap: Record<typeof activeTab, string[]> = {
            summary: [comparison.summary],
            similarities: comparison.similarities,
            differences: comparison.differences,
            themes: comparison.key_themes,
            insights: comparison.insights,
        }

        const colorMap = {
            similarities: 'green',
            differences: 'red',
            themes: 'purple',
            insights: 'yellow',
        } as const

        const items = contentMap[activeTab]

        if (activeTab === "summary") {
            return (
                <div className="text-gray-700 leading-relaxed text-lg">
                    <FormattedMessage content={items[0]} />
                </div>
            )
        }

        return items.length > 0 ? (
            <motion.div layout className="space-y-3">
                {items.map((item, index) => (
                    <motion.div
                        key={index}
                        variants={tabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={`flex items-start gap-3 p-4 bg-${colorMap[activeTab]}-50 border border-${colorMap[activeTab]}-200 rounded-xl shadow-sm`}
                    >
                        {React.createElement(tabs.find(t => t.id === activeTab)!.icon, {
                            className: `h-5 w-5 text-${colorMap[activeTab]}-600 mt-1 flex-shrink-0`
                        })}
                        <div className="text-gray-700 flex-1">
                            <FormattedMessage content={item} />
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        ) : (
            <p className="text-gray-500 italic">No content available for this section.</p>
        )
    }

    return (
        <motion.div layout className="space-y-8 px-4 sm:px-8">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2 text-blue-600 hover:bg-blue-100 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-gray-300" />
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-blue-500 animate-spin-slow" />
                        <h2 className="text-2xl font-bold text-gray-900">Document Comparison</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {formatDate(comparison.compared_at)}
                </div>
            </div>

            {/* Document List */}
            <Card className="p-6 rounded-2xl shadow-md bg-white/80 backdrop-blur">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Documents Compared ({comparison.documents.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comparison.documents.map((doc, index) => (
                        <motion.div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:scale-[1.02] hover:bg-blue-50 transition-transform shadow-sm"
                        >
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                                <p className="text-xs text-gray-500">{formatDate(doc.uploaded_at)}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Card>

            {/* Tabs */}
            <div className="overflow-x-auto border-b border-gray-200">
                <div className="flex space-x-6 whitespace-nowrap pb-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        const color = tab.color
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-2 px-3 rounded-full transition-all duration-300 ${isActive
                                        ? `bg-${color}-100 text-${color}-700 font-semibold shadow`
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {['similarities', 'differences', 'themes', 'insights'].includes(tab.id) &&
                                    comparison[tab.id as keyof DocumentComparison]?.length > 0 && (
                                        <Badge variant="secondary" className="ml-1">
                                            {(comparison[tab.id as keyof DocumentComparison] as []).length}
                                        </Badge>
                                    )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <Card className="p-6 rounded-2xl shadow-md bg-white/90">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {getTabContent()}
                    </motion.div>
                </AnimatePresence>
            </Card>
        </motion.div>
    )
}
