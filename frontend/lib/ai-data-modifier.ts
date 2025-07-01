import { generateText } from "./ai-config"
import type { ValidationError, ProcessedData } from "./types"

export interface DataModificationRequest {
  instruction: string
  targetData: "clients" | "workers" | "tasks" | "all"
  data: ProcessedData
  context?: {
    selectedRows?: number[]
    selectedColumns?: string[]
    filters?: any
  }
}

export interface DataModificationResponse {
  success: boolean
  modifiedData: ProcessedData
  changes: DataChange[]
  explanation: string
  confidence: number
  warnings?: string[]
  errors?: string[]
}

export interface DataChange {
  id: string
  type: "update" | "insert" | "delete" | "transform"
  entity: "client" | "worker" | "task"
  entityId: string
  field?: string
  oldValue?: any
  newValue?: any
  reason: string
  confidence: number
}

export interface ErrorCorrectionRequest {
  errors: ValidationError[]
  data: ProcessedData
  correctionStrategy: "conservative" | "aggressive" | "smart"
}

export interface ErrorCorrectionResponse {
  success: boolean
  correctedData: ProcessedData
  corrections: DataCorrection[]
  remainingErrors: ValidationError[]
  explanation: string
  confidence: number
}

export interface DataCorrection {
  id: string
  errorType: string
  entity: "client" | "worker" | "task"
  entityId: string
  field: string
  originalValue: any
  correctedValue: any
  correctionMethod: string
  confidence: number
  reasoning: string
}

export class AIDataModifier {
  static async modifyDataWithNaturalLanguage(request: DataModificationRequest): Promise<DataModificationResponse> {
    try {
      const { instruction, targetData, data, context } = request

      // Analyze the instruction to understand the intent
      const intent = await this.analyzeModificationIntent(instruction, targetData, data)

      // Generate the modification plan
      const modificationPlan = await this.generateModificationPlan(instruction, intent, data, context)

      // Execute the modifications
      const result = await this.executeModifications(modificationPlan, data)

      return {
        success: true,
        modifiedData: result.modifiedData,
        changes: result.changes,
        explanation: result.explanation,
        confidence: result.confidence,
        warnings: result.warnings,
      }
    } catch (error) {
      console.error("Data modification error:", error)
      return {
        success: false,
        modifiedData: request.data,
        changes: [],
        explanation: `Failed to process modification: ${error}`,
        confidence: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  private static async analyzeModificationIntent(
    instruction: string,
    targetData: string,
    data: ProcessedData,
  ): Promise<any> {
    const { text } = await generateText({
      system: `You are a data modification intent analyzer. Analyze natural language instructions and determine the modification intent.

Return a JSON object with:
- "action": the primary action (update, insert, delete, transform, standardize, clean)
- "target": what to modify (specific fields, rows, or entire datasets)
- "conditions": any conditions or filters to apply
- "scope": how many records should be affected
- "complexity": simple, moderate, or complex
- "confidence": 0-100 confidence in understanding the intent

Examples:
- "Update all high priority clients to have priority level 5" → action: update, target: priority field, conditions: priority="High"
- "Remove workers without skills" → action: delete, conditions: skills empty
- "Standardize all email formats" → action: transform, target: email field
- "Add missing task IDs starting with T100" → action: insert, target: new tasks`,

      prompt: `Instruction: "${instruction}"
Target data: ${targetData}

Available data structure:
Clients (${data.clients.length}): ${data.clients
        .slice(0, 3)
        .map((c) => `${c.clientId}:${c.name}:${c.priority}`)
        .join(", ")}
Workers (${data.workers.length}): ${data.workers
        .slice(0, 3)
        .map((w) => `${w.workerId}:${w.name}:${w.skills?.join(",")}`)
        .join(", ")}
Tasks (${data.tasks.length}): ${data.tasks
        .slice(0, 3)
        .map((t) => `${t.taskId}:${t.title}:${t.duration}`)
        .join(", ")}

Analyze this instruction and return the modification intent.`,
    })

    return JSON.parse(text)
  }

  private static async generateModificationPlan(
    instruction: string,
    intent: any,
    data: ProcessedData,
    context?: any,
  ): Promise<any> {
    const { text } = await generateText({
      system: `You are a data modification planner. Create detailed modification plans based on analyzed intent.

Return a JSON object with:
- "modifications": array of specific modifications to make
- "validation": validation rules to check before/after
- "dependencies": any data dependencies to consider
- "risks": potential risks and mitigation strategies
- "explanation": human-readable explanation of what will happen

Each modification should include:
- "id": unique identifier
- "type": update/insert/delete/transform
- "entity": client/worker/task
- "entityId": specific ID or selection criteria
- "field": field to modify (if applicable)
- "newValue": new value or transformation rule
- "condition": when to apply this modification
- "confidence": 0-100 confidence in this modification

Be conservative and prefer safe modifications. Always preserve data integrity.`,

      prompt: `Instruction: "${instruction}"
Intent analysis: ${JSON.stringify(intent, null, 2)}

Current data:
${JSON.stringify(
  {
    clients: data.clients.slice(0, 5),
    workers: data.workers.slice(0, 5),
    tasks: data.tasks.slice(0, 5),
  },
  null,
  2,
)}

Context: ${JSON.stringify(context, null, 2)}

Generate a detailed modification plan.`,
    })

    return JSON.parse(text)
  }

  private static async executeModifications(plan: any, data: ProcessedData): Promise<any> {
    const modifiedData = JSON.parse(JSON.stringify(data)) // Deep clone
    const changes: DataChange[] = []
    let totalConfidence = 0

    for (const modification of plan.modifications) {
      try {
        const change = await this.executeModification(modification, modifiedData)
        if (change) {
          changes.push(change)
          totalConfidence += change.confidence
        }
      } catch (error) {
        console.error("Modification execution error:", error)
      }
    }

    const avgConfidence = changes.length > 0 ? totalConfidence / changes.length : 0

    return {
      modifiedData,
      changes,
      explanation: plan.explanation || "Data modifications completed",
      confidence: Math.round(avgConfidence),
      warnings: plan.risks || [],
    }
  }

  private static async executeModification(modification: any, data: ProcessedData): Promise<DataChange | null> {
    const { type, entity, entityId, field, newValue, condition } = modification

    switch (type) {
      case "update":
        return this.executeUpdate(modification, data)
      case "insert":
        return this.executeInsert(modification, data)
      case "delete":
        return this.executeDelete(modification, data)
      case "transform":
        return this.executeTransform(modification, data)
      default:
        return null
    }
  }

  private static executeUpdate(modification: any, data: ProcessedData): DataChange | null {
    const { entity, entityId, field, newValue, condition } = modification

    let targetArray: any[]
    switch (entity) {
      case "client":
        targetArray = data.clients
        break
      case "worker":
        targetArray = data.workers
        break
      case "task":
        targetArray = data.tasks
        break
      default:
        return null
    }

    const targets = this.findTargetEntities(targetArray, entityId, condition)

    for (const target of targets) {
      const oldValue = target[field]
      target[field] = this.resolveNewValue(newValue, target, oldValue)

      return {
        id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "update",
        entity,
        entityId: target[this.getIdField(entity)],
        field,
        oldValue,
        newValue: target[field],
        reason: modification.reason || "Natural language modification",
        confidence: modification.confidence || 85,
      }
    }

    return null
  }

  private static executeInsert(modification: any, data: ProcessedData): DataChange | null {
    const { entity, newValue } = modification

    let targetArray: any[]
    let idField: string

    switch (entity) {
      case "client":
        targetArray = data.clients
        idField = "clientId"
        break
      case "worker":
        targetArray = data.workers
        idField = "workerId"
        break
      case "task":
        targetArray = data.tasks
        idField = "taskId"
        break
      default:
        return null
    }

    const newEntity = {
      ...newValue,
      [idField]: newValue[idField] || this.generateId(entity, targetArray),
    }

    targetArray.push(newEntity)

    return {
      id: `insert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "insert",
      entity,
      entityId: newEntity[idField],
      newValue: newEntity,
      reason: modification.reason || "Natural language insertion",
      confidence: modification.confidence || 80,
    }
  }

  private static executeDelete(modification: any, data: ProcessedData): DataChange | null {
    const { entity, entityId, condition } = modification

    let targetArray: any[]
    switch (entity) {
      case "client":
        targetArray = data.clients
        break
      case "worker":
        targetArray = data.workers
        break
      case "task":
        targetArray = data.tasks
        break
      default:
        return null
    }

    const targets = this.findTargetEntities(targetArray, entityId, condition)
    const deletedEntities = []

    for (let i = targetArray.length - 1; i >= 0; i--) {
      if (targets.includes(targetArray[i])) {
        deletedEntities.push(targetArray.splice(i, 1)[0])
      }
    }

    if (deletedEntities.length > 0) {
      return {
        id: `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "delete",
        entity,
        entityId: deletedEntities[0][this.getIdField(entity)],
        oldValue: deletedEntities[0],
        reason: modification.reason || "Natural language deletion",
        confidence: modification.confidence || 75,
      }
    }

    return null
  }

  private static executeTransform(modification: any, data: ProcessedData): DataChange | null {
    const { entity, field, newValue } = modification

    let targetArray: any[]
    switch (entity) {
      case "client":
        targetArray = data.clients
        break
      case "worker":
        targetArray = data.workers
        break
      case "task":
        targetArray = data.tasks
        break
      default:
        return null
    }

    const transformedCount = targetArray.length
    for (const target of targetArray) {
      if (target[field]) {
        const oldValue = target[field]
        target[field] = this.applyTransformation(target[field], newValue)
      }
    }

    return {
      id: `transform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "transform",
      entity,
      entityId: "multiple",
      field,
      reason: modification.reason || "Natural language transformation",
      confidence: modification.confidence || 80,
    }
  }

  private static findTargetEntities(array: any[], entityId: string, condition: any): any[] {
    if (entityId === "all" || entityId === "*") {
      return condition ? array.filter((item) => this.evaluateCondition(item, condition)) : array
    }

    if (entityId.includes("*") || entityId.includes("?")) {
      // Pattern matching
      const regex = new RegExp(entityId.replace(/\*/g, ".*").replace(/\?/g, "."))
      return array.filter((item) => {
        const id = item[this.getIdField(this.getEntityType(array))]
        return regex.test(id)
      })
    }

    // Specific ID
    const idField = this.getIdField(this.getEntityType(array))
    return array.filter((item) => item[idField] === entityId)
  }

  private static evaluateCondition(item: any, condition: any): boolean {
    if (!condition) return true

    for (const [field, value] of Object.entries(condition)) {
      if (typeof value === "string" && value.includes("*")) {
        const regex = new RegExp(value.replace(/\*/g, ".*"))
        if (!regex.test(item[field])) return false
      } else if (item[field] !== value) {
        return false
      }
    }

    return true
  }

  private static resolveNewValue(newValue: any, target: any, oldValue: any): any {
    if (typeof newValue === "string") {
      // Handle template strings like "${oldValue}_updated"
      return newValue.replace(/\$\{(\w+)\}/g, (match, key) => {
        if (key === "oldValue") return oldValue
        return target[key] || match
      })
    }

    return newValue
  }

  private static applyTransformation(value: any, transformation: any): any {
    if (typeof transformation === "string") {
      switch (transformation.toLowerCase()) {
        case "uppercase":
          return typeof value === "string" ? value.toUpperCase() : value
        case "lowercase":
          return typeof value === "string" ? value.toLowerCase() : value
        case "trim":
          return typeof value === "string" ? value.trim() : value
        case "standardize_email":
          return typeof value === "string" ? value.toLowerCase().trim() : value
        default:
          return value
      }
    }

    return transformation
  }

  private static getIdField(entity: string): string {
    switch (entity) {
      case "client":
        return "clientId"
      case "worker":
        return "workerId"
      case "task":
        return "taskId"
      default:
        return "id"
    }
  }

  private static getEntityType(array: any[]): string {
    if (array.length === 0) return "unknown"
    const firstItem = array[0]
    if (firstItem.clientId) return "client"
    if (firstItem.workerId) return "worker"
    if (firstItem.taskId) return "task"
    return "unknown"
  }

  private static generateId(entity: string, existingArray: any[]): string {
    const prefix = entity.charAt(0).toUpperCase()
    const existingIds = existingArray.map((item) => item[this.getIdField(entity)])
    let counter = 1

    while (existingIds.includes(`${prefix}${counter.toString().padStart(3, "0")}`)) {
      counter++
    }

    return `${prefix}${counter.toString().padStart(3, "0")}`
  }

  // Error Correction Methods
  static async correctDataErrors(request: ErrorCorrectionRequest): Promise<ErrorCorrectionResponse> {
    try {
      const { errors, data, correctionStrategy } = request

      // Group errors by type for batch processing
      const errorGroups = this.groupErrorsByType(errors)

      // Generate correction plan
      const correctionPlan = await this.generateCorrectionPlan(errorGroups, data, correctionStrategy)

      // Execute corrections
      const result = await this.executeCorrections(correctionPlan, data)

      return {
        success: true,
        correctedData: result.correctedData,
        corrections: result.corrections,
        remainingErrors: result.remainingErrors,
        explanation: result.explanation,
        confidence: result.confidence,
      }
    } catch (error) {
      console.error("Error correction failed:", error)
      return {
        success: false,
        correctedData: request.data,
        corrections: [],
        remainingErrors: request.errors,
        explanation: `Error correction failed: ${error}`,
        confidence: 0,
      }
    }
  }

  private static groupErrorsByType(errors: ValidationError[]): Record<string, ValidationError[]> {
    return errors.reduce(
      (groups, error) => {
        const type = this.categorizeError(error)
        if (!groups[type]) groups[type] = []
        groups[type].push(error)
        return groups
      },
      {} as Record<string, ValidationError[]>,
    )
  }

  private static categorizeError(error: ValidationError): string {
    const { error: errorMsg, column } = error

    if (errorMsg.includes("email") || errorMsg.includes("Invalid email")) return "email_format"
    if (errorMsg.includes("required") || errorMsg.includes("Missing")) return "missing_required"
    if (errorMsg.includes("Duplicate")) return "duplicate_ids"
    if (errorMsg.includes("JSON")) return "json_format"
    if (errorMsg.includes("reference") || errorMsg.includes("Unknown")) return "invalid_references"
    if (errorMsg.includes("format") || errorMsg.includes("Invalid")) return "format_validation"
    if (errorMsg.includes("range") || errorMsg.includes("must be")) return "value_range"

    return "general_validation"
  }

  private static async generateCorrectionPlan(
    errorGroups: Record<string, ValidationError[]>,
    data: ProcessedData,
    strategy: string,
  ): Promise<any> {
    const { text } = await generateText({
      system: `You are an expert data correction specialist. Generate correction plans for validation errors.

Correction strategies:
- "conservative": Only fix obvious errors, preserve original data as much as possible
- "aggressive": Fix all possible errors, make assumptions when needed
- "smart": Balance between conservative and aggressive, use context clues

Return a JSON object with:
- "corrections": array of specific corrections to apply
- "strategy": the strategy used
- "confidence": overall confidence in corrections
- "explanation": what will be corrected and why

Each correction should include:
- "errorType": type of error being fixed
- "entity": client/worker/task
- "entityId": specific ID
- "field": field to correct
- "currentValue": current incorrect value
- "correctedValue": proposed correction
- "method": how the correction was determined
- "confidence": 0-100 confidence in this correction
- "reasoning": why this correction makes sense

Common correction methods:
- Pattern matching for IDs and formats
- Context-based inference for missing values
- Standardization for inconsistent formats
- Reference resolution for broken links`,

      prompt: `Error groups to correct:
${JSON.stringify(errorGroups, null, 2)}

Current data context:
${JSON.stringify(
  {
    clients: data.clients.slice(0, 3),
    workers: data.workers.slice(0, 3),
    tasks: data.tasks.slice(0, 3),
  },
  null,
  2,
)}

Strategy: ${strategy}

Generate a comprehensive correction plan.`,
    })

    return JSON.parse(text)
  }

  private static async executeCorrections(plan: any, data: ProcessedData): Promise<any> {
    const correctedData = JSON.parse(JSON.stringify(data)) // Deep clone
    const corrections: DataCorrection[] = []
    const remainingErrors: ValidationError[] = []

    for (const correction of plan.corrections) {
      try {
        const result = await this.executeCorrection(correction, correctedData)
        if (result) {
          corrections.push(result)
        }
      } catch (error) {
        console.error("Correction execution error:", error)
      }
    }

    // Calculate overall confidence
    const avgConfidence =
      corrections.length > 0 ? corrections.reduce((sum, c) => sum + c.confidence, 0) / corrections.length : 0

    return {
      correctedData,
      corrections,
      remainingErrors,
      explanation: plan.explanation || "Data corrections applied successfully",
      confidence: Math.round(avgConfidence),
    }
  }

  private static async executeCorrection(correction: any, data: ProcessedData): Promise<DataCorrection | null> {
    const { entity, entityId, field, correctedValue, method, errorType } = correction

    let targetArray: any[]
    switch (entity) {
      case "client":
        targetArray = data.clients
        break
      case "worker":
        targetArray = data.workers
        break
      case "task":
        targetArray = data.tasks
        break
      default:
        return null
    }

    const target = targetArray.find((item) => item[this.getIdField(entity)] === entityId)
    if (!target) return null

    const originalValue = target[field]
    target[field] = correctedValue

    return {
      id: `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      errorType,
      entity,
      entityId,
      field,
      originalValue,
      correctedValue,
      correctionMethod: method,
      confidence: correction.confidence || 85,
      reasoning: correction.reasoning || "AI-based correction",
    }
  }
}
