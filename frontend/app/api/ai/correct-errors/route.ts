import { type NextRequest, NextResponse } from "next/server"
import { AIDataModifier } from "@/lib/ai-data-modifier"
import type { ErrorCorrectionRequest } from "@/lib/ai-data-modifier"

export async function POST(request: NextRequest) {
  try {
    // Check if Gemini API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({
        success: false,
        correctedData: null,
        corrections: [],
        remainingErrors: [],
        explanation: "AI functionality requires Google Gemini API key configuration",
        confidence: 0,
      }, { status: 503 })
    }

    const body: ErrorCorrectionRequest = await request.json()

    const result = await AIDataModifier.correctDataErrors(body)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error correction API error:", error)
    return NextResponse.json(
      {
        success: false,
        correctedData: null,
        corrections: [],
        remainingErrors: [],
        explanation: "Failed to process error correction request",
        confidence: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 },
    )
  }
}
