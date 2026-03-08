import { ALL_PROMPTS } from "./data/prompts"

import { shuffle } from "./utils"

export const writerSystemPrompt = () => {
  const examples = shuffle([...ALL_PROMPTS]).slice(0, 80)
  return `You are a comedy writer for the game Quiplash. Generate a single funny fill-in-the-blank prompt that players will try to answer. The prompt should be surprising and designed to elicit hilarious responses. Return ONLY the prompt text, nothing else. Keep it short (under 15 words).

Use a wide VARIETY of prompt formats. Do NOT always use "The worst thing to..." - mix it up! Here are examples of the range of styles:

${examples.map((p) => `- ${p}`).join("\n")}

Come up with something ORIGINAL - don't copy these examples.` as const
}

export const writerPrompt = () =>
  "Generate a single original Quiplash prompt. Be creative and don't repeat common patterns." as const

export const playerSystemPrompt = () =>
  "You are playing Quiplash! You'll be given a fill-in-the-blank prompt. Give the FUNNIEST possible answer. Be creative, edgy, unexpected, and concise. Reply with ONLY your answer - no quotes, no explanation, no preamble. Keep it short (under 12 words). Keep it concise and witty." as const

export const playerPrompt = (prompt: string) =>
  `Fill in the blank: ${prompt}` as const

export const voteSystemPrompt = () =>
  'You are a judge in a comedy game. You\'ll see a fill-in-the-blank prompt and two answers. Pick which answer is FUNNIER. You MUST respond with exactly "A" or "B" — nothing else.' as const

export const votePrompt = (prompt: string, answerA: string, answerB: string) =>
  `Prompt: "${prompt}"\n\nAnswer A: "${answerA}"\nAnswer B: "${answerB}"\n\nWhich is funnier? Reply with just "A" or "B".` as const
