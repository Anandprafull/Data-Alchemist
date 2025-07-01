import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { AI_MODELS } from "./ai-config"
import type { RuleGenerationRequest, RuleGenerationResponse, ClientData, WorkerData, TaskData } from "./types"

export class RuleGenerator {
  static async generateRuleFromDescription(request: RuleGenerationRequest): Promise<RuleGenerationResponse> {
    try {
      const { description, context } = request

      // Analyze the description to determine rule type
      const ruleType = this.determineRuleType(description)

      const { text } = await generateText({
        model: openai(AI_MODELS.DEFAULT),
        system: `You are an expert business rule generator for resource allocation systems. 
        
Available rule types:
1. CoRunGroup - Tasks that must run together
2. SlotRestriction - Limits on client/worker group slots
3. LoadLimit - Maximum workload per worker group per phase
4. PhaseWindow - Allowed phases for specific tasks
5. PatternMatch - Regex-based rules with templates
6. PrecedenceOverride - Priority ordering for rule conflicts
7. CustomRule - Complex conditional rules

Return a JSON response with:
- "ruleType": one of the above types
- "rule": the structured rule object
- "confidence": 0-100 confidence score
- "explanation": human-readable explanation
- "suggestions": optional improvements
- "validation": any validation warnings

Generate rules that are:
- Specific and actionable
- Compatible with the provided data structure
- Optimized for resource allocation
- Include proper IDs, names, and descriptions`,

        prompt: `Description: "${description}"

Available data context:
Clients (${context.clients.length}): ${context.clients
          .slice(0, 3)
          .map((c) => `${c.clientId}:${c.name}`)
          .join(", ")}
Workers (${context.workers.length}): ${context.workers
          .slice(0, 3)
          .map((w) => `${w.workerId}:${w.name}`)
          .join(", ")}
Tasks (${context.tasks.length}): ${context.tasks
          .slice(0, 3)
          .map((t) => `${t.taskId}:${t.title}`)
          .join(", ")}

Generate a structured rule configuration that implements this description.`,
      })

      const aiResponse = JSON.parse(text)

      // Validate and enhance the generated rule
      const validatedRule = this.validateAndEnhanceRule(aiResponse.rule, aiResponse.ruleType, context)

      return {
        success: true,
        rule: validatedRule,
        ruleType: aiResponse.ruleType,
        confidence: aiResponse.confidence || 85,
        explanation: aiResponse.explanation,
        suggestions: aiResponse.suggestions,
      }
    } catch (error) {
      console.error("Rule generation error:", error)

      // Fallback to pattern-based rule generation
      const fallbackRule = this.generateFallbackRule(request.description, request.context)

      return {
        success: true,
        rule: fallbackRule.rule,
        ruleType: fallbackRule.type,
        confidence: 60,
        explanation: `Generated basic rule based on keywords in: "${request.description}"`,
        suggestions: ["Consider providing more specific details for better rule generation"],
      }
    }
  }

  private static determineRuleType(description: string): string {
    const desc = description.toLowerCase()

    if (desc.includes("together") || desc.includes("co-run") || desc.includes("same time")) {
      return "CoRunGroup"
    }
    if (desc.includes("slot") || desc.includes("limit") || desc.includes("restrict")) {
      return "SlotRestriction"
    }
    if (desc.includes("load") || desc.includes("workload") || desc.includes("capacity")) {
      return "LoadLimit"
    }
    if (desc.includes("phase") || desc.includes("window") || desc.includes("timing")) {
      return "PhaseWindow"
    }
    if (desc.includes("pattern") || desc.includes("regex") || desc.includes("match")) {
      return "PatternMatch"
    }
    if (desc.includes("priority") || desc.includes("precedence") || desc.includes("override")) {
      return "PrecedenceOverride"
    }

    return "CustomRule"
  }

  private static validateAndEnhanceRule(rule: any, ruleType: string, context: any): any {
    const enhancedRule = {
      ...rule,
      id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      priority: rule.priority || 1,
    }

    // Type-specific validation and enhancement
    switch (ruleType) {
      case "CoRunGroup":
        return this.enhanceCoRunGroup(enhancedRule, context)
      case "SlotRestriction":
        return this.enhanceSlotRestriction(enhancedRule, context)
      case "LoadLimit":
        return this.enhanceLoadLimit(enhancedRule, context)
      case "PhaseWindow":
        return this.enhancePhaseWindow(enhancedRule, context)
      case "PatternMatch":
        return this.enhancePatternMatch(enhancedRule, context)
      case "PrecedenceOverride":
        return this.enhancePrecedenceOverride(enhancedRule, context)
      default:
        return this.enhanceCustomRule(enhancedRule, context)
    }
  }

  private static enhanceCoRunGroup(rule: any, context: any): any {
    // Validate task IDs exist
    const validTaskIds = rule.taskIds?.filter((taskId: string) =>
      context.tasks.some((task: TaskData) => task.taskId === taskId),
    )

    return {
      ...rule,
      taskIds: validTaskIds || [],
      name: rule.name || `Co-run Group ${rule.taskIds?.length || 0} tasks`,
      description: rule.description || `Tasks ${validTaskIds?.join(", ")} must run together`,
    }
  }

  private static enhanceSlotRestriction(rule: any, context: any): any {
    // Validate group IDs based on type
    let validGroupIds: string[] = []

    if (rule.groupType === "client") {
      validGroupIds = rule.groupIds?.filter((id: string) =>
        context.clients.some((client: ClientData) => client.clientId === id),
      )
    } else if (rule.groupType === "worker") {
      validGroupIds = rule.groupIds?.filter((id: string) =>
        context.workers.some((worker: WorkerData) => worker.workerId === id),
      )
    }

    return {
      ...rule,
      groupIds: validGroupIds || [],
      name: rule.name || `${rule.groupType} slot restriction`,
      description: rule.description || `Limit ${rule.groupType} groups to ${rule.minCommonSlots} common slots minimum`,
    }
  }

  private static enhanceLoadLimit(rule: any, context: any): any {
    // Validate worker group IDs
    const validWorkerGroupIds = rule.workerGroupIds?.filter((id: string) =>
      context.workers.some((worker: WorkerData) => worker.workerId === id),
    )

    return {
      ...rule,
      workerGroupIds: validWorkerGroupIds || [],
      phases: rule.phases || [1, 2, 3, 4, 5],
      name: rule.name || `Load limit ${rule.maxSlotsPerPhase} per phase`,
      description:
        rule.description ||
        `Limit workers to maximum ${rule.maxSlotsPerPhase} slots per phase in phases ${rule.phases?.join(", ")}`,
    }
  }

  private static enhancePhaseWindow(rule: any, context: any): any {
    // Validate task ID exists
    const taskExists = context.tasks.some((task: TaskData) => task.taskId === rule.taskId)

    return {
      ...rule,
      taskId: taskExists ? rule.taskId : "",
      allowedPhases: rule.allowedPhases || [1, 2, 3, 4, 5],
      name: rule.name || `Phase window for ${rule.taskId}`,
      description: rule.description || `Task ${rule.taskId} can only run in phases ${rule.allowedPhases?.join(", ")}`,
    }
  }

  private static enhancePatternMatch(rule: any, context: any): any {
    return {
      ...rule,
      pattern: rule.pattern || ".*",
      ruleTemplate: rule.ruleTemplate || "default",
      parameters: rule.parameters || {},
      name: rule.name || `Pattern match rule`,
      description: rule.description || `Pattern-based rule: ${rule.pattern}`,
    }
  }

  private static enhancePrecedenceOverride(rule: any, context: any): any {
    return {
      ...rule,
      globalRules: rule.globalRules || [],
      specificRules: rule.specificRules || [],
      priorityOrder: rule.priorityOrder || [],
      name: rule.name || `Precedence override`,
      description: rule.description || `Custom priority ordering for rule conflicts`,
    }
  }

  private static enhanceCustomRule(rule: any, context: any): any {
    return {
      ...rule,
      type: rule.type || "custom",
      conditions: rule.conditions || [],
      actions: rule.actions || [],
      name: rule.name || `Custom rule`,
      description: rule.description || `Custom business rule`,
      aiGenerated: true,
    }
  }

  private static generateFallbackRule(description: string, context: any): { rule: any; type: string } {
    const desc = description.toLowerCase()

    // Simple keyword-based rule generation
    if (desc.includes("together") && desc.includes("task")) {
      // Extract task mentions
      const taskIds = context.tasks
        .filter((task: TaskData) => desc.includes(task.taskId.toLowerCase()) || desc.includes(task.title.toLowerCase()))
        .map((task: TaskData) => task.taskId)
        .slice(0, 5)

      return {
        type: "CoRunGroup",
        rule: {
          id: `corun_${Date.now()}`,
          name: "AI Generated Co-run Group",
          taskIds,
          description: `Tasks must run together: ${description}`,
          priority: 1,
          createdAt: new Date().toISOString(),
        },
      }
    }

    // Default custom rule
    return {
      type: "CustomRule",
      rule: {
        id: `custom_${Date.now()}`,
        name: "AI Generated Custom Rule",
        type: "custom",
        conditions: [{ description }],
        actions: [],
        description: `Custom rule based on: ${description}`,
        priority: 1,
        createdAt: new Date().toISOString(),
        aiGenerated: true,
      },
    }
  }

  static async generateRuleRecommendations(context: {
    clients: ClientData[]
    workers: WorkerData[]
    tasks: TaskData[]
  }): Promise<any[]> {
    try {
      const { text } = await generateText({
        model: openai(AI_MODELS.DEFAULT),
        system: `You are an expert business analyst that identifies patterns in resource allocation data and recommends business rules.

Analyze the provided data and suggest 3-5 practical business rules that would improve resource allocation efficiency.

Return a JSON array of recommendations, each with:
- "type": rule type (CoRunGroup, SlotRestriction, LoadLimit, PhaseWindow, CustomRule)
- "title": short descriptive title
- "description": detailed explanation
- "reasoning": why this rule would be beneficial
- "confidence": 0-100 confidence score
- "impact": expected impact (High/Medium/Low)
- "ruleConfig": the actual rule configuration

Focus on:
- Task dependencies and co-location opportunities
- Worker skill utilization optimization
- Load balancing across phases
- Client priority optimization
- Resource constraint management`,

        prompt: `Analyze this resource allocation data and recommend business rules:

Clients (${context.clients.length}):
${context.clients
  .slice(0, 5)
  .map(
    (c) => `- ${c.clientId}: ${c.name} (Priority: ${c.priority}, Tasks: ${c.requestedTaskIds?.join(", ") || "none"})`,
  )
  .join("\n")}

Workers (${context.workers.length}):
${context.workers
  .slice(0, 5)
  .map((w) => `- ${w.workerId}: ${w.name} (Skills: ${w.skills?.join(", ")}, Load: ${w.maxLoad})`)
  .join("\n")}

Tasks (${context.tasks.length}):
${context.tasks
  .slice(0, 5)
  .map((t) => `- ${t.taskId}: ${t.title} (Duration: ${t.duration}, Skills: ${t.requiredSkills?.join(", ") || "none"})`)
  .join("\n")}

Generate practical rule recommendations that would optimize this allocation.`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("Rule recommendation error:", error)
      return this.generateFallbackRecommendations(context)
    }
  }

  private static generateFallbackRecommendations(context: any): any[] {
    const recommendations = []

    // High priority client rule
    const highPriorityClients = context.clients.filter((c: ClientData) => c.priority === "High")
    if (highPriorityClients.length > 0) {
      recommendations.push({
        type: "SlotRestriction",
        title: "High Priority Client Preference",
        description: "Ensure high priority clients get preferential slot allocation",
        reasoning: "High priority clients should receive better resource allocation",
        confidence: 90,
        impact: "High",
        ruleConfig: {
          groupType: "client",
          groupIds: highPriorityClients.map((c: ClientData) => c.clientId),
          minCommonSlots: 3,
        },
      })
    }

    // Skill-based load balancing
    const skillGroups = this.groupWorkersBySkills(context.workers)
    if (Object.keys(skillGroups).length > 1) {
      recommendations.push({
        type: "LoadLimit",
        title: "Skill-based Load Balancing",
        description: "Balance workload across different skill groups",
        reasoning: "Prevents overloading specific skill groups",
        confidence: 85,
        impact: "Medium",
        ruleConfig: {
          workerGroupIds: Object.values(skillGroups).flat(),
          maxSlotsPerPhase: 2,
          phases: [1, 2, 3, 4, 5],
        },
      })
    }

    return recommendations
  }

  private static groupWorkersBySkills(workers: WorkerData[]): Record<string, string[]> {
    const skillGroups: Record<string, string[]> = {}

    workers.forEach((worker) => {
      const primarySkill = worker.skills?.[0] || "general"
      if (!skillGroups[primarySkill]) {
        skillGroups[primarySkill] = []
      }
      skillGroups[primarySkill].push(worker.workerId)
    })

    return skillGroups
  }
}
