import type { ValidationError, ClientData, WorkerData, TaskData } from "./types"

export class DataValidator {
  private static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  private static durationRegex = /^(\d+)\s*(day|days|week|weeks|month|months|hour|hours)$/i

  static validateClients(
    data: any[],
    filename: string,
  ): {
    validData: ClientData[]
    errors: ValidationError[]
  } {
    const errors: ValidationError[] = []
    const validData: ClientData[] = []
    const requiredFields = ["clientid", "name", "priority"]

    // Check for missing columns
    const headers = Object.keys(data[0] || {})
    const missingFields = requiredFields.filter((field) => !headers.includes(field))

    missingFields.forEach((field) => {
      errors.push({
        file: filename,
        row: 0,
        column: field,
        error: `Missing required column: ${field}`,
        severity: "error",
      })
    })

    data.forEach((row, index) => {
      const rowNumber = index + 2 // Account for header row
      let hasErrors = false

      // Validate required fields
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push({
            file: filename,
            row: rowNumber,
            column: field,
            error: `${field} is required`,
            severity: "error",
            suggestion: `Please provide a value for ${field}`,
          })
          hasErrors = true
        }
      })

      // Validate email format
      if (row.email && !this.emailRegex.test(row.email)) {
        errors.push({
          file: filename,
          row: rowNumber,
          column: "email",
          error: "Invalid email format",
          severity: "warning",
          suggestion: "Please provide a valid email address",
        })
      }

      // Validate priority values
      const validPriorities = ["high", "medium", "low"]
      if (row.priority && !validPriorities.includes(row.priority.toLowerCase())) {
        errors.push({
          file: filename,
          row: rowNumber,
          column: "priority",
          error: "Invalid priority value",
          severity: "warning",
          suggestion: "Priority must be High, Medium, or Low",
        })
      }

      if (!hasErrors) {
        validData.push({
          clientId: row.clientid,
          name: row.name,
          email: row.email,
          priority: row.priority,
          requestedTaskIds: row.requestedtaskids ? row.requestedtaskids.split(",").map((id: string) => id.trim()) : [],
        })
      }
    })

    return { validData, errors }
  }

  static validateWorkers(
    data: any[],
    filename: string,
  ): {
    validData: WorkerData[]
    errors: ValidationError[]
  } {
    const errors: ValidationError[] = []
    const validData: WorkerData[] = []
    const requiredFields = ["workerid", "name"]

    // Check for missing columns
    const headers = Object.keys(data[0] || {})
    const missingFields = requiredFields.filter((field) => !headers.includes(field))

    missingFields.forEach((field) => {
      errors.push({
        file: filename,
        row: 0,
        column: field,
        error: `Missing required column: ${field}`,
        severity: "error",
      })
    })

    data.forEach((row, index) => {
      const rowNumber = index + 2
      let hasErrors = false

      // Validate required fields
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push({
            file: filename,
            row: rowNumber,
            column: field,
            error: `${field} is required`,
            severity: "error",
            suggestion: `Please provide a value for ${field}`,
          })
          hasErrors = true
        }
      })

      // Validate availability format
      if (row.availability && !/^\d+h\/week$/.test(row.availability)) {
        errors.push({
          file: filename,
          row: rowNumber,
          column: "availability",
          error: "Invalid availability format",
          severity: "warning",
          suggestion: 'Format should be like "40h/week"',
        })
      }

      if (!hasErrors) {
        validData.push({
          workerId: row.workerid,
          name: row.name,
          skills: row.skills.split(",").map((skill: string) => skill.trim()),
          availability: row.availability,
          maxLoad: row.maxload ? Number.parseInt(row.maxload) : undefined,
        })
      }
    })

    return { validData, errors }
  }

  static validateTasks(
    data: any[],
    filename: string,
  ): {
    validData: TaskData[]
    errors: ValidationError[]
  } {
    const errors: ValidationError[] = []
    const validData: TaskData[] = []
    const requiredFields = ["taskid", "title"]

    // Check for missing columns
    const headers = Object.keys(data[0] || {})
    const missingFields = requiredFields.filter((field) => !headers.includes(field))

    missingFields.forEach((field) => {
      errors.push({
        file: filename,
        row: 0,
        column: field,
        error: `Missing required column: ${field}`,
        severity: "error",
      })
    })

    data.forEach((row, index) => {
      const rowNumber = index + 2
      let hasErrors = false

      // Validate required fields
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push({
            file: filename,
            row: rowNumber,
            column: field,
            error: `${field} is required`,
            severity: "error",
            suggestion: `Please provide a value for ${field}`,
          })
          hasErrors = true
        }
      })

      // Validate duration format
      if (row.duration && !this.durationRegex.test(row.duration)) {
        errors.push({
          file: filename,
          row: rowNumber,
          column: "duration",
          error: "Invalid duration format",
          severity: "warning",
          suggestion: 'Format should be like "2 weeks" or "5 days"',
        })
      }

      if (!hasErrors) {
        validData.push({
          taskId: row.taskid,
          title: row.title,
          duration: row.duration,
          phase: row.phase,
          requiredSkills: row.requiredskills ? row.requiredskills.split(",").map((skill: string) => skill.trim()) : [],
          priority: row.priority ? Number.parseInt(row.priority) : undefined,
        })
      }
    })

    return { validData, errors }
  }

  static validateCrossReferences(clients: ClientData[], workers: WorkerData[], tasks: TaskData[]): ValidationError[] {
    const errors: ValidationError[] = []
    const taskIds = new Set(tasks.map((t) => t.taskId))

    // Check if requested task IDs exist
    clients.forEach((client, index) => {
      if (client.requestedTaskIds) {
        client.requestedTaskIds.forEach((taskId) => {
          if (!taskIds.has(taskId)) {
            errors.push({
              file: "clients.csv",
              row: index + 2,
              column: "requestedTaskIds",
              error: `Referenced task ID "${taskId}" does not exist`,
              severity: "error",
              suggestion: "Ensure all referenced task IDs exist in tasks.csv",
            })
          }
        })
      }
    })

    return errors
  }
}
