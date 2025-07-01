import Papa from "papaparse"
import * as XLSX from "xlsx"

export class CSVParser {
  static async parseFile(file: File): Promise<any[]> {
    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    if (fileExtension === "csv") {
      return this.parseCSV(file)
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      return this.parseExcel(file)
    } else {
      throw new Error("Unsupported file format. Please upload CSV or Excel files.")
    }
  }

  private static parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, ""),
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`))
          } else {
            resolve(results.data as any[])
          }
        },
        error: (error) => reject(error),
      })
    })
  }

  private static async parseExcel(file: File): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        
        if (workbook.SheetNames.length === 0) {
          reject(new Error("Excel file has no worksheets"))
          return
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length === 0) {
          reject(new Error("Excel file is empty"))
          return
        }

        // Convert to object format with headers
        const headers = (jsonData[0] as string[]).map((h) => h.toString().trim().toLowerCase().replace(/\s+/g, ""))
        const rows = jsonData.slice(1) as any[][]

        const result = rows.map((row) => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ""
          })
          return obj
        })

        resolve(result)
      } catch (error) {
        reject(new Error(`Excel parsing error: ${error}`))
      }
    })
  }
}
