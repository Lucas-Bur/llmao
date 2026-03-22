import { chat } from "@tanstack/ai"
import { openRouterText } from "@tanstack/ai-openrouter"
import type { OpenRouterModelOptionsByName } from "@tanstack/ai-openrouter"
import { v } from "convex/values"

import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import {
  playerPrompt,
  playerSystemPrompt,
  votePrompt,
  voteSystemPrompt,
  writerPrompt,
  writerSystemPrompt,
} from "./prompts"
import { cleanResponse, shuffle, withRetry } from "./utils"

type ModelId = keyof OpenRouterModelOptionsByName

async function invokeText(
  model: string,
  systemPrompt: string,
  prompt: string,
  validate: (value: string) => boolean = (value) => value.length > 0
) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured")
  }

  return await withRetry(
    async () => {
      const abortController = new AbortController()
      setTimeout(() => {
        abortController.abort()
      }, 10_000)

      const result = (await chat({
        adapter: openRouterText(model as ModelId),
        stream: false,
        messages: [{ role: "user", content: prompt }],
        systemPrompts: [systemPrompt],
        temperature: 1.1,
        abortController,
      })) as string
      return cleanResponse(result)
    },
    validate,
    3
  )
}

// ---------------------------------------------------------------------------

export const generatePrompt = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.games.getGameInternal, {
      gameId: args.gameId,
    })
    if (!data) throw new Error("Game not found")
    if (data.game.status !== "prompting") return

    const system = writerSystemPrompt()
    const prompt = writerPrompt()

    try {
      const text = await invokeText(
        data.game.promptModel,
        system,
        prompt,
        (s) => s.trim().length >= 6
      )

      await ctx.runMutation(internal.games.savePromptResult, {
        gameId: args.gameId,
        model: data.game.promptModel,
        text,
        promptText: prompt,
        rawResponse: text,
      })
    } catch (error) {
      await ctx.runMutation(internal.games.savePromptFailure, {
        gameId: args.gameId,
        model: data.game.promptModel,
        promptText: prompt,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

export const generateAnswers = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.games.getGameInternal, {
      gameId: args.gameId,
    })
    if (!data?.game || !data.prompt) {
      throw new Error("Incomplete game state")
    }
    if (data.game.status !== "responding") return

    const system = playerSystemPrompt()
    const promptText = playerPrompt(data.prompt.text)

    // Skip models that already have an answer
    const answeredModels = new Set(data.answers.map((a) => a.model))

    const pendingModels = data.game.playerModels.filter(
      (m) => !answeredModels.has(m)
    )

    await Promise.all(
      pendingModels.map(async (model) => {
        try {
          const text = await invokeText(
            model,
            system,
            promptText,
            (s) => s.trim().length > 0
          )

          await ctx.runMutation(internal.games.saveAnswerResult, {
            gameId: args.gameId,
            model,
            text,
            promptText,
            rawResponse: text,
          })
        } catch (error) {
          await ctx.runMutation(internal.games.saveAnswerFailure, {
            gameId: args.gameId,
            model,
            promptText,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          })
        }
      })
    )
  },
})

export const generateModelVotes = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.games.getGameInternal, {
      gameId: args.gameId,
    })
    if (!data?.game || !data.prompt || data.answers.length < 2) {
      throw new Error("Incomplete voting state")
    }
    if (data.game.status !== "voting") return

    const existingVoterIds = new Set(data.votes.map((vote) => vote.voterId))

    const pendingVoters = data.game.voterModels.filter(
      (m) => !existingVoterIds.has(`model:${m}`)
    )

    // Shuffle answers to avoid position bias, build label map
    const shuffled = shuffle(
      data.answers.map((a) => ({ id: a._id, text: a.text }))
    )
    const labeledAnswers = shuffled.map((a, i) => ({
      ...a,
      label: String(i + 1),
    }))

    const system = voteSystemPrompt(labeledAnswers.length)
    const promptText = votePrompt(
      data.prompt.text,
      labeledAnswers.map((a) => ({ label: a.label, text: a.text }))
    )

    const validNumbers = new Set(labeledAnswers.map((_, i) => String(i + 1)))

    await Promise.all(
      pendingVoters.map(async (model) => {
        const voterId = `model:${model}`
        try {
          const raw = await invokeText(model, system, promptText, (s) =>
            validNumbers.has(s.trim())
          )

          const index = Number.parseInt(raw.trim(), 10) - 1
          const chosen = labeledAnswers[index]

          await ctx.runMutation(internal.games.saveModelVote, {
            gameId: args.gameId,
            voterId,
            model,
            answerId: chosen.id,
            promptText,
            rawResponse: raw,
          })
        } catch (error) {
          await ctx.runMutation(internal.games.saveModelVoteFailure, {
            gameId: args.gameId,
            voterId,
            model,
            promptText,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          })
        }
      })
    )
  },
})

export const tryFinalizeGame = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.games.finalizeResolvedGame, {
      gameId: args.gameId,
    })
  },
})
