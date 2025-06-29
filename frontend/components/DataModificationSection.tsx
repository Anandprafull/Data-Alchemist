"use client";

import { useState } from "react";
import {
  Wand2,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Undo2,
  Save,
  Eye,
  Settings,
  Sparkles,
  Brain,
  Zap,
  Target,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProcessedData } from "@/lib/sample-data";

interface DataModificationSectionProps {
  data?: ProcessedData | null;
  onDataModified?: (modifiedData: ProcessedData) => void;
}

export default function DataModificationSection({
  data,
  onDataModified,
}: DataModificationSectionProps) {
  const [modificationInstruction, setModificationInstruction] = useState("");
  const [targetData, setTargetData] = useState<
    "clients" | "workers" | "tasks" | "all"
  >("all");
  const [correctionStrategy, setCorrectionStrategy] = useState<
    "conservative" | "aggressive" | "smart"
  >("smart");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCorrectingErrors, setIsCorrectingErrors] = useState(false);
  const [modificationHistory, setModificationHistory] = useState<any[]>([]);
  const [lastModification, setLastModification] = useState<any>(null);
  const [errorCorrections, setErrorCorrections] = useState<any[]>([]);

  const handleNaturalLanguageModification = async () => {
    if (!modificationInstruction.trim() || !data) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("command", modificationInstruction);

      const response = await fetch("http://localhost:8000/nl_modify", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === "success") {
        setLastModification(result);
        setModificationHistory((prev) => [
          ...prev,
          {
            id: Date.now(),
            instruction: modificationInstruction,
            timestamp: new Date().toISOString(),
            changes: result.updated,
            confidence: 0.9, // Default confidence
          },
        ]);

        if (onDataModified && result.updated) {
          // Transform the response to match ProcessedData format
          const modifiedData: ProcessedData = {
            ...data,
            ...result.updated,
            dataQuality: {
              totalRows: data?.dataQuality.totalRows || 0,
              cleanRows: data?.dataQuality.cleanRows || 0,
              errorRows: data?.dataQuality.errorRows || 0,
              qualityScore: data?.dataQuality.qualityScore || 100,
            },
          };
          onDataModified(modifiedData);
        }

        setModificationInstruction("");
      }
    } catch (error) {
      console.error("Modification error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleErrorCorrection = async () => {
    if (!data || !data.validationErrors.length) return;

    setIsCorrectingErrors(true);
    try {
      const response = await fetch(
        "http://localhost:8000/suggest_corrections",
        {
          method: "GET",
        }
      );

      const result = await response.json();

      if (result.status === "success" && result.suggestions) {
        setErrorCorrections(result.suggestions);

        // For now, just log the suggestions - you can implement actual correction logic
        console.log("Error correction suggestions:", result.suggestions);

        // You could apply corrections here and update the data
        // const correctedData = applyCorrections(data, result.suggestions)
        // if (onDataModified) {
        //   onDataModified(correctedData)
        // }
      }
    } catch (error) {
      console.error("Error correction failed:", error);
    } finally {
      setIsCorrectingErrors(false);
    }
  };

  const undoLastModification = () => {
    if (modificationHistory.length > 0) {
      const newHistory = [...modificationHistory];
      newHistory.pop();
      setModificationHistory(newHistory);
      setLastModification(null);
      // In a real implementation, you'd restore the previous data state
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "update":
        return <Settings className="h-4 w-4 text-blue-500" />;
      case "insert":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "delete":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "transform":
        return <Wand2 className="h-4 w-4 text-purple-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-gray-500" />;
    }
  };

  const errorCount = data?.validationErrors?.length || 0;
  const hasData =
    data &&
    (data.clients.length > 0 ||
      data.workers.length > 0 ||
      data.tasks.length > 0);

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
                  <Brain className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">
                    AI Data Modification
                  </h2>
                  <p className="text-muted-foreground">
                    Use natural language to modify your data or automatically
                    correct validation errors
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  <Zap className="h-3 w-3 mr-1" />
                  AI Powered
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errorCount} Errors
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="modify" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="modify"
            className="data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Natural Language Modification
          </TabsTrigger>
          <TabsTrigger
            value="correct"
            className="data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Error Correction
            {errorCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {errorCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modify">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Natural Language Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-background" />
                    </div>
                    <span>
                      Natural Language Data Modification
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      What would you like to modify?
                    </Label>                      <Textarea
                        placeholder="e.g., 'Update all high priority clients to have priority level 5' or 'Remove workers without any skills' or 'Standardize all email addresses to lowercase'"
                        value={modificationInstruction}
                        onChange={(e) =>
                          setModificationInstruction(e.target.value)
                        }
                        className="mt-2 min-h-[100px]"
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Target Data</Label>
                      <Select
                        value={targetData}
                        onValueChange={(value: any) => setTargetData(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Data</SelectItem>
                          <SelectItem value="clients">Clients Only</SelectItem>
                          <SelectItem value="workers">Workers Only</SelectItem>
                          <SelectItem value="tasks">Tasks Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">                        <Button
                          onClick={handleNaturalLanguageModification}
                          disabled={
                            isProcessing || !modificationInstruction.trim()
                          }
                          className="w-full"
                        >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Apply Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Preview/Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                      <Eye className="h-4 w-4 text-background" />
                    </div>
                    <span>
                      Modification Preview
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lastModification ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confidence: {lastModification.confidence}%
                        </Badge>
                        <Badge variant="secondary">
                          {lastModification.changes?.length || 0} Changes
                        </Badge>
                      </div>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                        {lastModification.changes?.map(
                          (change: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 py-2"
                            >
                              {getChangeIcon(change.type)}
                              <span className="text-sm">
                                {change.description}
                              </span>
                            </div>
                          )
                        )}
                      </ScrollArea>
                      <Button
                        variant="outline"
                        onClick={undoLastModification}
                        size="sm"
                        className="w-full"
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Undo Last Change
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No modifications applied yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Enter your modification instructions and click "Apply
                        Changes"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="correct">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center">
                    <Shield className="h-4 w-4 text-destructive-foreground" />
                  </div>
                  <span>
                    Automatic Error Correction
                  </span>
                  <Badge variant="destructive">
                    {errorCount} Errors Found
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Correction Strategy
                    </Label>
                    <Select
                      value={correctionStrategy}
                      onValueChange={(value: any) =>
                        setCorrectionStrategy(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">
                          Conservative (Safe)
                        </SelectItem>
                        <SelectItem value="smart">
                          Smart (Recommended)
                        </SelectItem>
                        <SelectItem value="aggressive">
                          Aggressive (Fast)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleErrorCorrection}
                      disabled={isCorrectingErrors || errorCount === 0}
                      className="w-full"
                    >
                      {isCorrectingErrors ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Correcting...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Fix Errors
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {errorCount === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-green-600 font-medium">
                      No errors found!
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your data appears to be clean and valid
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Found {errorCount} validation errors that can be
                      automatically corrected
                    </p>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      {data?.validationErrors
                        ?.slice(0, 10)
                        .map((error, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 py-2 border-b last:border-0"
                          >
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {error.column}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {error.error}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {error.severity}
                            </Badge>
                          </div>
                        ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="history">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                    <Save className="h-4 w-4 text-background" />
                  </div>
                  <span>
                    Modification History
                  </span>
                  <Badge variant="secondary">
                    {modificationHistory.length} Changes
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modificationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Save className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No modification history yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All your data modifications will appear here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] w-full">
                    <div className="space-y-4">
                      {modificationHistory.map((mod, index) => (
                        <div
                          key={mod.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">
                              #{modificationHistory.length - index}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(mod.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-2">
                            {mod.instruction}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Confidence: {mod.confidence}%</span>
                            <span>Changes: {mod.changes?.length || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
