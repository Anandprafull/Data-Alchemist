export interface ClientData {
  clientId: string
  name: string
  email: string
  priority: "High" | "Medium" | "Low"
  requestedTaskIds?: string[]
}

export interface WorkerData {
  workerId: string
  name: string
  skills: string[]
  availability: string
  maxLoad?: number
}

export interface TaskData {
  taskId: string
  title: string
  duration: string
  phase: string
  requiredSkills?: string[]
  priority?: number
}

export interface ValidationError {
  // Backend format
  error_type?: string
  message?: string
  details?: any
  
  // Frontend format (for compatibility)
  file?: string
  row?: number
  column?: string
  error?: string
  severity?: "error" | "warning" | "info"
  suggestion?: string
}

export interface RuleConfig {
  coRunGroups: CoRunGroup[]
  slotRestrictions: SlotRestriction[]
  loadLimits: LoadLimit[]
  phaseWindows: PhaseWindow[]
  patternMatches: PatternMatch[]
  precedenceOverrides: PrecedenceOverride[]
  customRules: CustomRule[]
}

export interface CoRunGroup {
  id: string
  name: string
  taskIds: string[]
  description?: string
  priority: number
  createdAt: string
}

export interface SlotRestriction {
  id: string
  name: string
  groupType: "client" | "worker"
  groupIds: string[]
  minCommonSlots: number
  maxSlots?: number
  description?: string
  priority: number
  createdAt: string
}

export interface LoadLimit {
  id: string
  name: string
  workerGroupIds: string[]
  maxSlotsPerPhase: number
  phases: number[]
  description?: string
  priority: number
  createdAt: string
}

export interface PhaseWindow {
  id: string
  name: string
  taskId: string
  allowedPhases: number[]
  description?: string
  priority: number
  createdAt: string
}

export interface PatternMatch {
  id: string
  name: string
  pattern: string
  ruleTemplate: string
  parameters: Record<string, any>
  description?: string
  priority: number
  createdAt: string
}

export interface PrecedenceOverride {
  id: string
  name: string
  globalRules: string[]
  specificRules: string[]
  priorityOrder: string[]
  description?: string
  createdAt: string
}

export interface CustomRule {
  id: string
  name: string
  type: string
  conditions: any[]
  actions: any[]
  description?: string
  priority: number
  createdAt: string
  aiGenerated?: boolean
}

export interface ProcessedData {
  clients: ClientData[]
  workers: WorkerData[]
  tasks: TaskData[]
  validationErrors: ValidationError[]
  dataQuality: {
    totalRows: number
    cleanRows: number
    errorRows: number
    qualityScore: number
  }
}

export interface RuleGenerationRequest {
  description: string
  context: {
    clients: ClientData[]
    workers: WorkerData[]
    tasks: TaskData[]
  }
}

export interface RuleGenerationResponse {
  success: boolean
  rule?: any
  ruleType: string
  confidence: number
  explanation: string
  suggestions?: string[]
  errors?: string[]
}
