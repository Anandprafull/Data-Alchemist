import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")

// Model configurations for different use cases
export const AI_MODELS = {
  // Fast model for simple tasks
  FAST: "gemini-1.5-flash",
  // Default model for most tasks  
  DEFAULT: "gemini-1.5-pro",
  // Advanced model for complex reasoning
  ADVANCED: "gemini-1.5-pro",
} as const

// Default generation settings
export const AI_SETTINGS = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
} as const

// Helper function to get a model instance
export function getGeminiModel(modelName: string = AI_MODELS.DEFAULT) {
  return genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: AI_SETTINGS
  })
}

// Helper function to generate text with Gemini
export async function generateText(options: {
  model?: string
  system?: string
  prompt: string
}) {
  const model = getGeminiModel(options.model)
  
  // Combine system prompt with user prompt for Gemini
  const fullPrompt = options.system 
    ? `${options.system}\n\n${options.prompt}`
    : options.prompt
  
  const result = await model.generateContent(fullPrompt)
  const response = await result.response
  
  return {
    text: response.text()
  }
}

// Export the genAI instance for direct use if needed
export { genAI }
