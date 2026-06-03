const MODEL_DATA = {
  "meta-llama/llama-3.3-70b-instruct:free": "Llama 3.3 70B",
  "google/gemma-4-31b-it:free": "Gemma 4 31B",
  "nousresearch/hermes-3-llama-3.1-405b:free": "Hermes 3 405B",
  "qwen/qwen3-next-80b-a3b-instruct:free": "Qwen3 Next 80B",
  "meta-llama/llama-3.1-8b-instruct": "Llama 3.1 8B",
  "mistralai/mistral-nemo": "Mistral Nemo",
  "mistralai/mistral-small-24b-instruct-2501": "Mistral Small 3",
  "google/gemma-3-12b-it": "Gemma 3 12B",
  "qwen/qwen-2.5-7b-instruct": "Qwen 2.5 7B",
  "deepseek/deepseek-v4-flash": "DeepSeek V4 Flash",
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
