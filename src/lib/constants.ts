export const MODEL_LOOKUP_NAMES = {
  "openai/gpt-5-nano": "GPT-5 Nano",
  "openai/gpt-4.1-mini": "GPT-4.1 Mini",
  "google/gemini-2.5-flash-lite-preview-09-2025": "Gemini 2.5 Flash Lite",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku",
  "xiaomi/mimo-v2-flash": "MiMo-V2-Flash",
  "moonshotai/kimi-k2.5": "Kimi K2.5",
} as const

export const MODEL_OPTIONS = Object.keys(MODEL_LOOKUP_NAMES) as Array<
  keyof typeof MODEL_LOOKUP_NAMES
>

export type Side = "A" | "B"
