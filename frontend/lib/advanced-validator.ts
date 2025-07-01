import type { ValidationError, ClientData, WorkerData, TaskData } from "./types"

export class AdvancedValidator {
  static validateAll(
    clients: ClientData[],
    workers: WorkerData[],
    tasks: TaskData[],
    filename: { clients: string; workers: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Core validations
    errors.push(...this.validateDuplicateIDs(clients, workers, tasks, filename))
    errors.push(...this.validateMalformedLists(workers, filename.workers))
    errors.push(...this.validateOutOfRangeValues(clients, tasks, filename))
    errors.push(...this.validateBrokenJSON(clients, filename.clients))
    errors.push(...this.validateUnknownReferences(clients, tasks, filename))
    errors.push(...this.validateCircularCoRunGroups(tasks, filename.tasks))
    errors.push(...this.validateOverloadedWorkers(workers, filename.workers))
    errors.push(...this.validatePhaseSlotSaturation(workers, tasks, filename))
    errors.push(...this.validateSkillCoverage(workers, tasks, filename))
    errors.push(...this.validateMaxConcurrencyFeasibility(workers, tasks, filename))

    return errors
  }

  private static validateDuplicateIDs(
    clients: ClientData[],
    workers: WorkerData[],
    tasks: TaskData[],
    filename: { clients: string; workers: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Check duplicate client IDs
    const clientIds = new Set<string>()
    clients.forEach((client, index) => {
      if (clientIds.has(client.clientId)) {
        errors.push({
          file: filename.clients,
          row: index + 2,
          column: "clientId",
          error: `Duplicate ClientID: ${client.clientId}`,
          severity: "error",
          suggestion: "Ensure all ClientIDs are unique",
        })
      }
      clientIds.add(client.clientId)
    })

    // Check duplicate worker IDs
    const workerIds = new Set<string>()
    workers.forEach((worker, index) => {
      if (workerIds.has(worker.workerId)) {
        errors.push({
          file: filename.workers,
          row: index + 2,
          column: "workerId",
          error: `Duplicate WorkerID: ${worker.workerId}`,
          severity: "error",
          suggestion: "Ensure all WorkerIDs are unique",
        })
      }
      workerIds.add(worker.workerId)
    })

    // Check duplicate task IDs
    const taskIds = new Set<string>()
    tasks.forEach((task, index) => {
      if (taskIds.has(task.taskId)) {
        errors.push({
          file: filename.tasks,
          row: index + 2,
          column: "taskId",
          error: `Duplicate TaskID: ${task.taskId}`,
          severity: "error",
          suggestion: "Ensure all TaskIDs are unique",
        })
      }
      taskIds.add(task.taskId)
    })

    return errors
  }

  private static validateMalformedLists(workers: WorkerData[], filename: string): ValidationError[] {
    const errors: ValidationError[] = []

    workers.forEach((worker, index) => {
      // Validate AvailableSlots format
      if (worker.availability && typeof worker.availability === "string") {
        try {
          const slots = JSON.parse(worker.availability.replace(/'/g, '"'))
          if (!Array.isArray(slots) || !slots.every((slot) => typeof slot === "number" && slot >= 1 && slot <= 5)) {
            errors.push({
              file: filename,
              row: index + 2,
              column: "availability",
              error: "AvailableSlots must be an array of numbers between 1-5",
              severity: "error",
              suggestion: 'Format: [1,2,3] or "[1,2,3]"',
            })
          }
        } catch {
          errors.push({
            file: filename,
            row: index + 2,
            column: "availability",
            error: "Invalid AvailableSlots format",
            severity: "error",
            suggestion: "Use array format like [1,2,3]",
          })
        }
      }

      // Validate MaxLoadPerPhase is numeric
      if (worker.maxLoad && (isNaN(Number(worker.maxLoad)) || Number(worker.maxLoad) < 1)) {
        errors.push({
          file: filename,
          row: index + 2,
          column: "maxLoad",
          error: "MaxLoadPerPhase must be a positive number",
          severity: "error",
          suggestion: "Enter a number greater than 0",
        })
      }
    })

    return errors
  }

  private static validateOutOfRangeValues(
    clients: ClientData[],
    tasks: TaskData[],
    filename: { clients: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Validate PriorityLevel (1-5)
    clients.forEach((client, index) => {
      const priority = client.priority
      if (priority && (typeof priority !== "string" || !["High", "Medium", "Low"].includes(priority))) {
        const numPriority = Number(priority)
        if (isNaN(numPriority) || numPriority < 1 || numPriority > 5) {
          errors.push({
            file: filename.clients,
            row: index + 2,
            column: "priority",
            error: "PriorityLevel must be 1-5 or High/Medium/Low",
            severity: "error",
            suggestion: "Use values: 1, 2, 3, 4, 5 or High, Medium, Low",
          })
        }
      }
    })

    // Validate Duration >= 1
    tasks.forEach((task, index) => {
      const duration = Number(task.duration)
      if (isNaN(duration) || duration < 1) {
        errors.push({
          file: filename.tasks,
          row: index + 2,
          column: "duration",
          error: "Duration must be >= 1",
          severity: "error",
          suggestion: "Enter a positive number of phases",
        })
      }
    })

    return errors
  }

  private static validateBrokenJSON(clients: ClientData[], filename: string): ValidationError[] {
    const errors: ValidationError[] = []

    clients.forEach((client, index) => {
      if ((client as any).attributesJSON) {
        try {
          JSON.parse((client as any).attributesJSON)
        } catch {
          errors.push({
            file: filename,
            row: index + 2,
            column: "attributesJSON",
            error: "Invalid JSON format in AttributesJSON",
            severity: "error",
            suggestion: "Ensure valid JSON syntax with proper quotes and brackets",
          })
        }
      }
    })

    return errors
  }

  private static validateUnknownReferences(
    clients: ClientData[],
    tasks: TaskData[],
    filename: { clients: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []
    const taskIds = new Set(tasks.map((t) => t.taskId))

    clients.forEach((client, index) => {
      if (client.requestedTaskIds) {
        client.requestedTaskIds.forEach((taskId) => {
          if (!taskIds.has(taskId)) {
            errors.push({
              file: filename.clients,
              row: index + 2,
              column: "requestedTaskIds",
              error: `Unknown TaskID reference: ${taskId}`,
              severity: "error",
              suggestion: "Ensure all referenced TaskIDs exist in tasks.csv",
            })
          }
        })
      }
    })

    return errors
  }

  private static validateCircularCoRunGroups(tasks: TaskData[], filename: string): ValidationError[] {
    const errors: ValidationError[] = []
    // This would implement circular dependency detection
    // For now, we'll add a placeholder validation

    // Example: Check if tasks reference each other in a circular manner
    // This is a simplified check - in practice, you'd need to implement graph cycle detection

    return errors
  }

  private static validateOverloadedWorkers(workers: WorkerData[], filename: string): ValidationError[] {
    const errors: ValidationError[] = []

    workers.forEach((worker, index) => {
      try {
        const availableSlots = JSON.parse(worker.availability?.replace(/'/g, '"') || "[]")
        const maxLoad = Number(worker.maxLoad || 0)

        if (Array.isArray(availableSlots) && availableSlots.length < maxLoad) {
          errors.push({
            file: filename,
            row: index + 2,
            column: "maxLoad",
            error: `MaxLoadPerPhase (${maxLoad}) exceeds AvailableSlots count (${availableSlots.length})`,
            severity: "warning",
            suggestion: "Reduce MaxLoadPerPhase or increase AvailableSlots",
          })
        }
      } catch {
        // Skip if we can't parse the slots
      }
    })

    return errors
  }

  private static validatePhaseSlotSaturation(
    workers: WorkerData[],
    tasks: TaskData[],
    filename: { workers: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Calculate total worker slots per phase
    const phaseSlots: Record<number, number> = {}

    workers.forEach((worker) => {
      try {
        const availableSlots = JSON.parse(worker.availability?.replace(/'/g, '"') || "[]")
        const maxLoad = Number(worker.maxLoad || 1)

        if (Array.isArray(availableSlots)) {
          availableSlots.forEach((phase) => {
            phaseSlots[phase] = (phaseSlots[phase] || 0) + maxLoad
          })
        }
      } catch {
        // Skip if we can't parse
      }
    })

    // Calculate task duration requirements per phase
    const phaseDemand: Record<number, number> = {}

    tasks.forEach((task, index) => {
      try {
        const duration = Number(task.duration)
        const preferredPhases = this.parsePhases(task.phase)

        preferredPhases.forEach((phase) => {
          phaseDemand[phase] = (phaseDemand[phase] || 0) + duration
        })
      } catch {
        errors.push({
          file: filename.tasks,
          row: index + 2,
          column: "phase",
          error: "Invalid PreferredPhases format",
          severity: "warning",
          suggestion: "Use format like [1,2,3] or '1-3'",
        })
      }
    })

    // Check for saturation
    Object.keys(phaseDemand).forEach((phase) => {
      const phaseNum = Number(phase)
      const demand = phaseDemand[phaseNum]
      const supply = phaseSlots[phaseNum] || 0

      if (demand > supply) {
        errors.push({
          file: filename.tasks,
          row: 0,
          column: "phase",
          error: `Phase ${phase} oversaturated: demand ${demand} > supply ${supply}`,
          severity: "warning",
          suggestion: "Add more workers for this phase or redistribute tasks",
        })
      }
    })

    return errors
  }

  private static validateSkillCoverage(
    workers: WorkerData[],
    tasks: TaskData[],
    filename: { workers: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Collect all worker skills
    const workerSkills = new Set<string>()
    workers.forEach((worker) => {
      if (worker.skills) {
        worker.skills.forEach((skill) => workerSkills.add(skill.toLowerCase().trim()))
      }
    })

    // Check task required skills
    tasks.forEach((task, index) => {
      if (task.requiredSkills) {
        task.requiredSkills.forEach((skill) => {
          const normalizedSkill = skill.toLowerCase().trim()
          if (!workerSkills.has(normalizedSkill)) {
            errors.push({
              file: filename.tasks,
              row: index + 2,
              column: "requiredSkills",
              error: `No worker has required skill: ${skill}`,
              severity: "error",
              suggestion: "Add workers with this skill or remove from task requirements",
            })
          }
        })
      }
    })

    return errors
  }

  private static validateMaxConcurrencyFeasibility(
    workers: WorkerData[],
    tasks: TaskData[],
    filename: { workers: string; tasks: string },
  ): ValidationError[] {
    const errors: ValidationError[] = []

    tasks.forEach((task, index) => {
      const maxConcurrent = Number(task.priority || 1) // Using priority as maxConcurrent for now

      // Count qualified workers for this task
      let qualifiedWorkers = 0

      if (task.requiredSkills) {
        workers.forEach((worker) => {
          const hasAllSkills = task.requiredSkills!.every((requiredSkill) =>
            worker.skills?.some(
              (workerSkill) => workerSkill.toLowerCase().trim() === requiredSkill.toLowerCase().trim(),
            ),
          )

          if (hasAllSkills) {
            qualifiedWorkers++
          }
        })

        if (maxConcurrent > qualifiedWorkers) {
          errors.push({
            file: filename.tasks,
            row: index + 2,
            column: "priority",
            error: `MaxConcurrent (${maxConcurrent}) exceeds qualified workers (${qualifiedWorkers})`,
            severity: "warning",
            suggestion: "Reduce MaxConcurrent or add more qualified workers",
          })
        }
      }
    })

    return errors
  }

  private static parsePhases(phaseString: string): number[] {
    try {
      // Handle array format [1,2,3]
      if (phaseString.startsWith("[") && phaseString.endsWith("]")) {
        return JSON.parse(phaseString)
      }

      // Handle range format 1-3
      if (phaseString.includes("-")) {
        const [start, end] = phaseString.split("-").map(Number)
        const phases = []
        for (let i = start; i <= end; i++) {
          phases.push(i)
        }
        return phases
      }

      // Handle single phase
      return [Number(phaseString)]
    } catch {
      return []
    }
  }
}
