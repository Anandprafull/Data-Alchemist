"use client";

import type React from "react";

import { useState } from "react";
import {
  Search,
  Sparkles,
  MessageSquare,
  Loader2,
  Brain,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface AIToolsSectionProps {
  onSearch?: (query: string) => void;
  onAIFix?: () => void;
  searchResults?: any;
  isSearching?: boolean;
  isApplyingFixes?: boolean;
}

export default function AIToolsSection({
  onSearch,
  onAIFix,
  searchResults,
  isSearching = false,
  isApplyingFixes = false,
}: AIToolsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mb-8"
    >
      <Card className="relative overflow-hidden bg-white dark:bg-[#020917] shadow-lg">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-black dark:bg-white dark:text-black text-white">
              <Brain className="h-5 w-5" />
            </div>
            AI-Powered Data Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500" />
              <Input
                placeholder="Ask anything about your data... (e.g., 'Show high priority clients' or 'Tasks assigned to phase 2')"
                className="pl-10 bg-background/70 backdrop-blur border-2 focus:border-blue-500 transition-all duration-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="default"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onAIFix}
                disabled={isApplyingFixes}
                className="border-2 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                {isApplyingFixes ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isApplyingFixes ? "Fixing..." : "Auto-Fix Errors"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-2 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
              Try: "High priority clients"
            </span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
              Try: "Workers with React skills"
            </span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
              Try: "Tasks in phase 2"
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Search Results
              <div className="flex gap-2">
                {searchResults.totalFound?.clients > 0 && (
                  <Badge variant="secondary">
                    {searchResults.totalFound.clients} Clients
                  </Badge>
                )}
                {searchResults.totalFound?.workers > 0 && (
                  <Badge variant="secondary">
                    {searchResults.totalFound.workers} Workers
                  </Badge>
                )}
                {searchResults.totalFound?.tasks > 0 && (
                  <Badge variant="secondary">
                    {searchResults.totalFound.tasks} Tasks
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {searchResults.explanation}
            </p>

            {/* Display results in a compact format */}
            <div className="space-y-4">
              {searchResults.clients?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Clients ({searchResults.clients.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchResults.clients.slice(0, 6).map((client: any) => (
                      <div
                        key={client.ClientID}
                        className="p-2 bg-muted rounded text-sm"
                      >
                        <div className="font-medium">{client.ClientName}</div>
                        <div className="text-muted-foreground">
                          {client.ClientID} • Priority: {client.PriorityLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.workers?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Workers ({searchResults.workers.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchResults.workers.slice(0, 6).map((worker: any) => (
                      <div
                        key={worker.WorkerID}
                        className="p-2 bg-muted rounded text-sm"
                      >
                        <div className="font-medium">{worker.WorkerName}</div>
                        <div className="text-muted-foreground">
                          {worker.WorkerID} •{" "}
                          {worker.Skills?.split(",").slice(0, 2).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.tasks?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Tasks ({searchResults.tasks.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchResults.tasks.slice(0, 6).map((task: any) => (
                      <div
                        key={task.TaskID}
                        className="p-2 bg-muted rounded text-sm"
                      >
                        <div className="font-medium">{task.TaskName}</div>
                        <div className="text-muted-foreground">
                          {task.TaskID} • Duration: {task.Duration}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
