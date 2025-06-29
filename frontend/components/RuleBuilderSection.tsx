"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Code,
  Eye,
  Sparkles,
  Download,
  Trash2,
  MessageSquare,
  Lightbulb,
  Settings,
  Zap,
  Target,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  GripVertical,
  RotateCcw,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  BarChart3,
  Scale,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import type {
  RuleConfig,
  ProcessedData,
  CoRunGroup,
  SlotRestriction,
  LoadLimit,
  PhaseWindow,
} from "@/lib/sample-data";

interface RuleBuilderSectionProps {
  data?: ProcessedData | null;
  onDataUpdate?: (updatedData: ProcessedData) => void;
}

export default function RuleBuilderSection({
  data,
  onDataUpdate,
}: RuleBuilderSectionProps) {
  const [rules, setRules] = useState<RuleConfig>({
    coRunGroups: [],
    slotRestrictions: [],
    loadLimits: [],
    phaseWindows: [],
    patternMatches: [],
    precedenceOverrides: [],
    customRules: [],
  });

  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [isGeneratingRule, setIsGeneratingRule] = useState(false);
  const [generatedRule, setGeneratedRule] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  // Form states for manual rule creation
  const [coRunForm, setCoRunForm] = useState({
    name: "",
    taskIds: [] as string[],
    description: "",
  });
  const [slotRestrictionForm, setSlotRestrictionForm] = useState({
    name: "",
    groupType: "client" as "client" | "worker",
    groupIds: [] as string[],
    minCommonSlots: 1,
    description: "",
  });
  const [loadLimitForm, setLoadLimitForm] = useState({
    name: "",
    workerGroupIds: [] as string[],
    maxSlotsPerPhase: 1,
    phases: [] as number[],
    description: "",
  });
  const [phaseWindowForm, setPhaseWindowForm] = useState({
    name: "",
    taskId: "",
    allowedPhases: [] as number[],
    description: "",
  });
  const [isApplyingRules, setIsApplyingRules] = useState(false);

  // Prioritization System State
  const [prioritizationConfig, setPrioritizationConfig] = useState({
    priorityWeights: {
      priorityLevel: 0.3,
      taskUrgency: 0.25,
      fairDistribution: 0.2,
      requestedTasks: 0.15,
      clientBudget: 0.1,
    },
    urgencyMapping: {
      high: 10,
      medium: 5,
      low: 1,
      critical: 15,
    },
    fairnessSettings: {
      enableLoadBalancing: true,
      maxTasksPerClient: 5,
      preferredDistribution: "balanced" as
        | "balanced"
        | "priority-based"
        | "round-robin",
    },
    customPriorityRules: [] as Array<{
      id: string;
      name: string;
      condition: string;
      priorityBoost: number;
      enabled: boolean;
    }>,
  });

  const [priorityRankingForm, setPriorityRankingForm] = useState({
    name: "",
    clientIds: [] as string[],
    taskIds: [] as string[],
    priorityBoost: 1,
    urgencyLevel: "medium" as "low" | "medium" | "high" | "critical",
    description: "",
  });

  const [dragDropRanking, setDragDropRanking] = useState<
    Array<{
      id: string;
      type: "client" | "task";
      name: string;
      currentPriority: number;
      newPriority?: number;
    }>
  >([]);

  const [advancedPrioritySettings, setAdvancedPrioritySettings] = useState({
    enableDynamicPriority: true,
    timeDecayFactor: 0.1,
    budgetThresholds: {
      high: 50000,
      medium: 25000,
      low: 10000,
    },
    taskComplexityWeights: {
      simple: 1,
      medium: 1.5,
      complex: 2,
    },
  });

  const jsonPreview = JSON.stringify(rules, null, 2);

  // Load rule recommendations when data is available
  useEffect(() => {
    if (data && data.clients.length > 0) {
      loadRuleRecommendations();
    }
  }, [data]);

  const loadRuleRecommendations = async () => {
    if (!data) return;

    setIsLoadingRecommendations(true);
    try {
      const response = await fetch(
        "http://localhost:8000/ai_rule_recommendations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clients: data.clients,
            workers: data.workers,
            tasks: data.tasks,
          }),
        }
      );

      const result = await response.json();
      if (result.status === "success") {
        // Map backend rule structure to frontend expected structure
        const mappedRecommendations = (result.rules || []).map((rule: any) => ({
          title: rule.name || "Unnamed Rule",
          description: rule.description || "No description provided",
          impact:
            rule.type === "priorityRule"
              ? "High"
              : rule.type === "loadLimit"
              ? "Medium"
              : "Low",
          reasoning: `This ${
            rule.type
          } rule helps optimize task allocation based on ${
            rule.parameters
              ? Object.keys(rule.parameters).join(", ")
              : "specific criteria"
          }.`,
          rule: rule, // Keep the original rule for adding to rules
        }));
        setRecommendations(mappedRecommendations);
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const generateRuleFromNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim() || !data) return;

    console.log("Generating rule from:", naturalLanguageInput);
    setIsGeneratingRule(true);

    try {
      const response = await fetch("http://localhost:8000/ai_generate_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: naturalLanguageInput,
        }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("AI generate result:", result);

      if (result.status === "success" && result.rule) {
        setGeneratedRule({
          success: true,
          rule: result.rule,
          ruleType: result.rule.type || "priorityRule", // Default to priorityRule
          confidence: 0.8,
          explanation: result.rule.description || "AI-generated rule",
        });
        console.log("Generated rule set:", result.rule);
      } else {
        console.error("Rule generation failed:", result);
        setGeneratedRule({
          success: false,
          error: result.message || "Failed to generate rule",
        });
      }
    } catch (error) {
      console.error("Failed to generate rule:", error);
      setGeneratedRule({
        success: false,
        error: "Failed to connect to AI service",
      });
    } finally {
      setIsGeneratingRule(false);
    }
  };

  const addGeneratedRule = () => {
    if (!generatedRule) return;

    const newRule = {
      ...generatedRule.rule,
      id: `${generatedRule.ruleType.toLowerCase()}_${Date.now()}`,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => {
      const updated = { ...prev };
      switch (generatedRule.ruleType) {
        case "CoRunGroup":
          updated.coRunGroups = [...prev.coRunGroups, newRule];
          break;
        case "SlotRestriction":
          updated.slotRestrictions = [...prev.slotRestrictions, newRule];
          break;
        case "LoadLimit":
          updated.loadLimits = [...prev.loadLimits, newRule];
          break;
        case "PhaseWindow":
          updated.phaseWindows = [...prev.phaseWindows, newRule];
          break;
        default:
          updated.customRules = [...prev.customRules, newRule];
      }
      return updated;
    });

    setGeneratedRule(null);
    setNaturalLanguageInput("");

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const addCoRunGroup = () => {
    if (!coRunForm.name || coRunForm.taskIds.length === 0) return;

    const newRule: CoRunGroup = {
      id: `corun_${Date.now()}`,
      name: coRunForm.name,
      taskIds: coRunForm.taskIds,
      description: coRunForm.description,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => ({
      ...prev,
      coRunGroups: [...prev.coRunGroups, newRule],
    }));

    setCoRunForm({ name: "", taskIds: [], description: "" });

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const addSlotRestriction = () => {
    if (!slotRestrictionForm.name || slotRestrictionForm.groupIds.length === 0)
      return;

    const newRule: SlotRestriction = {
      id: `slot_${Date.now()}`,
      name: slotRestrictionForm.name,
      groupType: slotRestrictionForm.groupType,
      groupIds: slotRestrictionForm.groupIds,
      minCommonSlots: slotRestrictionForm.minCommonSlots,
      description: slotRestrictionForm.description,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => ({
      ...prev,
      slotRestrictions: [...prev.slotRestrictions, newRule],
    }));

    setSlotRestrictionForm({
      name: "",
      groupType: "client",
      groupIds: [],
      minCommonSlots: 1,
      description: "",
    });

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const addLoadLimit = () => {
    if (!loadLimitForm.name || loadLimitForm.workerGroupIds.length === 0)
      return;

    const newRule: LoadLimit = {
      id: `load_${Date.now()}`,
      name: loadLimitForm.name,
      workerGroupIds: loadLimitForm.workerGroupIds,
      maxSlotsPerPhase: loadLimitForm.maxSlotsPerPhase,
      phases: loadLimitForm.phases,
      description: loadLimitForm.description,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => ({
      ...prev,
      loadLimits: [...prev.loadLimits, newRule],
    }));

    setLoadLimitForm({
      name: "",
      workerGroupIds: [],
      maxSlotsPerPhase: 1,
      phases: [],
      description: "",
    });

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const addPhaseWindow = () => {
    if (!phaseWindowForm.name || !phaseWindowForm.taskId) return;

    const newRule: PhaseWindow = {
      id: `phase_${Date.now()}`,
      name: phaseWindowForm.name,
      taskId: phaseWindowForm.taskId,
      allowedPhases: phaseWindowForm.allowedPhases,
      description: phaseWindowForm.description,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => ({
      ...prev,
      phaseWindows: [...prev.phaseWindows, newRule],
    }));

    setPhaseWindowForm({
      name: "",
      taskId: "",
      allowedPhases: [],
      description: "",
    });

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const removeRule = (ruleType: string, ruleId: string) => {
    setRules((prev) => {
      const updated = { ...prev };
      switch (ruleType) {
        case "coRunGroups":
          updated.coRunGroups = prev.coRunGroups.filter((r) => r.id !== ruleId);
          break;
        case "slotRestrictions":
          updated.slotRestrictions = prev.slotRestrictions.filter(
            (r) => r.id !== ruleId
          );
          break;
        case "loadLimits":
          updated.loadLimits = prev.loadLimits.filter((r) => r.id !== ruleId);
          break;
        case "phaseWindows":
          updated.phaseWindows = prev.phaseWindows.filter(
            (r) => r.id !== ruleId
          );
          break;
        case "customRules":
          updated.customRules = prev.customRules.filter((r) => r.id !== ruleId);
          break;
      }
      return updated;
    });
  };

  const exportRules = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `rules_${
      new Date().toISOString().split("T")[0]
    }.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Apply rules to data
  const applyRulesToData = async () => {
    if (!data || !onDataUpdate) {
      console.log("No data or onDataUpdate function available");
      return;
    }

    console.log(
      "Current data before applying rules:",
      data.clients.slice(0, 2)
    );

    setIsApplyingRules(true);
    try {
      // Collect all rules into a single array
      const allRules = [
        ...rules.coRunGroups.map((rule) => ({ ...rule, type: "coRun" })),
        ...rules.slotRestrictions.map((rule) => ({
          ...rule,
          type: "slotRestriction",
        })),
        ...rules.loadLimits.map((rule) => ({ ...rule, type: "loadLimit" })),
        ...rules.phaseWindows.map((rule) => ({ ...rule, type: "phaseWindow" })),
        ...rules.patternMatches.map((rule) => ({
          ...rule,
          type: "patternMatch",
        })),
        ...rules.customRules.map((rule) => ({
          ...rule,
          type: rule.type || "priorityRule", // Make sure type is set
        })),
      ];

      console.log("All rules to apply:", allRules);

      if (allRules.length === 0) {
        console.log("No rules to apply");
        return;
      }

      const response = await fetch("http://localhost:8000/apply_rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: allRules }),
      });

      console.log("Apply rules response status:", response.status);
      const result = await response.json();
      console.log("Apply rules result:", result);

      if (result.status === "success") {
        console.log("Rules applied successfully");
        console.log(
          "Updated data from backend:",
          result.data.clients.slice(0, 2)
        );

        // Update the data with the modified data from backend
        const updatedData = {
          ...data,
          clients: result.data.clients,
          workers: result.data.workers,
          tasks: result.data.tasks,
        };

        console.log(
          "Calling onDataUpdate with:",
          updatedData.clients.slice(0, 2)
        );
        onDataUpdate(updatedData);

        // Show success message
        console.log(
          `Applied ${result.results.applied_count} out of ${result.results.total_rules} rules`
        );
      } else {
        console.error("Failed to apply rules:", result.message);
      }
    } catch (error) {
      console.error("Error applying rules:", error);
    } finally {
      setIsApplyingRules(false);
    }
  };

  // Prioritization System Methods
  const updatePriorityWeights = (category: string, value: number) => {
    setPrioritizationConfig((prev) => ({
      ...prev,
      priorityWeights: {
        ...prev.priorityWeights,
        [category]: value / 100, // Convert percentage to decimal
      },
    }));
  };

  const addPriorityRule = () => {
    if (!priorityRankingForm.name) return;

    const newPriorityRule = {
      id: `priority_${Date.now()}`,
      name: priorityRankingForm.name,
      type: "priorityRule",
      conditions: [
        {
          clientIds: priorityRankingForm.clientIds,
          taskIds: priorityRankingForm.taskIds,
          urgencyLevel: priorityRankingForm.urgencyLevel,
        },
      ],
      actions: [
        {
          type: "boost_priority",
          value: priorityRankingForm.priorityBoost,
        },
      ],
      description: priorityRankingForm.description,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => ({
      ...prev,
      customRules: [...prev.customRules, newPriorityRule],
    }));

    setPriorityRankingForm({
      name: "",
      clientIds: [],
      taskIds: [],
      priorityBoost: 1,
      urgencyLevel: "medium",
      description: "",
    });

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const initializeDragDropRanking = () => {
    if (!data) return;

    const items = [
      ...data.clients.map((client) => ({
        id: client.clientId,
        type: "client" as const,
        name: client.name || client.clientId,
        currentPriority:
          client.priority === "High" ? 5 : client.priority === "Medium" ? 3 : 1,
      })),
      ...data.tasks.map((task) => ({
        id: task.taskId,
        type: "task" as const,
        name: task.title || task.taskId,
        currentPriority: task.priority || 3,
      })),
    ];

    setDragDropRanking(items);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(dragDropRanking);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priorities based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      newPriority: items.length - index, // Higher position = higher priority
    }));

    setDragDropRanking(updatedItems);
  };

  const applyDragDropRanking = () => {
    if (!data || !onDataUpdate) return;

    const updatedData = { ...data };

    dragDropRanking.forEach((item) => {
      if (item.newPriority && item.newPriority !== item.currentPriority) {
        if (item.type === "client") {
          const client = updatedData.clients.find(
            (c) => c.clientId === item.id
          );
          if (client) {
            // Convert numeric priority back to string format
            client.priority =
              item.newPriority >= 4
                ? "High"
                : item.newPriority >= 2
                ? "Medium"
                : "Low";
          }
        } else if (item.type === "task") {
          const task = updatedData.tasks.find((t) => t.taskId === item.id);
          if (task) {
            task.priority = item.newPriority;
          }
        }
      }
    });

    onDataUpdate(updatedData);
  };

  const calculateDynamicPriority = (entity: any, type: "client" | "task") => {
    let score = 0;
    const weights = prioritizationConfig.priorityWeights;

    // Base priority level
    if (type === "client") {
      const basePriority =
        entity.priority === "High" ? 5 : entity.priority === "Medium" ? 3 : 1;
      score += basePriority * weights.priorityLevel;
    } else {
      const basePriority = entity.priority || 3;
      score += basePriority * weights.priorityLevel;
    }

    // Task urgency
    if (type === "task" && entity.urgency) {
      const urgencyLevel =
        entity.urgency as keyof typeof prioritizationConfig.urgencyMapping;
      const urgencyScore =
        prioritizationConfig.urgencyMapping[urgencyLevel] || 1;
      score += urgencyScore * weights.taskUrgency;
    }

    // Client budget (for clients only)
    if (type === "client" && entity.attributesJSON) {
      try {
        const attributes = JSON.parse(entity.attributesJSON);
        const budget = attributes.budget || 0;
        const budgetScore =
          budget > advancedPrioritySettings.budgetThresholds.high
            ? 3
            : budget > advancedPrioritySettings.budgetThresholds.medium
            ? 2
            : 1;
        score += budgetScore * weights.clientBudget;
      } catch (e) {
        // Invalid JSON, skip budget consideration
      }
    }

    // Requested tasks match
    if (type === "client" && entity.requestedTaskIds) {
      const requestedTasks = entity.requestedTaskIds.length;
      score += requestedTasks * weights.requestedTasks;
    }

    return Math.round(score * 10) / 10; // Round to 1 decimal place
  };

  const generateFairDistributionRule = () => {
    const fairnessRule = {
      id: `fairness_${Date.now()}`,
      name: "Fair Distribution Rule",
      type: "fairnessRule",
      conditions: [
        {
          type: "fairness_check",
          maxTasksPerClient:
            prioritizationConfig.fairnessSettings.maxTasksPerClient,
          distributionType:
            prioritizationConfig.fairnessSettings.preferredDistribution,
        },
      ],
      actions: [
        {
          type: "redistribute_tasks",
          enableLoadBalancing:
            prioritizationConfig.fairnessSettings.enableLoadBalancing,
        },
      ],
      description: `Ensures fair distribution of tasks with max ${prioritizationConfig.fairnessSettings.maxTasksPerClient} tasks per client`,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => ({
      ...prev,
      customRules: [...prev.customRules, fairnessRule],
    }));

    // Auto-apply the new rule
    setTimeout(applyRulesToData, 100);
  };

  const totalRules =
    rules.coRunGroups.length +
    rules.slotRestrictions.length +
    rules.loadLimits.length +
    rules.phaseWindows.length +
    rules.customRules.length;

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
                  <Settings className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    Rule Builder
                  </h2>
                  <p className="text-muted-foreground">
                    Create custom rules for resource allocation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  <Target className="h-3 w-3 mr-1" />
                  {totalRules} Rules
                </Badge>
                <Button
                  onClick={exportRules}
                  disabled={totalRules === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Rules
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Natural Language Rule Generator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-background" />
              </div>
              <span>
                AI Rule Generator
              </span>
              <Badge variant="secondary">
                <Zap className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">
                Describe your rule in plain English
              </Label>
              <Textarea
                placeholder="e.g., 'Tasks T001 and T003 should always run together' or 'High priority clients should get maximum 3 slots per phase'"
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={generateRuleFromNaturalLanguage}
                disabled={isGeneratingRule || !naturalLanguageInput.trim()}
              >
                {isGeneratingRule ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Generate Rule
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={loadRuleRecommendations}
                disabled={isLoadingRecommendations}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Get AI Recommendations
              </Button>
            </div>

            {/* Generated Rule Preview */}
            {generatedRule && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {generatedRule.success ? (
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          Generated Rule: {generatedRule.ruleType}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        >
                          Confidence: {generatedRule.confidence}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {generatedRule.explanation}
                      </p>
                      <div className="bg-white/50 dark:bg-gray-900/50 p-3 rounded-lg border backdrop-blur-sm">
                        <pre className="text-xs overflow-auto text-muted-foreground">
                          {JSON.stringify(generatedRule.rule, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={addGeneratedRule}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Add Rule
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setGeneratedRule(null)}
                          size="sm"
                        >
                          Discard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-red-200/50 bg-gradient-to-r from-red-50/80 to-red-50/80 dark:from-red-950/30 dark:to-red-950/30 dark:border-red-800/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        Rule Generation Failed
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {generatedRule.error}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setGeneratedRule(null)}
                        size="sm"
                      >
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-background" />
                </div>
                <span>
                  AI Rule Recommendations
                </span>
                <Badge variant="secondary">
                  {recommendations.length} suggestions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="border hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {rec.title}
                          </CardTitle>
                          <Badge
                            variant={
                              rec.impact === "High"
                                ? "destructive"
                                : rec.impact === "Medium"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              rec.impact === "High"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : rec.impact === "Medium"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                            }
                          >
                            {rec.impact}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-2">
                          {rec.description}
                        </p>
                        <p className="text-xs mb-3">
                          <strong>Why:</strong> {rec.reasoning}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Add the recommended rule
                            const originalRule = rec.rule;
                            const newRule = {
                              ...originalRule,
                              id: `${originalRule.type.toLowerCase()}_${Date.now()}_${index}`,
                              priority: 1,
                              createdAt: new Date().toISOString(),
                            };

                            setRules((prev) => {
                              const updated = { ...prev };
                              switch (originalRule.type) {
                                case "coRun":
                                  updated.coRunGroups = [
                                    ...prev.coRunGroups,
                                    newRule,
                                  ];
                                  break;
                                case "loadLimit":
                                  updated.loadLimits = [
                                    ...prev.loadLimits,
                                    newRule,
                                  ];
                                  break;
                                case "phaseWindow":
                                  updated.phaseWindows = [
                                    ...prev.phaseWindows,
                                    newRule,
                                  ];
                                  break;
                                case "slotRestriction":
                                  updated.slotRestrictions = [
                                    ...prev.slotRestrictions,
                                    newRule,
                                  ];
                                  break;
                                case "patternMatch":
                                  updated.patternMatches = [
                                    ...prev.patternMatches,
                                    newRule,
                                  ];
                                  break;
                                case "priorityRule":
                                  updated.precedenceOverrides = [
                                    ...prev.precedenceOverrides,
                                    newRule,
                                  ];
                                  break;
                                default:
                                  updated.customRules = [
                                    ...prev.customRules,
                                    newRule,
                                  ];
                              }
                              return updated;
                            });

                            // Auto-apply the new rule
                            setTimeout(applyRulesToData, 100);
                          }}
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Add Rule
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Tabs defaultValue="corun" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="corun">Co-run</TabsTrigger>
              <TabsTrigger value="slots">Slots</TabsTrigger>
              <TabsTrigger value="load">Load</TabsTrigger>
              <TabsTrigger value="phase">Phase</TabsTrigger>
              <TabsTrigger value="priority">Priority</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="corun">
              <Card>
                <CardHeader>
                  <CardTitle>Co-run Group Creator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Group Name</Label>
                    <Input
                      placeholder="Enter group name"
                      value={coRunForm.name}
                      onChange={(e) =>
                        setCoRunForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Select Tasks</Label>
                    <Select
                      onValueChange={(value) => {
                        if (!coRunForm.taskIds.includes(value)) {
                          setCoRunForm((prev) => ({
                            ...prev,
                            taskIds: [...prev.taskIds, value],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tasks to group" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.tasks.map((task, index) => (
                          <SelectItem
                            key={`corun-task-${task.taskId}-${index}`}
                            value={task.taskId}
                          >
                            {task.taskId} - {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {coRunForm.taskIds.map((taskId) => (
                        <Badge
                          key={taskId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setCoRunForm((prev) => ({
                              ...prev,
                              taskIds: prev.taskIds.filter(
                                (id) => id !== taskId
                              ),
                            }))
                          }
                        >
                          {taskId} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Optional description"
                      value={coRunForm.description}
                      onChange={(e) =>
                        setCoRunForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    onClick={addCoRunGroup}
                    disabled={!coRunForm.name || coRunForm.taskIds.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Co-run Group
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="slots">
              <Card>
                <CardHeader>
                  <CardTitle>Slot Restriction Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Restriction Name</Label>
                    <Input
                      placeholder="Enter restriction name"
                      value={slotRestrictionForm.name}
                      onChange={(e) =>
                        setSlotRestrictionForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Group Type</Label>
                    <Select
                      value={slotRestrictionForm.groupType}
                      onValueChange={(value: "client" | "worker") =>
                        setSlotRestrictionForm((prev) => ({
                          ...prev,
                          groupType: value,
                          groupIds: [],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="client" value="client">
                          Client Groups
                        </SelectItem>
                        <SelectItem key="worker" value="worker">
                          Worker Groups
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Groups</Label>
                    <Select
                      onValueChange={(value) => {
                        if (!slotRestrictionForm.groupIds.includes(value)) {
                          setSlotRestrictionForm((prev) => ({
                            ...prev,
                            groupIds: [...prev.groupIds, value],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select groups" />
                      </SelectTrigger>
                      <SelectContent>
                        {slotRestrictionForm.groupType === "client"
                          ? data?.clients.map((client, index) => (
                              <SelectItem
                                key={`slot-client-${client.clientId}-${index}`}
                                value={client.clientId}
                              >
                                {client.clientId} - {client.name}
                              </SelectItem>
                            ))
                          : data?.workers.map((worker, index) => (
                              <SelectItem
                                key={`slot-worker-${worker.workerId}-${index}`}
                                value={worker.workerId}
                              >
                                {worker.workerId} - {worker.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {slotRestrictionForm.groupIds.map((groupId) => (
                        <Badge
                          key={groupId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setSlotRestrictionForm((prev) => ({
                              ...prev,
                              groupIds: prev.groupIds.filter(
                                (id) => id !== groupId
                              ),
                            }))
                          }
                        >
                          {groupId} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Min Common Slots</Label>
                    <Input
                      type="number"
                      min="1"
                      value={slotRestrictionForm.minCommonSlots}
                      onChange={(e) =>
                        setSlotRestrictionForm((prev) => ({
                          ...prev,
                          minCommonSlots: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <Button
                    onClick={addSlotRestriction}
                    disabled={
                      !slotRestrictionForm.name ||
                      slotRestrictionForm.groupIds.length === 0
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slot Restriction
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="load">
              <Card>
                <CardHeader>
                  <CardTitle>Load Limit Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Load Limit Name</Label>
                    <Input
                      placeholder="Enter load limit name"
                      value={loadLimitForm.name}
                      onChange={(e) =>
                        setLoadLimitForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Worker Groups</Label>
                    <Select
                      onValueChange={(value) => {
                        if (!loadLimitForm.workerGroupIds.includes(value)) {
                          setLoadLimitForm((prev) => ({
                            ...prev,
                            workerGroupIds: [...prev.workerGroupIds, value],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker groups" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.workers.map((worker, index) => (
                          <SelectItem
                            key={`load-worker-${worker.workerId}-${index}`}
                            value={worker.workerId}
                          >
                            {worker.workerId} - {worker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {loadLimitForm.workerGroupIds.map((workerId) => (
                        <Badge
                          key={workerId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setLoadLimitForm((prev) => ({
                              ...prev,
                              workerGroupIds: prev.workerGroupIds.filter(
                                (id) => id !== workerId
                              ),
                            }))
                          }
                        >
                          {workerId} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Max Slots Per Phase</Label>
                    <Input
                      type="number"
                      min="1"
                      value={loadLimitForm.maxSlotsPerPhase}
                      onChange={(e) =>
                        setLoadLimitForm((prev) => ({
                          ...prev,
                          maxSlotsPerPhase: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Phases</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((phase) => (
                        <Button
                          key={phase}
                          variant={
                            loadLimitForm.phases.includes(phase)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setLoadLimitForm((prev) => ({
                              ...prev,
                              phases: prev.phases.includes(phase)
                                ? prev.phases.filter((p) => p !== phase)
                                : [...prev.phases, phase],
                            }))
                          }
                        >
                          Phase {phase}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={addLoadLimit}
                    disabled={
                      !loadLimitForm.name ||
                      loadLimitForm.workerGroupIds.length === 0
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Load Limit
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="phase">
              <Card>
                <CardHeader>
                  <CardTitle>Phase Window Picker</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Window Name</Label>
                    <Input
                      placeholder="Enter phase window name"
                      value={phaseWindowForm.name}
                      onChange={(e) =>
                        setPhaseWindowForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Task</Label>
                    <Select
                      value={phaseWindowForm.taskId}
                      onValueChange={(value) =>
                        setPhaseWindowForm((prev) => ({
                          ...prev,
                          taskId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.tasks.map((task, index) => (
                          <SelectItem
                            key={`phase-task-${task.taskId}-${index}`}
                            value={task.taskId}
                          >
                            {task.taskId} - {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Allowed Phases</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((phase) => (
                        <Button
                          key={phase}
                          variant={
                            phaseWindowForm.allowedPhases.includes(phase)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setPhaseWindowForm((prev) => ({
                              ...prev,
                              allowedPhases: prev.allowedPhases.includes(phase)
                                ? prev.allowedPhases.filter((p) => p !== phase)
                                : [...prev.allowedPhases, phase],
                            }))
                          }
                        >
                          Phase {phase}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={addPhaseWindow}
                    disabled={!phaseWindowForm.name || !phaseWindowForm.taskId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Phase Window
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Priority Management Tab */}
            <TabsContent value="priority">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Priority Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Priority Weights Configuration */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Priority Weights
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(prioritizationConfig.priorityWeights).map(
                        ([key, value]) => (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label className="capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </Label>
                              <span className="text-sm font-medium">
                                {Math.round(value * 100)}%
                              </span>
                            </div>
                            <Slider
                              value={[value * 100]}
                              onValueChange={(values) =>
                                updatePriorityWeights(key, values[0])
                              }
                              max={100}
                              step={5}
                              className="w-full"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Urgency Mapping */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Task Urgency Mapping
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(prioritizationConfig.urgencyMapping).map(
                        ([level, score]) => (
                          <div
                            key={level}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  level === "critical"
                                    ? "destructive"
                                    : level === "high"
                                    ? "default"
                                    : "secondary"
                                }
                                className="capitalize"
                              >
                                {level}
                              </Badge>
                            </div>
                            <Input
                              type="number"
                              value={score}
                              onChange={(e) => {
                                const newScore = parseInt(e.target.value) || 0;
                                setPrioritizationConfig((prev) => ({
                                  ...prev,
                                  urgencyMapping: {
                                    ...prev.urgencyMapping,
                                    [level]: newScore,
                                  },
                                }));
                              }}
                              className="w-20 text-center"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Fair Distribution Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Fair Distribution
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableLoadBalancing"
                          checked={
                            prioritizationConfig.fairnessSettings
                              .enableLoadBalancing
                          }
                          onCheckedChange={(checked) => {
                            setPrioritizationConfig((prev) => ({
                              ...prev,
                              fairnessSettings: {
                                ...prev.fairnessSettings,
                                enableLoadBalancing: checked as boolean,
                              },
                            }));
                          }}
                        />
                        <Label htmlFor="enableLoadBalancing">
                          Enable Load Balancing
                        </Label>
                      </div>

                      <div className="flex items-center gap-4">
                        <Label className="min-w-fit">
                          Max Tasks per Client:
                        </Label>
                        <Input
                          type="number"
                          value={
                            prioritizationConfig.fairnessSettings
                              .maxTasksPerClient
                          }
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            setPrioritizationConfig((prev) => ({
                              ...prev,
                              fairnessSettings: {
                                ...prev.fairnessSettings,
                                maxTasksPerClient: value,
                              },
                            }));
                          }}
                          className="w-20"
                          min="1"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <Label className="min-w-fit">Distribution Type:</Label>
                        <Select
                          value={
                            prioritizationConfig.fairnessSettings
                              .preferredDistribution
                          }
                          onValueChange={(
                            value: "balanced" | "priority-based" | "round-robin"
                          ) => {
                            setPrioritizationConfig((prev) => ({
                              ...prev,
                              fairnessSettings: {
                                ...prev.fairnessSettings,
                                preferredDistribution: value,
                              },
                            }));
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="priority-based">
                              Priority-Based
                            </SelectItem>
                            <SelectItem value="round-robin">
                              Round-Robin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={generateFairDistributionRule}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      <Scale className="h-4 w-4 mr-2" />
                      Generate Fair Distribution Rule
                    </Button>
                  </div>

                  <Separator />

                  {/* Priority Rule Form */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Create Priority Rule
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Rule Name</Label>
                        <Input
                          placeholder="e.g., High-budget client priority"
                          value={priorityRankingForm.name}
                          onChange={(e) =>
                            setPriorityRankingForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label>Select Clients (Optional)</Label>
                        <Select
                          onValueChange={(value) => {
                            if (
                              !priorityRankingForm.clientIds.includes(value)
                            ) {
                              setPriorityRankingForm((prev) => ({
                                ...prev,
                                clientIds: [...prev.clientIds, value],
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select clients to prioritize" />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.clients.map((client, index) => (
                              <SelectItem
                                key={`priority-client-${client.clientId}-${index}`}
                                value={client.clientId}
                              >
                                {client.clientId} - {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {priorityRankingForm.clientIds.map((clientId) => (
                            <Badge
                              key={clientId}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() =>
                                setPriorityRankingForm((prev) => ({
                                  ...prev,
                                  clientIds: prev.clientIds.filter(
                                    (id) => id !== clientId
                                  ),
                                }))
                              }
                            >
                              {clientId} ×
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Select Tasks (Optional)</Label>
                        <Select
                          onValueChange={(value) => {
                            if (!priorityRankingForm.taskIds.includes(value)) {
                              setPriorityRankingForm((prev) => ({
                                ...prev,
                                taskIds: [...prev.taskIds, value],
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select specific tasks" />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.tasks.map((task, index) => (
                              <SelectItem
                                key={`priority-task-${task.taskId}-${index}`}
                                value={task.taskId}
                              >
                                {task.taskId} - {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {priorityRankingForm.taskIds.map((taskId) => (
                            <Badge
                              key={taskId}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() =>
                                setPriorityRankingForm((prev) => ({
                                  ...prev,
                                  taskIds: prev.taskIds.filter(
                                    (id) => id !== taskId
                                  ),
                                }))
                              }
                            >
                              {taskId} ×
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Priority Boost</Label>
                          <Input
                            type="number"
                            value={priorityRankingForm.priorityBoost}
                            onChange={(e) =>
                              setPriorityRankingForm((prev) => ({
                                ...prev,
                                priorityBoost: parseFloat(e.target.value) || 1,
                              }))
                            }
                            step="0.1"
                            min="0"
                          />
                        </div>

                        <div>
                          <Label>Urgency Level</Label>
                          <Select
                            value={priorityRankingForm.urgencyLevel}
                            onValueChange={(
                              value: "low" | "medium" | "high" | "critical"
                            ) =>
                              setPriorityRankingForm((prev) => ({
                                ...prev,
                                urgencyLevel: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Describe when this rule should apply"
                          value={priorityRankingForm.description}
                          onChange={(e) =>
                            setPriorityRankingForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <Button
                      onClick={addPriorityRule}
                      disabled={!priorityRankingForm.name}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Priority Rule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Drag & Drop Ranking Tab */}
            <TabsContent value="ranking">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5" />
                    Drag & Drop Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Initialize Ranking */}
                  <div className="flex gap-2">
                    <Button
                      onClick={initializeDragDropRanking}
                      variant="outline"
                      disabled={!data}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Initialize Ranking
                    </Button>
                    <Button
                      onClick={applyDragDropRanking}
                      disabled={dragDropRanking.length === 0}
                      className="bg-gradient-to-r from-green-500 to-emerald-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply Ranking
                    </Button>
                  </div>

                  {/* Drag Drop List */}
                  {dragDropRanking.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold">
                        Drag to Reorder (Higher = More Priority)
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {dragDropRanking.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-900 hover:shadow-md transition-shadow cursor-move"
                            draggable
                            onDragStart={(e: React.DragEvent) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                index.toString()
                              );
                            }}
                            onDragOver={(e: React.DragEvent) =>
                              e.preventDefault()
                            }
                            onDrop={(e: React.DragEvent) => {
                              e.preventDefault();
                              const dragIndex = parseInt(
                                e.dataTransfer.getData("text/plain")
                              );
                              const hoverIndex = index;

                              if (dragIndex === hoverIndex) return;

                              const draggedItem = dragDropRanking[dragIndex];
                              const newRanking = [...dragDropRanking];
                              newRanking.splice(dragIndex, 1);
                              newRanking.splice(hoverIndex, 0, draggedItem);

                              // Update priorities based on new order
                              const updatedRanking = newRanking.map(
                                (rankItem, idx) => ({
                                  ...rankItem,
                                  newPriority: newRanking.length - idx,
                                })
                              );

                              setDragDropRanking(updatedRanking);
                            }}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  item.type === "client"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {item.type}
                              </Badge>
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Current: {item.currentPriority}
                              </span>
                              {item.newPriority &&
                                item.newPriority !== item.currentPriority && (
                                  <>
                                    <ArrowRight className="h-3 w-3" />
                                    <span className="text-sm font-medium text-green-600">
                                      New: {item.newPriority}
                                    </span>
                                  </>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Advanced Priority Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Advanced Settings
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableDynamicPriority"
                          checked={
                            advancedPrioritySettings.enableDynamicPriority
                          }
                          onCheckedChange={(checked) => {
                            setAdvancedPrioritySettings((prev) => ({
                              ...prev,
                              enableDynamicPriority: checked as boolean,
                            }));
                          }}
                        />
                        <Label htmlFor="enableDynamicPriority">
                          Enable Dynamic Priority Calculation
                        </Label>
                      </div>

                      <div className="flex items-center gap-4">
                        <Label className="min-w-fit">Time Decay Factor:</Label>
                        <Slider
                          value={[
                            advancedPrioritySettings.timeDecayFactor * 100,
                          ]}
                          onValueChange={(values) => {
                            setAdvancedPrioritySettings((prev) => ({
                              ...prev,
                              timeDecayFactor: values[0] / 100,
                            }));
                          }}
                          max={50}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm min-w-fit">
                          {Math.round(
                            advancedPrioritySettings.timeDecayFactor * 100
                          )}
                          %
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label>Budget Thresholds</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(
                            advancedPrioritySettings.budgetThresholds
                          ).map(([level, threshold]) => (
                            <div key={level} className="space-y-1">
                              <Label className="text-xs capitalize">
                                {level}
                              </Label>
                              <Input
                                type="number"
                                value={threshold}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  setAdvancedPrioritySettings((prev) => ({
                                    ...prev,
                                    budgetThresholds: {
                                      ...prev.budgetThresholds,
                                      [level]: value,
                                    },
                                  }));
                                }}
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Task Complexity Weights</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(
                            advancedPrioritySettings.taskComplexityWeights
                          ).map(([level, weight]) => (
                            <div key={level} className="space-y-1">
                              <Label className="text-xs capitalize">
                                {level}
                              </Label>
                              <Input
                                type="number"
                                value={weight}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 1;
                                  setAdvancedPrioritySettings((prev) => ({
                                    ...prev,
                                    taskComplexityWeights: {
                                      ...prev.taskComplexityWeights,
                                      [level]: value,
                                    },
                                  }));
                                }}
                                step="0.1"
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Priority Preview */}
                  {data && advancedPrioritySettings.enableDynamicPriority && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Dynamic Priority Preview
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.clients.slice(0, 5).map((client, index) => {
                          const dynamicScore = calculateDynamicPriority(
                            client,
                            "client"
                          );
                          return (
                            <div
                              key={client.clientId}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <span className="text-sm">
                                {client.name || client.clientId}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {client.priority}
                                </Badge>
                                <ArrowRight className="h-3 w-3" />
                                <Badge variant="default">{dynamicScore}</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Rules Preview and JSON */}
        <div className="space-y-4">
          {/* Active Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active Rules
                <Badge variant="secondary">{totalRules}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {/* Co-run Groups */}
              {rules.coRunGroups.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted rounded"
                >
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Co-run: {rule.taskIds.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule("coRunGroups", rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Slot Restrictions */}
              {rules.slotRestrictions.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted rounded"
                >
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {rule.groupType}: {rule.groupIds.join(", ")} (min{" "}
                      {rule.minCommonSlots} slots)
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule("slotRestrictions", rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Load Limits */}
              {rules.loadLimits.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted rounded"
                >
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Max {rule.maxSlotsPerPhase} slots/phase for phases{" "}
                      {rule.phases.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule("loadLimits", rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Phase Windows */}
              {rules.phaseWindows.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted rounded"
                >
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {rule.taskId} → phases {rule.allowedPhases.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule("phaseWindows", rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Custom Rules */}
              {rules.customRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted rounded"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {rule.name}
                      {rule.aiGenerated && (
                        <Badge variant="outline" className="text-xs">
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rule.description}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule("customRules", rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {totalRules === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No rules created yet. Use the AI generator or manual forms to
                  create rules.
                </div>
              )}
            </CardContent>
          </Card>

          {/* JSON Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                JSON Preview
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                  <code>{jsonPreview}</code>
                </pre>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={applyRulesToData}
                  disabled={
                    totalRules === 0 ||
                    isApplyingRules ||
                    !data ||
                    !onDataUpdate
                  }
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  {isApplyingRules ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Applying Rules...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Apply Rules to Data
                    </>
                  )}
                </Button>
                <Button
                  onClick={exportRules}
                  disabled={totalRules === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Export Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
