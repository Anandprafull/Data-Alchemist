"use client";

import { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sampleClientsCSV,
  sampleWorkersCSV,
  sampleTasksCSV,
} from "@/lib/sample-data";
import type { ProcessedData } from "@/lib/sample-data";

interface FileStatus {
  name: string;
  type: string;
  status: "pending" | "valid" | "warning" | "error";
  size?: string;
  file?: File;
}

interface FileUploadSectionProps {
  onDataProcessed?: (data: ProcessedData) => void;
}

export default function FileUploadSection({
  onDataProcessed,
}: FileUploadSectionProps) {
  const [files, setFiles] = useState<Record<string, FileStatus>>({
    clients: { name: "", type: "", status: "pending" },
    workers: { name: "", type: "", status: "pending" },
    tasks: { name: "", type: "", status: "pending" },
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (fileType: string, file: File) => {
    setFiles((prev) => ({
      ...prev,
      [fileType]: {
        name: file.name,
        type: file.type,
        status: "pending",
        size: `${(file.size / 1024).toFixed(1)} KB`,
        file: file,
      },
    }));
  };

  const loadSampleData = async () => {
    setIsProcessing(true);

    try {
      // Create sample files
      const clientsBlob = new Blob([sampleClientsCSV], { type: "text/csv" });
      const workersBlob = new Blob([sampleWorkersCSV], { type: "text/csv" });
      const tasksBlob = new Blob([sampleTasksCSV], { type: "text/csv" });

      const clientsFile = new File([clientsBlob], "clients.csv", {
        type: "text/csv",
      });
      const workersFile = new File([workersBlob], "workers.csv", {
        type: "text/csv",
      });
      const tasksFile = new File([tasksBlob], "tasks.csv", {
        type: "text/csv",
      });

      // Update file status
      setFiles({
        clients: {
          name: "clients.csv",
          type: "text/csv",
          status: "pending",
          size: "2.3 KB",
        },
        workers: {
          name: "workers.csv",
          type: "text/csv",
          status: "pending",
          size: "1.8 KB",
        },
        tasks: {
          name: "tasks.csv",
          type: "text/csv",
          status: "pending",
          size: "3.1 KB",
        },
      });

      // Process the files
      const formData = new FormData();
      formData.append("clients", clientsFile);
      formData.append("workers", workersFile);
      formData.append("tasks", tasksFile);

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update file statuses based on validation results
        const hasErrors = result.errors.some(
          (error: any) => error.severity === "error"
        );
        const hasWarnings = result.errors.some(
          (error: any) => error.severity === "warning"
        );

        const status = hasErrors ? "error" : hasWarnings ? "warning" : "valid";

        setFiles((prev) => ({
          clients: { ...prev.clients, status },
          workers: { ...prev.workers, status },
          tasks: { ...prev.tasks, status },
        }));

        // Transform the backend response to match your frontend's expected format
        const processedData: ProcessedData = {
          clients: result.data.clients || [],
          workers: result.data.workers || [],
          tasks: result.data.tasks || [],
          validationErrors: result.errors || [],
          dataQuality: {
            totalRows:
              (result.summary.total_clients || 0) +
              (result.summary.total_workers || 0) +
              (result.summary.total_tasks || 0),
            cleanRows:
              (result.summary.total_clients || 0) +
              (result.summary.total_workers || 0) +
              (result.summary.total_tasks || 0) -
              (result.errors?.length || 0),
            errorRows: result.errors?.length || 0,
            qualityScore:
              result.errors?.length > 0
                ? Math.max(0, 100 - result.errors.length * 10)
                : 100,
          },
        };

        // Notify parent component
        if (onDataProcessed) {
          onDataProcessed(processedData);
        }
      }
    } catch (error) {
      console.error("Sample data loading error:", error);
      setFiles((prev) => ({
        clients: { ...prev.clients, status: "error" },
        workers: { ...prev.workers, status: "error" },
        tasks: { ...prev.tasks, status: "error" },
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const processUploadedFiles = async () => {
    const formData = new FormData();
    let hasFiles = false;

    // Add actual uploaded files to form data
    Object.entries(files).forEach(([fileType, fileStatus]) => {
      if (fileStatus.file) {
        formData.append(fileType, fileStatus.file);
        hasFiles = true;
      }
    });

    if (!hasFiles) {
      console.log("No files to process");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update file statuses based on validation results
        const hasErrors = result.errors.some(
          (error: any) => error.severity === "error"
        );
        const hasWarnings = result.errors.some(
          (error: any) => error.severity === "warning"
        );

        const status = hasErrors ? "error" : hasWarnings ? "warning" : "valid";

        setFiles((prev) => {
          const updated = { ...prev };
          Object.keys(prev).forEach((key) => {
            if (prev[key].file) {
              updated[key] = { ...prev[key], status };
            }
          });
          return updated;
        });

        // Transform the backend response to match your frontend's expected format
        const processedData: ProcessedData = {
          clients: result.data.clients || [],
          workers: result.data.workers || [],
          tasks: result.data.tasks || [],
          validationErrors: result.errors || [],
          dataQuality: {
            totalRows:
              (result.summary.total_clients || 0) +
              (result.summary.total_workers || 0) +
              (result.summary.total_tasks || 0),
            cleanRows:
              (result.summary.total_clients || 0) +
              (result.summary.total_workers || 0) +
              (result.summary.total_tasks || 0) -
              (result.errors?.length || 0),
            errorRows: result.errors?.length || 0,
            qualityScore:
              result.errors?.length > 0
                ? Math.max(0, 100 - result.errors.length * 10)
                : 100,
          },
        };

        // Notify parent component
        if (onDataProcessed) {
          onDataProcessed(processedData);
        }
      } else {
        // Handle error response
        setFiles((prev) => {
          const updated = { ...prev };
          Object.keys(prev).forEach((key) => {
            if (prev[key].file) {
              updated[key] = { ...prev[key], status: "error" };
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error("File processing error:", error);
      setFiles((prev) => {
        const updated = { ...prev };
        Object.keys(prev).forEach((key) => {
          if (prev[key].file) {
            updated[key] = { ...prev[key], status: "error" };
          }
        });
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const uploadCards = [
    {
      key: "clients",
      title: "Clients Data",
      description: "Upload clients.csv or .xlsx file",
      icon: Users,
    },
    {
      key: "workers",
      title: "Workers Data",
      description: "Upload workers.csv or .xlsx file",
      icon: Users,
    },
    {
      key: "tasks",
      title: "Tasks Data",
      description: "Upload tasks.csv or .xlsx file",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Upload className="size-4" />
          File Upload
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Upload Your Data Files
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your CSV or Excel files to get started. We'll automatically
          process and validate your data.
        </p>
      </div>

      {/* Upload Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {uploadCards.map((card) => (
          <Card
            key={card.key}
            className="overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-lg"
          >
            <CardHeader className="text-center pb-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                <card.icon className="size-6" />
              </div>
              <CardTitle className="text-xl flex items-center justify-between">
                {card.title}
                {getStatusIcon(files[card.key].status)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {card.description}
              </p>
            </CardHeader>
            <CardContent>
              <div
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                  ${
                    files[card.key].status === "valid"
                      ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                      : files[card.key].status === "error"
                      ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                      : files[card.key].status === "warning"
                      ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                      : "border-border hover:border-primary/50 hover:bg-muted/20"
                  }
                `}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(card.key, file);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv,.xlsx,.xls";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileUpload(card.key, file);
                  };
                  input.click();
                }}
              >
                <Upload className="size-8 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-2">
                  {files[card.key].name || "Drop file here or click to browse"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {files[card.key].size || "Supports CSV, XLSX, XLS files"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
        <Button
          size="lg"
          className="rounded-full h-12 px-8 text-base"
          onClick={loadSampleData}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Processing Sample Data...
            </>
          ) : (
            <>
              <FileText className="size-4 mr-2" />
              Load Sample Data
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="rounded-full h-12 px-8 text-base"
          onClick={processUploadedFiles}
          disabled={isProcessing}
        >
          <Upload className="size-4 mr-2" />
          Process Uploaded Files
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="rounded-full h-12 px-8 text-base"
          onClick={() =>
            setFiles({
              clients: { name: "", type: "", status: "pending" },
              workers: { name: "", type: "", status: "pending" },
              tasks: { name: "", type: "", status: "pending" },
            })
          }
        >
          <XCircle className="size-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
