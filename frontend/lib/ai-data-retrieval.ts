import { generateText } from "./ai-config"
import type { ClientData, WorkerData, TaskData } from "./types"

export class AIDataRetrieval {
  static async processNaturalLanguageQuery(
    query: string,
    data: {
      clients: ClientData[]
      workers: WorkerData[]
      tasks: TaskData[]
    },
  ): Promise<{
    results: {
      clients: ClientData[]
      workers: WorkerData[]
      tasks: TaskData[]
    }
    explanation: string
    filters: any
  }> {
    try {
      const { text } = await generateText({
        system: `You are a data query assistant that converts natural language queries into structured filters for resource allocation data.

Available data structure:
- Clients: ClientID, ClientName, PriorityLevel (1-5 or High/Medium/Low), RequestedTaskIDs, GroupTag, AttributesJSON
- Workers: WorkerID, WorkerName, Skills (array), AvailableSlots (array of phases), MaxLoadPerPhase, WorkerGroup, QualificationLevel
- Tasks: TaskID, TaskName, Category, Duration, RequiredSkills (array), PreferredPhases, MaxConcurrent

Return a JSON response with:
1. "filters" object containing the filtering logic
2. "explanation" string describing what was found
3. "entityTypes" array indicating which entities to filter (clients, workers, tasks)

Examples:
- "Tasks with duration > 2" → filter tasks where Duration > 2
- "High priority clients" → filter clients where PriorityLevel = 5 or "High"
- "Workers with React skills" → filter workers where Skills contains "React"
- "Tasks in phase 2" → filter tasks where PreferredPhases contains 2`,

        prompt: `Query: "${query}"

Sample data context:
Clients: ${JSON.stringify(data.clients.slice(0, 2), null, 2)}
Workers: ${JSON.stringify(data.workers.slice(0, 2), null, 2)}
Tasks: ${JSON.stringify(data.tasks.slice(0, 2), null, 2)}

Convert this natural language query into structured filters and return the matching data.`,
      })

      const aiResponse = JSON.parse(text)

      // Apply the filters to get results
      const results = this.applyFilters(data, aiResponse.filters)

      return {
        results,
        explanation: aiResponse.explanation || "Query processed successfully",
        filters: aiResponse.filters,
      }
    } catch (error) {
      console.error("AI query processing error:", error)

      // Fallback to simple keyword matching
      const fallbackResults = this.fallbackKeywordSearch(query, data)

      return {
        results: fallbackResults,
        explanation: `Performed keyword search for: "${query}"`,
        filters: { keyword: query },
      }
    }
  }

  private static applyFilters(
    data: {
      clients: ClientData[]
      workers: WorkerData[]
      tasks: TaskData[]
    },
    filters: any,
  ): {
    clients: ClientData[]
    workers: WorkerData[]
    tasks: TaskData[]
  } {
    const results = {
      clients: [...data.clients],
      workers: [...data.workers],
      tasks: [...data.tasks],
    }

    // Apply client filters
    if (filters.clients) {
      results.clients = data.clients.filter((client) => {
        return this.matchesClientFilter(client, filters.clients)
      })
    }

    // Apply worker filters
    if (filters.workers) {
      results.workers = data.workers.filter((worker) => {
        return this.matchesWorkerFilter(worker, filters.workers)
      })
    }

    // Apply task filters
    if (filters.tasks) {
      results.tasks = data.tasks.filter((task) => {
        return this.matchesTaskFilter(task, filters.tasks)
      })
    }

    return results
  }

  private static matchesClientFilter(client: ClientData, filter: any): boolean {
    // Priority level filtering
    if (filter.priorityLevel !== undefined) {
      const clientPriority = this.normalizePriority(client.priority)
      if (filter.operator === ">" && clientPriority <= filter.priorityLevel) return false
      if (filter.operator === "<" && clientPriority >= filter.priorityLevel) return false
      if (filter.operator === "=" && clientPriority !== filter.priorityLevel) return false
    }

    // Group tag filtering
    if (filter.groupTag && !(client as any).groupTag?.toLowerCase().includes(filter.groupTag.toLowerCase())) {
      return false
    }

    // Requested tasks filtering
    if (filter.requestedTasks) {
      const hasRequestedTask = client.requestedTaskIds?.some((taskId) => filter.requestedTasks.includes(taskId))
      if (!hasRequestedTask) return false
    }

    return true
  }

  private static matchesWorkerFilter(worker: WorkerData, filter: any): boolean {
    // Skills filtering
    if (filter.skills) {
      const hasSkill = worker.skills?.some((skill) =>
        filter.skills.some((filterSkill: string) => skill.toLowerCase().includes(filterSkill.toLowerCase())),
      )
      if (!hasSkill) return false
    }

    // Available slots filtering
    if (filter.availableSlots) {
      try {
        const slots = JSON.parse(worker.availability?.replace(/'/g, '"') || "[]")
        const hasSlot = filter.availableSlots.some((slot: number) => slots.includes(slot))
        if (!hasSlot) return false
      } catch {
        return false
      }
    }

    // Max load filtering
    if (filter.maxLoad !== undefined) {
      const workerMaxLoad = Number(worker.maxLoad || 0)
      if (filter.operator === ">" && workerMaxLoad <= filter.maxLoad) return false
      if (filter.operator === "<" && workerMaxLoad >= filter.maxLoad) return false
      if (filter.operator === "=" && workerMaxLoad !== filter.maxLoad) return false
    }

    return true
  }

  private static matchesTaskFilter(task: TaskData, filter: any): boolean {
    // Duration filtering
    if (filter.duration !== undefined) {
      const taskDuration = Number(task.duration)
      if (filter.operator === ">" && taskDuration <= filter.duration) return false
      if (filter.operator === "<" && taskDuration >= filter.duration) return false
      if (filter.operator === "=" && taskDuration !== filter.duration) return false
    }

    // Required skills filtering
    if (filter.requiredSkills) {
      const hasSkill = task.requiredSkills?.some((skill) =>
        filter.requiredSkills.some((filterSkill: string) => skill.toLowerCase().includes(filterSkill.toLowerCase())),
      )
      if (!hasSkill) return false
    }

    // Preferred phases filtering
    if (filter.preferredPhases) {
      try {
        const phases = this.parsePhases(task.phase)
        const hasPhase = filter.preferredPhases.some((phase: number) => phases.includes(phase))
        if (!hasPhase) return false
      } catch {
        return false
      }
    }

    // Category filtering
    if (filter.category && !task.title?.toLowerCase().includes(filter.category.toLowerCase())) {
      return false
    }

    return true
  }

  private static fallbackKeywordSearch(
    query: string,
    data: {
      clients: ClientData[]
      workers: WorkerData[]
      tasks: TaskData[]
    },
  ): {
    clients: ClientData[]
    workers: WorkerData[]
    tasks: TaskData[]
  } {
    const keywords = query.toLowerCase().split(" ")

    return {
      clients: data.clients.filter((client) =>
        keywords.some(
          (keyword) =>
            client.name.toLowerCase().includes(keyword) ||
            client.clientId.toLowerCase().includes(keyword) ||
            client.priority.toLowerCase().includes(keyword),
        ),
      ),
      workers: data.workers.filter((worker) =>
        keywords.some(
          (keyword) =>
            worker.name.toLowerCase().includes(keyword) ||
            worker.workerId.toLowerCase().includes(keyword) ||
            worker.skills?.some((skill) => skill.toLowerCase().includes(keyword)),
        ),
      ),
      tasks: data.tasks.filter((task) =>
        keywords.some(
          (keyword) =>
            task.title.toLowerCase().includes(keyword) ||
            task.taskId.toLowerCase().includes(keyword) ||
            task.phase.toLowerCase().includes(keyword) ||
            task.requiredSkills?.some((skill) => skill.toLowerCase().includes(keyword)),
        ),
      ),
    }
  }

  private static normalizePriority(priority: string): number {
    switch (priority.toLowerCase()) {
      case "high":
        return 5
      case "medium":
        return 3
      case "low":
        return 1
      default:
        return Number(priority) || 3
    }
  }

  private static parsePhases(phaseString: string): number[] {
    try {
      if (phaseString.startsWith("[") && phaseString.endsWith("]")) {
        return JSON.parse(phaseString)
      }
      if (phaseString.includes("-")) {
        const [start, end] = phaseString.split("-").map(Number)
        const phases = []
        for (let i = start; i <= end; i++) {
          phases.push(i)
        }
        return phases
      }
      return [Number(phaseString)]
    } catch {
      return []
    }
  }
}
