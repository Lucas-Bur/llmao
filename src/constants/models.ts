const MODEL_DATA = {
  "openai/gpt-5-nano": "GPT-5 Nano",
  "openai/gpt-4.1-mini": "GPT-4.1 Mini",
  "google/gemini-2.5-flash-lite-preview-09-2025": "Gemini 2.5 Flash Lite",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku",
  "xiaomi/mimo-v2-flash": "MiMo-V2-Flash",
} as const

type ModelId = keyof typeof MODEL_DATA

export function lookupModelName<T extends ModelId | (string & {})>(
  modelId: T
): T extends ModelId ? (typeof MODEL_DATA)[T] : "Unbekannt" {
  if (modelId in MODEL_DATA) {
    return MODEL_DATA[modelId as ModelId] as never
  }
  return "Unbekannt" as never
}

export const AVAILABLE_MODELS: Array<ModelId> = Object.keys(
  MODEL_DATA
) as Array<ModelId>
