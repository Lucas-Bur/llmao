import { ALL_PROMPTS } from "./data/prompts"
import { shuffle } from "./utils"

const LANG_MAP: Record<string, string> = { de: "German", en: "English" }

const langInstruction = (language: string) =>
  `Respond entirely in ${LANG_MAP[language] ?? "English"}.`

export const writerSystemPrompt = (language: string) => {
  const examples = shuffle([...ALL_PROMPTS]).slice(0, 80)
  return `You are a comedy writer for the game Quiplash. Generate a single funny fill-in-the-blank prompt that players will try to answer. The prompt should be surprising and designed to elicit hilarious responses. Return ONLY the prompt text, nothing else. Keep it short (under 15 words).

Use a wide VARIETY of prompt formats. Do NOT always use "The worst thing to..." - mix it up! Here are examples of the range of styles:

${examples.map((p) => `- ${p}`).join("\n")}

Come up with something ORIGINAL - don't copy these examples.

${langInstruction(language)}` as const
}

export const writerPrompt = (_language: string) =>
  `Generate a single original Quiplash prompt. Be creative and don't repeat common patterns. ${langInstruction(_language)}` as const

export const playerSystemPrompt = (language: string) =>
  `You are playing Quiplash! You'll be given a fill-in-the-blank prompt. Give the FUNNIEST possible answer. Be creative, edgy, unexpected, and concise. Reply with ONLY your answer - no quotes, no explanation, no preamble. Keep it short (under 12 words). Keep it concise and witty.

${langInstruction(language)}` as const

export const playerPrompt = (prompt: string, _language: string) =>
  `${langInstruction(_language)} Fill in the blank: ${prompt}` as const

export const voteSystemPrompt = (answerCount: number, language: string) =>
  `You are a judge in a comedy game. You'll see a prompt and ${answerCount} answers. Pick which answer is FUNNIEST. You MUST respond with exactly the number of your choice — nothing else.

${langInstruction(language)}` as const

export const votePrompt = (
  prompt: string,
  answers: Array<{ label: string; text: string }>
) =>
  `Prompt: "${prompt}"\n\n${answers.map((answer) => answer.label + ': "' + answer.text + '"').join("\n")}\n\nWhich is funniest? Reply with just the number.` as const
