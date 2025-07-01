"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Settings,
  CheckCircle,
  Package,
  Zap,
  Target,
  Share,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ProcessedData } from "@/lib/types";

interface ExportSectionProps {
  data?: ProcessedData | null;
}

export default function ExportSection({ data }: ExportSectionProps) {
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [includeRules, setIncludeRules] = useState(true);
  const [includeValidation, setIncludeValidation] = useState(true);
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<any>(null);

  const exportOptions = [
    {
      id: "csv",
      name: "CSV",
      description: "Comma-separated values for Excel compatibility",
      icon: FileText,
      size: "~2.5 MB",
      supported: true,
    },
    {
      id: "xlsx",
      name: "Excel",
      description: "Microsoft Excel workbook with multiple sheets",
      icon: Package,
      size: "~1.8 MB",
      supported: true,
    },
    {
      id: "json",
      name: "JSON",
      description: "JavaScript Object Notation for APIs",
      icon: Settings,
      size: "~3.2 MB",
      supported: true,
    },
  ];

  const handleFileDownload = async (
    filename: string,
    fileContent?: string,
    fileType?: string
  ) => {
    try {
      if (fileContent && fileType) {
        // Download from stored content (for last export)
        const blob = new Blob([fileContent], { type: fileType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to old download method if no content provided
        const response = await fetch(
          `https://data-alchemist-production.up.railway.app//download/${filename}`
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          alert(`Failed to download ${filename}`);
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      alert(`Failed to download ${filename}`);
    }
  };

  const handleExport = async () => {
    if (!data) return;

    setIsExporting(true);
    try {
      const response = await fetch(
        "https://data-alchemist-production.up.railway.app//export_download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        // Download each file directly through the browser
        result.files.forEach((file: any, index: number) => {
          setTimeout(() => {
            const blob = new Blob([file.content], { type: file.type });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, index * 500); // Stagger downloads by 500ms to avoid browser blocking
        });

        // Update UI with export details
        setLastExport({
          files: result.files.map((f: any) => ({
            name: f.name,
            type: f.type.includes("csv") ? "csv" : "json",
            size: f.size,
            content: f.content,
            mimeType: f.type,
          })),
          timestamp: new Date().toISOString(),
          summary: result.summary,
        });

        console.log("Export successful:", result);
        // Files will download automatically without showing alert
      } else {
        console.error("Export failed:", result.message);
        alert(`Export failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed: Unable to connect to server");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllAgain = () => {
    if (!lastExport?.files) return;

    lastExport.files.forEach((file: any, index: number) => {
      setTimeout(() => {
        handleFileDownload(file.name, file.content, file.mimeType);
      }, index * 500);
    });
  };

  const getDataSummary = () => {
    if (!data) return { clients: 0, workers: 0, tasks: 0, errors: 0 };
    return {
      clients: data.clients.length,
      workers: data.workers.length,
      tasks: data.tasks.length,
      errors: data.validationErrors?.length || 0,
    };
  };

  const summary = getDataSummary();
  const totalRecords = summary.clients + summary.workers + summary.tasks;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-foreground flex items-center justify-center">
                  <Download className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Export Data</h2>
                  <p className="text-muted-foreground">
                    Download your cleaned data directly to your browser
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Options */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <Card className="border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                  <Package className="h-4 w-4 text-background" />
                </div>
                <span>Export Format</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedFormat === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    } ${
                      !option.supported ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() =>
                      option.supported && setSelectedFormat(option.id)
                    }
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        selectedFormat === option.id
                          ? "bg-blue-500 text-white"
                          : "bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{option.name}</h4>
                        {!option.supported && (
                          <Badge variant="secondary">Coming Soon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estimated size: {option.size}
                      </p>
                    </div>
                    {selectedFormat === option.id && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                  <Settings className="h-4 w-4 text-background" />
                </div>
                <span>Export Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-rules"
                    checked={includeRules}
                    onCheckedChange={(checked) =>
                      setIncludeRules(checked === true)
                    }
                  />
                  <Label
                    htmlFor="include-rules"
                    className="text-sm font-medium"
                  >
                    Include allocation rules
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-validation"
                    checked={includeValidation}
                    onCheckedChange={(checked) =>
                      setIncludeValidation(checked === true)
                    }
                  />
                  <Label
                    htmlFor="include-validation"
                    className="text-sm font-medium"
                  >
                    Include validation report
                  </Label>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Compression Level</Label>
                <Select
                  value={compressionLevel}
                  onValueChange={setCompressionLevel}
                >
                  <SelectTrigger className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Fastest)</SelectItem>
                    <SelectItem value="low">Low Compression</SelectItem>
                    <SelectItem value="medium">Medium Compression</SelectItem>
                    <SelectItem value="high">
                      High Compression (Smallest)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Export Summary & Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <Card className="border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                  <FileText className="h-4 w-4 text-background" />
                </div>
                <span>Export Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.clients}
                  </p>
                  <p className="text-sm text-muted-foreground">Clients</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {summary.workers}
                  </p>
                  <p className="text-sm text-muted-foreground">Workers</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.tasks}
                  </p>
                  <p className="text-sm text-muted-foreground">Tasks</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {summary.errors}
                  </p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Format:</span>
                  <span className="font-medium capitalize">
                    {selectedFormat}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Include Rules:</span>
                  <span className="font-medium">
                    {includeRules ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Include Validation:</span>
                  <span className="font-medium">
                    {includeValidation ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Compression:</span>
                  <span className="font-medium capitalize">
                    {compressionLevel}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting || !data || totalRecords === 0}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <Download className="h-4 w-4" />
                    </motion.div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Files
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Last Export Info */}
          {lastExport && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-r from-yellow-50/80 to-orange-50/80 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200/50 dark:border-yellow-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      Last Export
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Downloaded:</span>
                    <span className="font-medium">
                      {lastExport.files?.length || 0} files
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Size:</span>
                    <span className="font-medium">
                      {lastExport.files
                        ?.reduce(
                          (sum: number, f: any) => sum + (f.size || 0),
                          0
                        )
                        .toLocaleString()}{" "}
                      bytes
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Records:</span>
                    <span className="font-medium">
                      {(lastExport.summary?.clients_count || 0) +
                        (lastExport.summary?.workers_count || 0) +
                        (lastExport.summary?.tasks_count || 0)}{" "}
                      total
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Downloaded at:</span>
                    <span className="font-medium">
                      {new Date(lastExport.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {lastExport.files && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Exported files:
                      </p>
                      <div className="space-y-1">
                        {lastExport.files.map((file: any, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center text-xs bg-white/50 dark:bg-gray-900/50 p-2 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span>{file.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {file.type}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleFileDownload(
                                  file.name,
                                  file.content,
                                  file.mimeType
                                )
                              }
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleDownloadAllAgain}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
