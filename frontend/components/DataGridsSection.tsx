"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  BarChart3,
  Users,
  FileText,
  Star,
  Save,
  X,
  Check,
  SortAsc,
  SortDesc,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type {
  ProcessedData,
  ClientData,
  WorkerData,
  TaskData,
  ValidationError,
} from "@/lib/types";

interface DataGridsSectionProps {
  data?: ProcessedData | null;
  searchResults?: any[];
  onDataUpdate?: (updatedData: ProcessedData) => void;
}

export default function DataGridsSection({
  data,
  searchResults,
  onDataUpdate,
}: DataGridsSectionProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [selectedTab, setSelectedTab] = useState("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Handle cell editing
  const startEditing = useCallback(
    (rowIndex: number, field: string, currentValue: any) => {
      setEditingCell({ rowIndex, field });
      setEditValue(String(currentValue || ""));
    },
    []
  );

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingCell || !data || !onDataUpdate) return;

    const { rowIndex, field } = editingCell;
    const currentData = getCurrentPageData();
    const actualRowIndex = (currentPage - 1) * itemsPerPage + rowIndex;

    // Create updated data
    const updatedData = { ...data };
    const dataType = selectedTab as keyof Pick<
      ProcessedData,
      "clients" | "workers" | "tasks"
    >;
    const dataArray = [...updatedData[dataType]];

    if (actualRowIndex < dataArray.length) {
      // Parse value based on field type
      let parsedValue: any = editValue;

      // Handle arrays (like skills, requestedTaskIds, requiredSkills)
      if (
        field === "skills" ||
        field === "requestedTaskIds" ||
        field === "requiredSkills"
      ) {
        parsedValue = editValue
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      // Handle numbers
      else if (
        field === "maxLoad" ||
        field === "priority" ||
        field === "duration"
      ) {
        const numValue = parseFloat(editValue);
        if (!isNaN(numValue)) {
          parsedValue = numValue;
        }
      }

      dataArray[actualRowIndex] = {
        ...dataArray[actualRowIndex],
        [field]: parsedValue,
      };

      updatedData[dataType] = dataArray as any;

      // Re-run basic validation on the updated data
      // Note: This is a simplified validation - full validation would require server call
      const updatedErrors = updatedData.validationErrors.filter(
        (error) =>
          !(
            error.file &&
            error.file.includes(selectedTab) &&
            error.row === actualRowIndex + 2 &&
            error.column === field
          )
      );

      // Add basic field validation
      if (field === "priority" && parsedValue) {
        const validPriorities = [
          "High",
          "Medium",
          "Low",
          "1",
          "2",
          "3",
          "4",
          "5",
        ];
        if (!validPriorities.includes(String(parsedValue))) {
          updatedErrors.push({
            file: `${selectedTab}.csv`,
            row: actualRowIndex + 2,
            column: field,
            error: `Invalid priority value: ${parsedValue}`,
            severity: "warning",
            suggestion: "Use High, Medium, Low or 1-5",
          });
        }
      }

      updatedData.validationErrors = updatedErrors;
      onDataUpdate(updatedData);

      toast({
        title: "Data Updated",
        description: `Successfully updated ${field} for ${selectedTab.slice(
          0,
          -1
        )}`,
      });
    }

    setEditingCell(null);
    setEditValue("");
  }, [
    editingCell,
    editValue,
    data,
    onDataUpdate,
    selectedTab,
    currentPage,
    itemsPerPage,
  ]);

  // Handle sorting
  const handleSort = useCallback(
    (key: string) => {
      let direction: "asc" | "desc" = "asc";
      if (
        sortConfig &&
        sortConfig.key === key &&
        sortConfig.direction === "asc"
      ) {
        direction = "desc";
      }
      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  // Filter and search data with sorting
  const filteredData = useMemo(() => {
    if (!data) return { clients: [], workers: [], tasks: [] };

    const filterAndSearch = (items: any[], type: string) => {
      let filtered = items.filter((item) => {
        const matchesSearch = Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

        let matchesFilter = true;
        if (filterValue !== "all") {
          switch (type) {
            case "clients":
              matchesFilter = item.priority?.toString() === filterValue;
              break;
            case "workers":
              matchesFilter = item.department === filterValue;
              break;
            case "tasks":
              matchesFilter = item.status === filterValue;
              break;
          }
        }

        return matchesSearch && matchesFilter;
      });

      // Apply sorting
      if (sortConfig) {
        filtered.sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];

          if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
          }
          return 0;
        });
      }

      return filtered;
    };

    return {
      clients: filterAndSearch(data.clients, "clients"),
      workers: filterAndSearch(data.workers, "workers"),
      tasks: filterAndSearch(data.tasks, "tasks"),
    };
  }, [data, searchTerm, filterValue, sortConfig]);

  // Pagination
  const getCurrentPageData = () => {
    const currentData =
      filteredData[selectedTab as keyof typeof filteredData] || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return currentData.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(
    (filteredData[selectedTab as keyof typeof filteredData]?.length || 0) /
      itemsPerPage
  );

  const getStatsData = () => {
    if (!data) return { totalRecords: 0, validRecords: 0, errorRate: 0 };

    const totalRecords =
      data.clients.length + data.workers.length + data.tasks.length;
    const validRecords = totalRecords - (data.validationErrors?.length || 0);
    const errorRate =
      totalRecords > 0
        ? ((data.validationErrors?.length || 0) / totalRecords) * 100
        : 0;

    return { totalRecords, validRecords, errorRate };
  };

  const stats = getStatsData();

  const renderTableView = () => {
    const currentData = getCurrentPageData();

    if (currentData.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No data available</p>
          <p className="text-sm text-muted-foreground">
            Upload a file to see your data here
          </p>
        </div>
      );
    }

    const headers = Object.keys(currentData[0] || {});

    return (
      <div className="rounded-lg border bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {headers.map((header) => (
                <TableHead
                  key={header}
                  className="font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort(header)}
                >
                  <div className="flex items-center gap-2">
                    {header.charAt(0).toUpperCase() + header.slice(1)}
                    {sortConfig?.key === header &&
                      (sortConfig.direction === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, rowIndex) => {
              const hasErrors = hasRowErrors(rowIndex);
              return (
                <TableRow
                  key={rowIndex}
                  className={`transition-colors ${
                    hasErrors
                      ? "bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30 border-l-4 border-red-400"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {headers.map((header) => {
                    const cellError = getCellError(rowIndex, header);
                    return (
                      <TableCell
                        key={header}
                        className={`cursor-pointer transition-colors relative ${
                          cellError
                            ? "bg-red-100/50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700"
                            : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        }`}
                        onClick={() =>
                          startEditing(rowIndex, header, item[header])
                        }
                      >
                        {editingCell?.rowIndex === rowIndex &&
                        editingCell?.field === header ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEditing();
                              }}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEdit}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group">
                            <span className="truncate">
                              {Array.isArray(item[header])
                                ? item[header].join(", ")
                                : item[header] || "-"}
                            </span>
                            <div className="flex items-center gap-1">
                              {cellError && (
                                <div
                                  title={cellError.error || cellError.message}
                                >
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                </div>
                              )}
                              <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </div>
                          </div>
                        )}
                        {hasRowErrors(rowIndex) && (
                          <div className="absolute inset-0 rounded-md border-2 border-destructive pointer-events-none" />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {hasErrors && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="This row has validation errors"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderGridView = () => {
    const currentData = getCurrentPageData();

    if (currentData.length === 0) {
      return (
        <div className="text-center py-12">
          <Grid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No data available</p>
          <p className="text-sm text-muted-foreground">
            Upload a file to see your data here
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {item.name || item.id || "Item"}
                  </CardTitle>
                  {item.priority && (
                    <Badge
                      variant={
                        item.priority === "High"
                          ? "destructive"
                          : item.priority === "Medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {item.priority}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(item).map(([key, value]) => {
                  if (key === "name" || key === "id") return null;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key}:
                      </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  // Helper function to check if a row has errors
  const hasRowErrors = (rowIndex: number) => {
    if (!data?.validationErrors?.length) return false;

    const actualRowIndex = (currentPage - 1) * itemsPerPage + rowIndex;
    const fileType =
      selectedTab === "clients"
        ? "clients.csv"
        : selectedTab === "workers"
        ? "workers.csv"
        : "tasks.csv";

    return data.validationErrors.some(
      (error) => error.file === fileType && error.row === actualRowIndex + 2
    );
  };

  // Helper function to get error details for a specific cell
  const getCellError = (rowIndex: number, column: string) => {
    if (!data?.validationErrors?.length) return null;

    const actualRowIndex = (currentPage - 1) * itemsPerPage + rowIndex;
    const fileType =
      selectedTab === "clients"
        ? "clients.csv"
        : selectedTab === "workers"
        ? "workers.csv"
        : "tasks.csv";

    return data.validationErrors.find(
      (error) =>
        error.file === fileType &&
        error.row === actualRowIndex + 2 &&
        error.column === column
    );
  };

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
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 via-gray-600/10 to-gray-700/10 rounded-3xl blur-3xl" />
        <Card className="relative bg-gradient-to-r from-gray-50/50 via-gray-100/30 to-gray-200/50 dark:from-gray-950/20 dark:via-gray-900/20 dark:to-gray-800/20 border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white dark:text-black " />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Data Explorer</h2>
                  <p className="text-muted-foreground">
                    View and manage your uploaded data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {stats.totalRecords} records
                </Badge>
                <Button
                  onClick={() =>
                    setViewMode(viewMode === "table" ? "grid" : "table")
                  }
                  variant="outline"
                  size="sm"
                  className="border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {viewMode === "table" ? (
                    <>
                      <Grid className="h-4 w-4 mr-2" />
                      Grid View
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4 mr-2" />
                      Table View
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/30 dark:to-gray-800/30 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Records
                </p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {stats.totalRecords.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/30 dark:to-gray-800/30 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Valid Records
                </p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {stats.validRecords.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Star className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/30 dark:to-gray-800/30 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Error Rate
                </p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {stats.errorRate.toFixed(1)}%
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Tabs and Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <TabsList className="grid w-full grid-cols-3 max-w-md bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
              <TabsTrigger
                value="clients"
                className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
              >
                <Users className="h-4 w-4 mr-2" />
                Clients ({filteredData.clients.length})
              </TabsTrigger>
              <TabsTrigger
                value="workers"
                className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
              >
                <Users className="h-4 w-4 mr-2" />
                Workers ({filteredData.workers.length})
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
              >
                <FileText className="h-4 w-4 mr-2" />
                Tasks ({filteredData.tasks.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                />
              </div>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-32 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {selectedTab === "clients" && (
                    <>
                      <SelectItem value="1">Priority 1</SelectItem>
                      <SelectItem value="2">Priority 2</SelectItem>
                      <SelectItem value="3">Priority 3</SelectItem>
                    </>
                  )}
                  {selectedTab === "workers" && (
                    <>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </>
                  )}
                  {selectedTab === "tasks" && (
                    <>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <TabsContent value="clients" className="space-y-4">
            {viewMode === "table" ? renderTableView() : renderGridView()}
          </TabsContent>

          <TabsContent value="workers" className="space-y-4">
            {viewMode === "table" ? renderTableView() : renderGridView()}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {viewMode === "table" ? renderTableView() : renderGridView()}
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(
                currentPage * itemsPerPage,
                filteredData[selectedTab as keyof typeof filteredData]
                  ?.length || 0
              )}{" "}
              of{" "}
              {filteredData[selectedTab as keyof typeof filteredData]?.length ||
                0}{" "}
              results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm px-3 py-2 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded border">
                {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
