"use client";

import {
  X,
  AlertTriangle,
  XCircle,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Shield,
  Database,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import type { ValidationError } from "@/lib/types";

interface ValidationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  errors?: ValidationError[];
  onAIFix?: () => void;
  isApplyingFixes?: boolean;
}

export default function ValidationPanel({
  isOpen,
  onClose,
  errors = [],
  onAIFix,
  isApplyingFixes = false,
}: ValidationPanelProps) {
  if (!isOpen) return null;

  // Group errors by category
  const groupedErrors = errors.reduce((acc, error) => {
    // Handle different error structures - backend sends error_type, message, details
    const errorType = error.error_type || error.column || "unknown";
    const category =
      errorType === "file" || errorType.includes("file")
        ? "File Processing"
        : errorType.includes("duplicate_id") || errorType.includes("Id")
        ? "ID Validation"
        : errorType.includes("invalid_json") || errorType.includes("JSON")
        ? "JSON Format"
        : errorType.includes("skill") || errorType.includes("Skills")
        ? "Skills Coverage"
        : errorType.includes("phase") || errorType.includes("Phase")
        ? "Phase Validation"
        : errorType.includes("load") ||
          errorType.includes("Load") ||
          errorType.includes("overloaded")
        ? "Load Balancing"
        : errorType.includes("missing_columns")
        ? "Missing Data"
        : errorType.includes("out_of_range")
        ? "Data Range"
        : errorType.includes("malformed")
        ? "Data Format"
        : "Data Validation";

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const totalErrors = errors.filter(
    (e) => (e.severity || "error") === "error"
  ).length;
  const totalWarnings = errors.filter(
    (e) => (e.severity || "error") === "warning"
  ).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-[420px] bg-background border-l-2 border-border/50 shadow-2xl z-50 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Validation Issues</h3>
              <p className="text-sm text-muted-foreground">
                {errors.length} total issues found
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="p-6 border-b bg-muted/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {totalErrors}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {totalWarnings}
              </div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-12rem)]">
          <div className="p-6 space-y-4">
            {errors.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="font-medium text-lg mb-2">All Clear!</h4>
                <p className="text-muted-foreground text-sm">
                  No validation issues found in your data.
                </p>
              </motion.div>
            ) : (
              Object.entries(groupedErrors).map(
                ([category, categoryErrors], index) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-border/40 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            {category}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {categoryErrors.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {categoryErrors.map((error, errorIndex) => (
                          <motion.div
                            key={errorIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: index * 0.1 + errorIndex * 0.05,
                            }}
                            className="flex items-start space-x-3 p-4 rounded-lg bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 border-l-4 border-red-400 hover:from-red-50 hover:to-orange-50 dark:hover:from-red-950/30 dark:hover:to-orange-950/30 transition-all duration-200"
                          >
                            <div className="mt-1">
                              {getSeverityIcon(error.severity || "error")}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    📄 {error.file || "Data File"}
                                  </p>
                                  {error.row && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      Row {error.row}
                                    </Badge>
                                  )}
                                </div>
                                <Badge
                                  variant={
                                    getSeverityColor(
                                      error.severity || "error"
                                    ) as any
                                  }
                                  className="text-xs font-medium"
                                >
                                  {error.severity || "error"}
                                </Badge>
                              </div>

                              {(error.column || error.error_type) && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    🎯 Location:
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  >
                                    {error.column || error.error_type}
                                  </Badge>
                                </div>
                              )}

                              <div className="bg-white/70 dark:bg-gray-800/50 p-3 rounded-md border border-red-200/50 dark:border-red-800/50">
                                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                                  ❌ {error.error || error.message}
                                </p>
                                {error.suggestion && (
                                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-950/30 p-2 rounded border-l-2 border-blue-400">
                                    💡 <strong>Suggestion:</strong>{" "}
                                    {error.suggestion}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              )
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background/95 backdrop-blur">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={onAIFix}
              disabled={!onAIFix || errors.length === 0 || isApplyingFixes}
            >
              {isApplyingFixes ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isApplyingFixes ? "Fixing..." : "Auto-fix Issues"}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
