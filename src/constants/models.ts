import { getUniqueNameFromId } from "@/hooks/use-unique-names"

const MODEL_DATA = {
  // Meta / Llama
  "meta-llama/llama-3.3-70b-instruct": "Llama 3.3 70B",
  "meta-llama/llama-3.1-8b-instruct": "Llama 3.1 8B",
  "meta-llama/llama-4-maverick": "Llama 4 Maverick",
  "meta-llama/llama-4-scout": "Llama 4 Scout",

  // Google
  "google/gemini-3.5-flash": "Gemini 3.5 Flash",
  "google/gemini-3.1-pro-preview": "Gemini 3.1 Pro",
  "google/gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-2.5-flash-lite-preview-09-2025": "Gemini 2.5 Flash Lite",
  "google/gemma-4-31b-it": "Gemma 4 31B",
  "google/gemma-3-12b-it": "Gemma 3 12B",

  // NousResearch / Hermes
  "nousresearch/hermes-4-405b": "Hermes 4 405B",

  // Qwen
  "qwen/qwen3.7-max": "Qwen3.7 Max",
  "qwen/qwen3.6-plus": "Qwen3.6 Plus",
  "qwen/qwen-2.5-72b-instruct": "Qwen 2.5 72B",
  "qwen/qwen-2.5-7b-instruct": "Qwen 2.5 7B",

  // Mistral
  "mistralai/mistral-large-2512": "Mistral Large 3",
  "mistralai/mistral-small-3.2-24b-instruct": "Mistral Small 3.2 24B",
  "mistralai/mistral-small-24b-instruct-2501": "Mistral Small 3",
  "mistralai/mistral-nemo": "Mistral Nemo",

  // DeepSeek
  "deepseek/deepseek-v4-pro": "DeepSeek V4 Pro",
  "deepseek/deepseek-v4-flash": "DeepSeek V4 Flash",

  // Anthropic
  "anthropic/claude-opus-4.8": "Claude Opus 4.8",
  "anthropic/claude-sonnet-4.5": "Claude Sonnet 4.5",
  "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku",

  // OpenAI
  "openai/gpt-5.5-pro": "GPT-5.5 Pro",
  "openai/gpt-5.4": "GPT-5.4",
  "openai/gpt-5.4-mini": "GPT-5.4 Mini",
  "openai/gpt-5-nano": "GPT-5 Nano",
  "openai/gpt-4.1-mini": "GPT-4.1 Mini",
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4o-mini": "GPT-4o Mini",

  // Kimi (MoonshotAI)
  "moonshotai/kimi-k2.6": "Kimi K2.6",
  "moonshotai/kimi-k2-thinking": "Kimi K2 Thinking",

  // GLM (Z.ai)
  "z-ai/glm-5.1": "GLM 5.1",
  "z-ai/glm-4.7": "GLM 4.7",

  // MiniMax
  "minimax/minimax-m3": "MiniMax M3",
  "minimax/minimax-m2.7": "MiniMax M2.7",

  // xAI Grok
  "x-ai/grok-4.20": "Grok 4.20",
  "x-ai/grok-4.3": "Grok 4.3",

  // Weitere
  "sao10k/l3.3-euryale-70b": "Llama 3.3 Euryale 70B",
  "microsoft/phi-4": "Phi-4",
  "cohere/command-a": "Command A",
  "cohere/command-r-plus-08-2024": "Command R+",
  "bytedance-seed/seed-2.0-lite": "Seed 2.0 Lite",
  "nvidia/nemotron-3-super-120b-a12b": "Nemotron 3 Super",
  "inception/mercury-2": "Mercury 2",
  "stepfun/step-3.7-flash": "Step 3.7 Flash",
  "xiaomi/mimo-v2-flash": "MiMo V2 Flash",
} as const

type ModelId = keyof typeof MODEL_DATA

export function lookupModelName<T extends ModelId | (string & {})>(
  modelId: T
): T extends ModelId ? (typeof MODEL_DATA)[T] : `Unknown: ${typeof modelId}` {
  if (modelId in MODEL_DATA) {
    return MODEL_DATA[modelId as ModelId] as never
  }
  return `Unknown: ${modelId}` as never
}

export const AVAILABLE_MODELS: Array<ModelId> = Object.keys(
  MODEL_DATA
) as Array<ModelId>

const USER_PREFIX = "user:"
const MODEL_PREFIX = "model:"

export function lookupLeaderboardName(id: string): string {
  if (id.startsWith(USER_PREFIX)) {
    return `Player ${getUniqueNameFromId(id)}`
  }
  return lookupModelName(id)
}

export function resolveDisplayName(
  id: string,
  players: Array<{ playerId: string; displayName: string }>,
): string {
  if (id.startsWith(USER_PREFIX)) {
    const pid = id.slice(USER_PREFIX.length)
    return players.find((p) => p.playerId === pid)?.displayName ?? id
  }
  if (id.startsWith(MODEL_PREFIX)) {
    return lookupModelName(id.slice(MODEL_PREFIX.length))
  }
  return lookupModelName(id)
}
