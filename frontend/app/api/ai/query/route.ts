import { type NextRequest, NextResponse } from "next/server"
import { AIDataRetrieval } from "@/lib/ai-data-retrieval"
import type { ProcessedData } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Check if Gemini API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "AI functionality requires Google Gemini API key configuration"
      }, { status: 503 })
    }

    const { query, data }: { query: string; data: ProcessedData } = await request.json()

    const result = await AIDataRetrieval.processNaturalLanguageQuery(query, {
      clients: data.clients,
      workers: data.workers,
      tasks: data.tasks,
    })

    return NextResponse.json({
      success: true,
      results: result.results,
      explanation: result.explanation,
      filters: result.filters,
      totalFound: {
        clients: result.results.clients.length,
        workers: result.results.workers.length,
        tasks: result.results.tasks.length,
      },
    })
  } catch (error) {
    console.error("AI query processing error:", error)
    return NextResponse.json({ success: false, error: "Failed to process natural language query" }, { status: 500 })
  }
}
