export const MODEL_OPTIONS = [
  "openai/gpt-5-nano",
  "openai/gpt-4.1-mini",
  "google/gemini-2.5-flash-lite-preview-09-2025",
  "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku",
  "xiaomi/mimo-v2-flash",
  "meta-llama/llama-3.3-70b-instruct",
] as const

export type Side = "A" | "B"
