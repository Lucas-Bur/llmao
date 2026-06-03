import { chat } from "@tanstack/ai"
import { openRouterText } from "@tanstack/ai-openrouter"
import type { OpenRouterModelOptionsByName } from "@tanstack/ai-openrouter"
import { v } from "convex/values"

import { internal } from "./_generated/api"
import { internalAction, type ActionCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import {
  playerPrompt,
  playerSystemPrompt,
  votePrompt,
  voteSystemPrompt,
  writerPrompt,
  writerSystemPrompt,
} from "./prompts"
import { cleanResponse, shuffle, withRetry } from "./utils"

async function loadGameData(
  ctx: ActionCtx,
  gameId: Id<"games">,
  expectedStatus?: Doc<"games">["status"]
) {
  const data = await ctx.runQuery(internal.games.getGameInternal, { gameId })
  if (!data) throw new Error("Game not found")
  if (expectedStatus && data.game.status !== expectedStatus) return null
  return data
}

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

type StageHandlers = {
  onSuccess: (ctx: ActionCtx, text: string, raw: string) => Promise<void>
  onFailure: (error: unknown) => Promise<void>
}

async function runModelStage(
  ctx: ActionCtx,
  model: string,
  system: string,
  prompt: string,
  validate: (value: string) => boolean,
  handlers: StageHandlers,
  rethrow?: boolean,
): Promise<void> {
  try {
    const raw = await invokeText(model, system, prompt, validate)
    await handlers.onSuccess(ctx, raw, raw)
  } catch (error) {
    await handlers.onFailure(error)
    if (rethrow) throw error
  }
}

// ---------------------------------------------------------------------------

export const generatePrompt = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const data = await loadGameData(ctx, args.gameId, "prompting")
    if (!data) return

    const system = writerSystemPrompt()
    const prompt = writerPrompt()

    await runModelStage(
      ctx,
      data.game.promptModel,
      system,
      prompt,
      (s) => s.trim().length >= 6,
      {
        onSuccess: async (ctx, text) => {
          await ctx.runMutation(internal.games.savePromptResult, {
            gameId: args.gameId,
            model: data.game.promptModel,
            text,
            promptText: prompt,
            rawResponse: text,
          })
        },
        onFailure: async (error) => {
          await ctx.runMutation(internal.games.savePromptFailure, {
            gameId: args.gameId,
            model: data.game.promptModel,
            promptText: prompt,
            errorMessage: error instanceof Error ? error.message : String(error),
          })
        },
      },
      true,
    )
  },
})

export const generateAnswers = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const data = await loadGameData(ctx, args.gameId, "responding")
    if (!data) return
    if (!data.prompt) throw new Error("Incomplete game state")

    const system = playerSystemPrompt()
    const promptText = playerPrompt(data.prompt.text)

    const answeredModels = new Set(data.answers.map((a) => a.model))
    const pendingModels = data.game.playerModels.filter(
      (m) => !answeredModels.has(m)
    )

    await Promise.all(
      pendingModels.map((model) =>
        runModelStage(
          ctx,
          model,
          system,
          promptText,
          (s) => s.trim().length > 0,
          {
            onSuccess: async (ctx, text) => {
              await ctx.runMutation(internal.games.saveAnswerResult, {
                gameId: args.gameId, model, text,
                promptText, rawResponse: text,
              })
            },
            onFailure: async (error) => {
              await ctx.runMutation(internal.games.saveAnswerFailure, {
                gameId: args.gameId, model, promptText,
                errorMessage: error instanceof Error ? error.message : String(error),
              })
            },
          },
        )
      ),
    )
  },
})

export const generateModelVotes = internalAction({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const data = await loadGameData(ctx, args.gameId, "voting")
    if (!data) return
    if (!data.prompt || data.answers.length < 2) {
      throw new Error("Incomplete voting state")
    }

    const existingVoterIds = new Set(data.votes.map((vote) => vote.voterId))
    const pendingVoters = data.game.voterModels.filter(
      (m) => !existingVoterIds.has(`model:${m}`)
    )

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
      pendingVoters.map((model) =>
        runModelStage(
          ctx,
          model,
          system,
          promptText,
          (s) => validNumbers.has(s.trim()),
          {
            onSuccess: async (ctx, raw) => {
              const index = Number.parseInt(raw.trim(), 10) - 1
              const chosen = labeledAnswers[index]
              await ctx.runMutation(internal.games.saveModelVote, {
                gameId: args.gameId,
                voterId: `model:${model}`,
                model,
                answerId: chosen.id,
                promptText,
                rawResponse: raw,
              })
            },
            onFailure: async (error) => {
              await ctx.runMutation(internal.games.saveModelVoteFailure, {
                gameId: args.gameId,
                voterId: `model:${model}`,
                model,
                promptText,
                errorMessage: error instanceof Error ? error.message : String(error),
              })
            },
          },
        )
      ),
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
