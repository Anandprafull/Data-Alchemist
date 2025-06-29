import { type NextRequest, NextResponse } from "next/server"
import type { ClientData, WorkerData, TaskData, RuleConfig } from "@/lib/sample-data"

export async function POST(request: NextRequest) {
  try {
    const {
      clients,
      workers,
      tasks,
      rules,
      format = "csv",
    }: {
      clients: ClientData[]
      workers: WorkerData[]
      tasks: TaskData[]
      rules: RuleConfig
      format?: "csv" | "json"
    } = await request.json()

    const exports: Record<string, string> = {}

    if (format === "csv") {
      // Convert data back to CSV format
      exports["clients.csv"] = convertToCSV(clients, ["clientId", "name", "email", "priority", "requestedTaskIds"])

      exports["workers.csv"] = convertToCSV(workers, ["workerId", "name", "skills", "availability", "maxLoad"])

      exports["tasks.csv"] = convertToCSV(tasks, ["taskId", "title", "duration", "phase", "requiredSkills", "priority"])
    }

    // Always include rules as JSON
    exports["rules.json"] = JSON.stringify(rules, null, 2)

    return NextResponse.json({
      success: true,
      files: exports,
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ success: false, error: "Failed to export data" }, { status: 500 })
  }
}

function convertToCSV(data: any[], columns: string[]): string {
  const headers = columns.join(",")
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = item[col]
        if (Array.isArray(value)) {
          return `"${value.join(";")}"`
        }
        return `"${value || ""}"`
      })
      .join(",")
  })

  return [headers, ...rows].join("\n")
}
