import { type NextRequest, NextResponse } from "next/server"
import { DataValidator } from "@/lib/data-validator"
import { AdvancedValidator } from "@/lib/advanced-validator"
import type { ProcessedData } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = {
      clients: formData.get("clients") as File | null,
      workers: formData.get("workers") as File | null,
      tasks: formData.get("tasks") as File | null,
    }

    const processedData: ProcessedData = {
      clients: [],
      workers: [],
      tasks: [],
      validationErrors: [],
      dataQuality: {
        totalRows: 0,
        cleanRows: 0,
        errorRows: 0,
        qualityScore: 0,
      },
    }

    const filenames = {
      clients: files.clients?.name || "clients.csv",
      workers: files.workers?.name || "workers.csv",
      tasks: files.tasks?.name || "tasks.csv",
    }

    // Process each file
    for (const [fileType, file] of Object.entries(files)) {
      if (!file) continue

      try {
        // Read file content on server-side
        const arrayBuffer = await file.arrayBuffer()
        let rawData: any[] = []

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = new TextDecoder().decode(arrayBuffer)
          const lines = text.split('\n').filter(line => line.trim())
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
            rawData = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
              const row: any = {}
              headers.forEach((header, index) => {
                // Map the actual header names to expected field names
                let mappedHeader = header.toLowerCase()
                
                // Client field mappings
                if (header === 'ClientID') mappedHeader = 'clientid'
                else if (header === 'ClientName') mappedHeader = 'name'
                else if (header === 'PriorityLevel') mappedHeader = 'priority'
                else if (header === 'RequestedTaskIDs') mappedHeader = 'requestedtaskids'
                else if (header === 'GroupTag') mappedHeader = 'grouptag'
                else if (header === 'AttributesJSON') mappedHeader = 'attributesjson'
                
                // Worker field mappings
                else if (header === 'WorkerID') mappedHeader = 'workerid'
                else if (header === 'WorkerName') mappedHeader = 'name'
                else if (header === 'Skills') mappedHeader = 'skills'
                else if (header === 'AvailableSlots') mappedHeader = 'availability'
                else if (header === 'MaxLoadPerPhase') mappedHeader = 'maxload'
                else if (header === 'WorkerGroup') mappedHeader = 'department'
                else if (header === 'QualificationLevel') mappedHeader = 'qualificationlevel'
                
                // Task field mappings
                else if (header === 'TaskID') mappedHeader = 'taskid'
                else if (header === 'TaskName') mappedHeader = 'title'
                else if (header === 'Category') mappedHeader = 'category'
                else if (header === 'RequiredSkills') mappedHeader = 'requiredskills'
                else if (header === 'Duration') mappedHeader = 'duration'
                else if (header === 'PreferredPhases') mappedHeader = 'phase'
                else if (header === 'MaxConcurrent') mappedHeader = 'maxconcurrent'
                
                row[mappedHeader] = values[index] || ''
              })
              
              // Generate email for clients if missing
              if (fileType === 'clients' && row.name && !row.email) {
                row.email = `${row.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
              }
              
              return row
            })
          }
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // Parse Excel using xlsx library (server-side compatible)
          const XLSX = require('xlsx')
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          if (workbook.SheetNames.length > 0) {
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
            if (jsonData.length > 0) {
              const headers = jsonData[0].map((h: string) => h.toString().trim().toLowerCase())
              rawData = jsonData.slice(1).map((row: any[]) => {
                const obj: any = {}
                headers.forEach((header: string, index: number) => {
                  obj[header] = row[index] || ''
                })
                return obj
              })
            }
          }
        }

        if (fileType === "clients") {
          const { validData, errors } = DataValidator.validateClients(rawData, file.name)
          processedData.clients = validData
          processedData.validationErrors.push(...errors)
        } else if (fileType === "workers") {
          const { validData, errors } = DataValidator.validateWorkers(rawData, file.name)
          processedData.workers = validData
          processedData.validationErrors.push(...errors)
        } else if (fileType === "tasks") {
          const { validData, errors } = DataValidator.validateTasks(rawData, file.name)
          processedData.tasks = validData
          processedData.validationErrors.push(...errors)
        }

        processedData.dataQuality.totalRows += rawData.length
      } catch (error) {
        processedData.validationErrors.push({
          file: file.name,
          row: 0,
          column: "file",
          error: `File processing error: ${error}`,
          severity: "error",
        })
      }
    }

    // Run advanced validations
    if (processedData.clients.length > 0 || processedData.workers.length > 0 || processedData.tasks.length > 0) {
      const advancedErrors = AdvancedValidator.validateAll(
        processedData.clients,
        processedData.workers,
        processedData.tasks,
        filenames,
      )
      processedData.validationErrors.push(...advancedErrors)
    }

    // Cross-reference validation
    if (processedData.clients.length > 0 && processedData.tasks.length > 0) {
      const crossRefErrors = DataValidator.validateCrossReferences(
        processedData.clients,
        processedData.workers,
        processedData.tasks,
      )
      processedData.validationErrors.push(...crossRefErrors)
    }

    // Calculate data quality metrics
    const totalValidRows = processedData.clients.length + processedData.workers.length + processedData.tasks.length
    processedData.dataQuality.cleanRows = totalValidRows
    processedData.dataQuality.errorRows = processedData.dataQuality.totalRows - totalValidRows
    processedData.dataQuality.qualityScore =
      processedData.dataQuality.totalRows > 0
        ? Math.round((totalValidRows / processedData.dataQuality.totalRows) * 100)
        : 0

    return NextResponse.json({
      success: true,
      data: processedData,
    })
  } catch (error) {
    console.error("Upload processing error:", error)
    return NextResponse.json({ success: false, error: "Failed to process uploaded files" }, { status: 500 })
  }
}
