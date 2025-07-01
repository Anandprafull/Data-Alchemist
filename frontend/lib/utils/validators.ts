interface ValidationError {
  row: number
  field: string
  message: string
  type: 'error' | 'warning'
}

interface ValidationResult {
  clients: ValidationError[]
  workers: ValidationError[]
  tasks: ValidationError[]
}

interface DataStructure {
  clients: any[]
  workers: any[]
  tasks: any[]
  rules: any[]
}

export function validateAllData(data: DataStructure): ValidationResult {
  const result: ValidationResult = {
    clients: [],
    workers: [],
    tasks: []
  }

  // Validate clients
  data.clients.forEach((client, index) => {
    if (!client.id) {
      result.clients.push({
        row: index,
        field: 'id',
        message: 'Client ID is required',
        type: 'error'
      })
    }
    
    if (!client.name) {
      result.clients.push({
        row: index,
        field: 'name',
        message: 'Client name is required',
        type: 'error'
      })
    }
    
    if (!client.email) {
      result.clients.push({
        row: index,
        field: 'email',
        message: 'Client email is required',
        type: 'error'
      })
    } else if (!isValidEmail(client.email)) {
      result.clients.push({
        row: index,
        field: 'email',
        message: 'Invalid email format',
        type: 'error'
      })
    }
    
    if (client.priority && (client.priority < 1 || client.priority > 5)) {
      result.clients.push({
        row: index,
        field: 'priority',
        message: 'Priority must be between 1 and 5',
        type: 'warning'
      })
    }
  })

  // Validate workers
  data.workers.forEach((worker, index) => {
    if (!worker.id) {
      result.workers.push({
        row: index,
        field: 'id',
        message: 'Worker ID is required',
        type: 'error'
      })
    }
    
    if (!worker.name) {
      result.workers.push({
        row: index,
        field: 'name',
        message: 'Worker name is required',
        type: 'error'
      })
    }
    
    if (!worker.email) {
      result.workers.push({
        row: index,
        field: 'email',
        message: 'Worker email is required',
        type: 'error'
      })
    } else if (!isValidEmail(worker.email)) {
      result.workers.push({
        row: index,
        field: 'email',
        message: 'Invalid email format',
        type: 'error'
      })
    }
    
    if (worker.maxLoad && worker.maxLoad < 0) {
      result.workers.push({
        row: index,
        field: 'maxLoad',
        message: 'Max load cannot be negative',
        type: 'error'
      })
    }
  })

  // Validate tasks
  data.tasks.forEach((task, index) => {
    if (!task.id) {
      result.tasks.push({
        row: index,
        field: 'id',
        message: 'Task ID is required',
        type: 'error'
      })
    }
    
    if (!task.name) {
      result.tasks.push({
        row: index,
        field: 'name',
        message: 'Task name is required',
        type: 'error'
      })
    }
    
    if (task.duration && task.duration <= 0) {
      result.tasks.push({
        row: index,
        field: 'duration',
        message: 'Duration must be positive',
        type: 'error'
      })
    }
    
    if (task.priority && (task.priority < 1 || task.priority > 5)) {
      result.tasks.push({
        row: index,
        field: 'priority',
        message: 'Priority must be between 1 and 5',
        type: 'warning'
      })
    }
  })

  return result
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export type { ValidationError, ValidationResult }
