import React from 'react';
import { Upload, Sparkles, Brain, Zap, ArrowRight, FileText, Database, BarChart3 } from 'lucide-react';

export function DocumentEmptyState() {
    return (
        <div className="relative overflow-hidden min-h-[500px] flex items-center justify-center">
            {/* Animated background with floating shapes */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80" />

                {/* Floating geometric shapes */}
                <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-blue-200/30 rounded-full animate-pulse"
                    style={{ animationDelay: '0s', animationDuration: '3s' }} />
                <div className="absolute top-3/4 right-1/4 w-16 h-16 bg-purple-200/30 rounded-lg rotate-45 animate-pulse"
                    style={{ animationDelay: '1s', animationDuration: '4s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-pink-200/30 rounded-full animate-pulse"
                    style={{ animationDelay: '2s', animationDuration: '2.5s' }} />
            </div>

            <div className="relative text-center px-8 max-w-2xl mx-auto">
                {/* Main icon cluster */}
                <div className="relative mb-8">
                    {/* Orbiting icons */}
                    <div className="relative w-32 h-32 mx-auto">
                        {/* Center upload icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
                                <Upload className="h-10 w-10 text-white" />
                            </div>
                        </div>

                        {/* Orbiting feature icons */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 animate-bounce"
                            style={{ animationDelay: '0.5s' }}>
                            <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                                <Brain className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>

                        <div className="absolute top-1/2 right-0 transform translate-x-2 -translate-y-1/2 animate-bounce"
                            style={{ animationDelay: '1s' }}>
                            <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-purple-600" />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 animate-bounce"
                            style={{ animationDelay: '1.5s' }}>
                            <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-pink-600" />
                            </div>
                        </div>

                        <div className="absolute top-1/2 left-0 transform -translate-x-2 -translate-y-1/2 animate-bounce"
                            style={{ animationDelay: '2s' }}>
                            <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                                <FileText className="h-4 w-4 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                            Your AI Research Hub Awaits
                        </h2>
                        <p className="text-xl text-gray-600 leading-relaxed max-w-lg mx-auto">
                            Transform your documents into actionable insights with our intelligent analysis platform
                        </p>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 opacity-20">
                    <Sparkles className="h-8 w-8 text-blue-400 animate-pulse" />
                </div>
                <div className="absolute -bottom-4 -left-4 opacity-20">
                    <Database className="h-6 w-6 text-purple-400 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
            </div>
        </div>
    );
}