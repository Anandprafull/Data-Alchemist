import type { RuleConfig, ClientData, WorkerData, TaskData } from "./types"

export class RuleEngine {
  static applyRules(
    clients: ClientData[],
    workers: WorkerData[],
    tasks: TaskData[],
    rules: RuleConfig,
  ): {
    allocations: any[]
    violations: any[]
    recommendations: any[]
  } {
    const allocations: any[] = []
    const violations: any[] = []
    const recommendations: any[] = []

    // Apply co-run group rules
    rules.coRunGroups.forEach((group) => {
      const groupTasks = tasks.filter((task) => group.taskIds.includes(task.taskId))
      if (groupTasks.length > 1) {
        recommendations.push({
          type: "corun",
          message: `Tasks ${group.taskIds.join(", ")} should be assigned to the same worker`,
          tasks: groupTasks,
        })
      }
    })

    // Apply slot restrictions
    rules.slotRestrictions.forEach((restriction) => {
      if (restriction.groupType === "client") {
        const restrictedClients = clients.filter((client) => restriction.groupIds.includes(client.clientId))
        if (restrictedClients.length > restriction.maxSlots) {
          violations.push({
            type: "slot_restriction",
            message: `Client group exceeds maximum slots (${restriction.maxSlots})`,
            affected: restrictedClients.slice(restriction.maxSlots),
          })
        }
      }
    })

    // Apply load limits
    rules.loadLimits.forEach((limit) => {
      const affectedWorkers = limit.workerId ? workers.filter((w) => w.workerId === limit.workerId) : workers

      affectedWorkers.forEach((worker) => {
        const workerTasks = this.getWorkerTasksInPhase(worker, tasks, limit.phase)
        const totalLoad = this.calculateWorkerLoad(workerTasks)

        if (totalLoad > limit.maxLoad) {
          violations.push({
            type: "load_limit",
            message: `Worker ${worker.name} exceeds load limit in ${limit.phase}`,
            worker,
            currentLoad: totalLoad,
            maxLoad: limit.maxLoad,
          })
        }
      })
    })

    // Apply phase windows
    rules.phaseWindows.forEach((window) => {
      const task = tasks.find((t) => t.taskId === window.taskId)
      if (task && !window.allowedPhases.includes(task.phase)) {
        violations.push({
          type: "phase_window",
          message: `Task ${task.title} is not in allowed phases`,
          task,
          allowedPhases: window.allowedPhases,
        })
      }
    })

    // Generate basic allocations (simplified algorithm)
    const basicAllocations = this.generateBasicAllocations(clients, workers, tasks)
    allocations.push(...basicAllocations)

    return { allocations, violations, recommendations }
  }

  private static getWorkerTasksInPhase(worker: WorkerData, tasks: TaskData[], phase: string): TaskData[] {
    // This would implement logic to find tasks assigned to a worker in a specific phase
    return tasks.filter((task) => task.phase === phase)
  }

  private static calculateWorkerLoad(tasks: TaskData[]): number {
    // Simplified load calculation based on task count
    return tasks.length * 10 // Assume each task is 10 load units
  }

  private static generateBasicAllocations(clients: ClientData[], workers: WorkerData[], tasks: TaskData[]): any[] {
    const allocations: any[] = []

    // Simple round-robin allocation
    let workerIndex = 0

    tasks.forEach((task) => {
      const worker = workers[workerIndex % workers.length]
      const client = clients.find((c) => c.requestedTaskIds?.includes(task.taskId)) || clients[0]

      allocations.push({
        taskId: task.taskId,
        taskTitle: task.title,
        workerId: worker.workerId,
        workerName: worker.name,
        clientId: client.clientId,
        clientName: client.name,
        phase: task.phase,
        priority: task.priority || client.priority,
      })

      workerIndex++
    })

    return allocations
  }

  static optimizeAllocations(
    allocations: any[],
    priorityWeights: {
      priorityLevel: number
      requestedTasks: number
      fairDistribution: number
      taskUrgency: number
    },
  ): any[] {
    // Implement optimization algorithm based on priority weights
    return allocations.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0

      // Priority level scoring
      const priorityScore = { High: 3, Medium: 2, Low: 1 }
      scoreA += (priorityScore[a.priority as keyof typeof priorityScore] || 1) * priorityWeights.priorityLevel
      scoreB += (priorityScore[b.priority as keyof typeof priorityScore] || 1) * priorityWeights.priorityLevel

      // Task urgency scoring (simplified)
      scoreA += (a.priority || 1) * priorityWeights.taskUrgency
      scoreB += (b.priority || 1) * priorityWeights.taskUrgency

      return scoreB - scoreA
    })
  }
}
