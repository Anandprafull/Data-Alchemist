import { generateText } from "./ai-config"
import type { ValidationError, ProcessedData } from "./types"

export class AIService {
  static async fixDataErrors(
    data: ProcessedData,
    errors: ValidationError[],
  ): Promise<{ suggestions: any[]; fixedData: ProcessedData }> {
    const errorSummary = this.summarizeErrors(errors)

    const { text } = await generateText({
      system: `You are a data cleaning expert. Analyze validation errors and provide specific suggestions to fix them. 
      Return your response as a JSON object with 'suggestions' array containing fix recommendations.`,
      prompt: `Here are the validation errors in the dataset:
      ${JSON.stringify(errorSummary, null, 2)}
      
      Provide specific suggestions to fix these errors, including:
      1. Data corrections
      2. Format standardizations
      3. Missing value recommendations
      4. Cross-reference fixes`,
    })

    try {
      const aiResponse = JSON.parse(text)
      const fixedData = await this.applyAISuggestions(data, aiResponse.suggestions)

      return {
        suggestions: aiResponse.suggestions,
        fixedData,
      }
    } catch (error) {
      console.error("AI response parsing error:", error)
      return { suggestions: [], fixedData: data }
    }
  }

  static async processNaturalLanguageQuery(
    query: string,
    data: ProcessedData,
  ): Promise<{ results: any[]; explanation: string }> {
    const { text } = await generateText({
      system: `You are a data query assistant. Convert natural language queries into data filters and return matching results.
      Return your response as JSON with 'results' array and 'explanation' string.`,
      prompt: `Query: "${query}"
      
      Available data structure:
      - Clients: ${JSON.stringify(data.clients.slice(0, 2), null, 2)}
      - Workers: ${JSON.stringify(data.workers.slice(0, 2), null, 2)}
      - Tasks: ${JSON.stringify(data.tasks.slice(0, 2), null, 2)}
      
      Process this query and return matching data with explanation.`,
    })

    try {
      return JSON.parse(text)
    } catch (error) {
      return { results: [], explanation: "Could not process the query" }
    }
  }

  static async generateRuleFromDescription(description: string): Promise<any> {
    const { text } = await generateText({
      system: `You are a rule generation expert. Convert natural language descriptions into structured rule configurations.
      Return valid JSON rule configuration.`,
      prompt: `Generate a rule configuration for: "${description}"
      
      Return a JSON object with appropriate rule structure including:
      - Rule type (coRunGroup, slotRestriction, loadLimit, phaseWindow, customRule)
      - Rule parameters
      - Validation criteria`,
    })

    try {
      return JSON.parse(text)
    } catch (error) {
      return { error: "Could not generate rule from description" }
    }
  }

  private static summarizeErrors(errors: ValidationError[]) {
    const summary = {
      totalErrors: errors.length,
      errorsByFile: {} as Record<string, number>,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
    }

    errors.forEach((error) => {
      // Count by file
      summary.errorsByFile[error.file] = (summary.errorsByFile[error.file] || 0) + 1

      // Count by type (column)
      summary.errorsByType[error.column] = (summary.errorsByType[error.column] || 0) + 1

      // Count by severity
      summary.errorsBySeverity[error.severity] = (summary.errorsBySeverity[error.severity] || 0) + 1
    })

    return summary
  }

  private static async applyAISuggestions(data: ProcessedData, suggestions: any[]): Promise<ProcessedData> {
    // This would implement the actual data fixing logic based on AI suggestions
    // For now, return the original data
    return data
  }
}
