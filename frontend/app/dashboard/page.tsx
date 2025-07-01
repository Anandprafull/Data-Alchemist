"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FileUploadSection from "@/components/FileUploadSection";
import DataGridsSection from "@/components/DataGridsSection";
import ValidationPanel from "@/components/ValidationPanel";
import AIToolsSection from "@/components/AIToolsSection";
import RuleBuilderSection from "@/components/RuleBuilderSection";
import PrioritizationSection from "@/components/PrioritizationSection";
import ExportSection from "@/components/ExportSection";
import DataModificationSection from "@/components/DataModificationSection";
import type { ProcessedData } from "@/lib/types";

export type ActiveSection =
  | "upload"
  | "data-grids"
  | "modify"
  | "rules"
  | "priorities"
  | "export";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("upload");
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null
  );
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dataModified, setDataModified] = useState(false);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);

  const handleDataProcessed = (data: ProcessedData) => {
    setProcessedData(data);
    setDataModified(false); // Fresh data, not modified
    // Automatically switch to data grids section after upload
    setActiveSection("data-grids");
    if (data.validationErrors.length > 0) {
      setValidationPanelOpen(true);
    }
  };

  const handleDataModified = (modifiedData: ProcessedData) => {
    console.log("📝 handleDataModified called with:", modifiedData);
    console.log(
      "📊 Data counts in handleDataModified - Clients:",
      modifiedData.clients.length,
      "Workers:",
      modifiedData.workers.length,
      "Tasks:",
      modifiedData.tasks.length
    );

    setProcessedData(modifiedData);
    setDataModified(true); // Mark as modified
    // Clear search results when data is modified
    setSearchResults(null);
    // Keep validation panel open if there are errors
    if (modifiedData.validationErrors.length > 0) {
      setValidationPanelOpen(true);
    }

    console.log("✅ handleDataModified completed - processedData updated");
  };

  const handleSearch = async (query: string) => {
    if (!processedData) return;

    setIsSearching(true);
    try {
      const formData = new FormData();
      formData.append("query", query);

      const response = await fetch(
        "https://data-alchemist-production.up.railway.app//nl_search",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === "success") {
        setSearchResults(result.results);
      } else {
        console.warn("Search failed:", result.message);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };
  const handleAIFix = async () => {
    if (!processedData) {
      console.warn("⚠️ No processed data available");
      return;
    }

    console.log("🔧 Starting AI Fix process...");
    setIsApplyingFixes(true);
    try {
      console.log("� Sending request to /apply_corrections...");

      const response = await fetch(
        "https://data-alchemist-production.up.railway.app//apply_corrections",
        {
          method: "POST",
        }
      );

      console.log("📥 Response status:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("🔍 Apply corrections response:", result);

      if (result.status === "success") {
        // Transform the response to match ProcessedData format
        const correctedData: ProcessedData = {
          clients: result.data.clients || [],
          workers: result.data.workers || [],
          tasks: result.data.tasks || [],
          validationErrors: result.errors || [],
          dataQuality: {
            totalRows:
              (result.summary?.total_clients || 0) +
              (result.summary?.total_workers || 0) +
              (result.summary?.total_tasks || 0),
            cleanRows:
              (result.summary?.total_clients || 0) +
              (result.summary?.total_workers || 0) +
              (result.summary?.total_tasks || 0) -
              (result.errors?.length || 0),
            errorRows: result.errors?.length || 0,
            qualityScore:
              result.errors?.length > 0
                ? Math.max(0, 100 - result.errors.length * 10)
                : 100,
          },
        };

        console.log("🔄 Corrected data:", correctedData);
        console.log(
          "📊 Data counts - Clients:",
          correctedData.clients.length,
          "Workers:",
          correctedData.workers.length,
          "Tasks:",
          correctedData.tasks.length
        );

        // Update the data with corrected version
        console.log("🔄 Calling handleDataModified...");
        handleDataModified(correctedData);
        console.log("✅ handleDataModified completed");

        // Show success message
        console.log(`✅ Auto-fix completed successfully!`);
        if (result.summary?.errors_fixed > 0) {
          console.log(
            `🔧 Fixed ${result.summary?.errors_fixed} errors automatically`
          );
        } else {
          console.log("ℹ️ No automatic fixes were needed");
        }
      } else {
        console.warn("❌ AI fix failed:", result.message || "Unknown error");
      }
    } catch (error) {
      console.error("❌ AI fix error:", error);
    } finally {
      console.log("🏁 Setting isApplyingFixes to false");
      setIsApplyingFixes(false);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "upload":
        return <FileUploadSection onDataProcessed={handleDataProcessed} />;
      case "data-grids":
        return (
          <DataGridsSection
            data={processedData}
            searchResults={searchResults}
            onDataUpdate={handleDataModified}
          />
        );
      case "modify":
        return (
          <DataModificationSection
            data={processedData}
            onDataModified={handleDataModified}
          />
        );
      case "rules":
        return (
          <RuleBuilderSection
            data={processedData}
            onDataUpdate={handleDataModified}
          />
        );
      case "priorities":
        return (
          <PrioritizationSection
            data={processedData}
            onDataUpdate={handleDataModified}
          />
        );
      case "export":
        return <ExportSection data={processedData} />;
      default:
        return <FileUploadSection onDataProcessed={handleDataProcessed} />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Grid pattern background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

      <Header
        onValidationToggle={() => setValidationPanelOpen(!validationPanelOpen)}
        validationPanelOpen={validationPanelOpen}
        errorCount={processedData?.validationErrors?.length || 0}
      />

      <div className="flex relative">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          errors={processedData?.validationErrors || []}
        />

        <main className="flex-1 p-6">
          {/* Only show AI tools on data-grids and modify sections */}
          {(activeSection === "data-grids" || activeSection === "modify") && (
            <AIToolsSection
              onSearch={handleSearch}
              onAIFix={handleAIFix}
              searchResults={searchResults}
              isSearching={isSearching}
              isApplyingFixes={isApplyingFixes}
            />
          )}
          <div className="relative">{renderActiveSection()}</div>
        </main>

        <ValidationPanel
          isOpen={validationPanelOpen}
          onClose={() => setValidationPanelOpen(false)}
          errors={processedData?.validationErrors || []}
          onAIFix={handleAIFix}
          isApplyingFixes={isApplyingFixes}
        />
      </div>
    </div>
  );
}
