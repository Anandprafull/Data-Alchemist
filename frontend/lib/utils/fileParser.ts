import * as XLSX from 'xlsx'

export async function parseFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Failed to read file'))
          return
        }

        let parsedData: any[] = []

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = data as string
          parsedData = parseCSV(text)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          parsedData = XLSX.utils.sheet_to_json(worksheet)
        } else {
          reject(new Error('Unsupported file format'))
          return
        }

        resolve(parsedData)
      } catch (error) {
        reject(new Error(`File processing error: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const data: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    const row: any = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }

  return data
}

export function normalizeHeaders(data: any[], type: 'clients' | 'workers' | 'tasks'): any[] {
  if (!data || data.length === 0) return []

  const headerMappings: Record<string, Record<string, string>> = {
    clients: {
      'client_id': 'id',
      'client_name': 'name',
      'client_email': 'email',
      'client_priority': 'priority',
      'requested_task_ids': 'requestedTaskIds',
      'requestedtaskids': 'requestedTaskIds',
      'requested_tasks': 'requestedTaskIds'
    },
    workers: {
      'worker_id': 'id',
      'worker_name': 'name',
      'worker_email': 'email',
      'worker_skills': 'skills',
      'max_load': 'maxLoad',
      'maxload': 'maxLoad',
      'department': 'department'
    },
    tasks: {
      'task_id': 'id',
      'task_name': 'name',
      'task_description': 'description',
      'required_skills': 'requiredSkills',
      'requiredskills': 'requiredSkills',
      'duration': 'duration',
      'priority': 'priority',
      'status': 'status'
    }
  }

  const mapping = headerMappings[type]
  
  return data.map(row => {
    const normalizedRow: any = {}
    
    Object.keys(row).forEach(key => {
      const normalizedKey = mapping[key.toLowerCase()] || key
      let value = row[key]
      
      // Handle special data types
      if (normalizedKey === 'requestedTaskIds' || normalizedKey === 'skills' || normalizedKey === 'requiredSkills') {
        if (typeof value === 'string') {
          value = value.split(',').map(v => v.trim()).filter(v => v.length > 0)
        }
      } else if (normalizedKey === 'priority' || normalizedKey === 'duration' || normalizedKey === 'maxLoad') {
        value = parseFloat(value) || 0
      }
      
      normalizedRow[normalizedKey] = value
    })
    
    return normalizedRow
  })
}
