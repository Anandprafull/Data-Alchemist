"use client";

import {
  Upload,
  Grid,
  Settings,
  Target,
  Download,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActiveSection } from "@/app/dashboard/page";
import type { ValidationError } from "@/lib/sample-data";

interface SidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  errors?: ValidationError[];
}

const sidebarItems = [
  {
    id: "upload" as ActiveSection,
    label: "Upload",
    icon: Upload,
    description: "Import your data",
  },
  {
    id: "data-grids" as ActiveSection,
    label: "Data Grids",
    icon: Grid,
    description: "View & analyze",
  },
  {
    id: "modify" as ActiveSection,
    label: "AI Modify",
    icon: Wand2,
    description: "AI-powered editing",
    badge: "AI",
  },
  {
    id: "rules" as ActiveSection,
    label: "Rules",
    icon: Settings,
    description: "Business logic",
  },
  {
    id: "priorities" as ActiveSection,
    label: "Priorities",
    icon: Target,
    description: "Task ordering",
  },
  {
    id: "export" as ActiveSection,
    label: "Export",
    icon: Download,
    description: "Download results",
  },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  errors = [],
}: SidebarProps) {
  // Function to get error count for a specific section
  const getErrorCountForSection = (sectionId: ActiveSection): number => {
    if (!errors.length) return 0;

    switch (sectionId) {
      case "upload":
      case "data-grids":
      case "modify":
        // File processing, validation, and data modification errors
        return errors.filter(
          (error) =>
            error.error_type?.includes("file") ||
            error.error_type?.includes("duplicate") ||
            error.error_type?.includes("invalid") ||
            error.error_type?.includes("missing") ||
            error.file?.includes(".csv") ||
            error.column
        ).length;
      case "rules":
        // Rule-related errors
        return errors.filter(
          (error) =>
            error.error_type?.includes("rule") ||
            error.error_type?.includes("circular") ||
            error.error_type?.includes("conflict")
        ).length;
      case "priorities":
        // Priority and load balancing errors
        return errors.filter(
          (error) =>
            error.error_type?.includes("priority") ||
            error.error_type?.includes("load") ||
            error.error_type?.includes("overload") ||
            error.error_type?.includes("saturation")
        ).length;
      default:
        return 0;
    }
  };
  return (
    <aside className="w-72 border-r border-border/40 bg-background/95 backdrop-blur-sm relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/10 pointer-events-none"></div>

      <nav className="p-6 space-y-2 relative">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Data Processing
          </h2>
        </div>

        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const errorCount = getErrorCountForSection(item.id);
          const hasErrors = errorCount > 0;

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-4 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : hasErrors
                  ? "hover:bg-red-50 hover:shadow-sm border-red-200 dark:hover:bg-red-900/10 dark:border-red-800"
                  : "hover:bg-muted/50 hover:shadow-sm"
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <div className="flex items-center w-full">
                <div
                  className={`size-10 rounded-lg flex items-center justify-center mr-3 relative ${
                    isActive
                      ? "bg-primary-foreground/20"
                      : hasErrors
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="size-5" />
                  {hasErrors && !isActive && (
                    <div className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="size-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {item.badge}
                      </Badge>
                    )}
                    {hasErrors && (
                      <Badge
                        variant="destructive"
                        className="text-xs px-1.5 py-0.5 bg-red-500 text-white"
                      >
                        {errorCount}
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.description}
                    {hasErrors && (
                      <span className="text-red-500 dark:text-red-400 font-medium ml-1">
                        • {errorCount} issue{errorCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
