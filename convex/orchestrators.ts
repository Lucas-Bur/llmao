import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { chat } from "@tanstack/ai"
import {
  openRouterText,
  type OpenRouterModelOptionsByName,
} from "@tanstack/ai-openrouter"
import { cleanResponse, withRetry } from "./utils"
import {
  playerPrompt,
  playerSystemPrompt,
  votePrompt,
  voteSystemPrompt,
  writerPrompt,
  writerSystemPrompt,
} from "./prompts"

type ModelId = keyof OpenRouterModelOptionsByName // | (string & {})

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
      const result = await chat({
        adapter: openRouterText(model as ModelId),
        messages: [{ role: "user", content: prompt }],
        systemPrompts: [systemPrompt],
        stream: false,
      })

      return cleanResponse(result)
    },
    validate,
    3
  )
}

export const generatePrompt = internalAction({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.runQuery(internal.games.getGameInternal, {
      gameId: args.gameId,
    })

    if (!game) {
      throw new Error("Game not found")
    }
    if (game.game.status !== "created") {
      return
    }

    const system = writerSystemPrompt()
    const prompt = writerPrompt()

    try {
      const text = await invokeText(
        game.game.promptModel,
        system,
        prompt,
        (s) => s.trim().length >= 6
      )

      await ctx.runMutation(internal.games.savePromptResult, {
        gameId: args.gameId,
        model: game.game.promptModel,
        text,
        promptText: prompt,
        rawResponse: text,
      })
    } catch (error) {
      await ctx.runMutation(internal.games.savePromptFailure, {
        gameId: args.gameId,
        model: game.game.promptModel,
        promptText: prompt,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

export const generateAnswers = internalAction({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.games.getGameInternal, {
      gameId: args.gameId,
    })

    if (!data?.game || !data.prompt) {
      throw new Error("Incomplete game state")
    }
    if (data.game.status !== "responding") {
      return
    }

    const promptText = playerPrompt(data.prompt.text)
    const system = playerSystemPrompt()

    const jobs = [
      {
        side: "A" as const,
        model: data.game.answerModelA,
      },
      {
        side: "B" as const,
        model: data.game.answerModelB,
      },
    ]

    await Promise.all(
      jobs.map(async (job) => {
        try {
          const text = await invokeText(
            job.model,
            system,
            promptText,
            (s) => s.trim().length > 0
          )

          await ctx.runMutation(internal.games.saveAnswerResult, {
            gameId: args.gameId,
            side: job.side,
            model: job.model,
            text,
            promptText,
            rawResponse: text,
          })
        } catch (error) {
          await ctx.runMutation(internal.games.saveAnswerFailure, {
            gameId: args.gameId,
            side: job.side,
            model: job.model,
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
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.games.getGameInternal, {
      gameId: args.gameId,
    })

    if (!data?.game || !data.prompt || !data.answerA || !data.answerB) {
      throw new Error("Incomplete voting state")
    }
    if (data.game.status !== "voting") {
      return
    }

    const voterModels = [
      "openai/gpt-5-nano",
      "xiaomi/mimo-v2-flash",
      "google/gemini-2.5-flash-lite-preview-09-2025",
    ]

    const promptText = votePrompt(
      data.prompt.text,
      data.answerA.text,
      data.answerB.text
    )
    const system = voteSystemPrompt()

    await Promise.all(
      voterModels.map(async (model) => {
        const voterId = `model:${model}`

        try {
          const raw = await invokeText(
            model,
            system,
            promptText,
            (s) => s.trim() === "A" || s.trim() === "B"
          )

          const choice = raw.trim() as "A" | "B"

          await ctx.runMutation(internal.games.saveModelVote, {
            gameId: args.gameId,
            voterId,
            model,
            choice,
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

    await ctx.scheduler.runAfter(0, internal.orchestrators.tryFinalizeGame, {
      gameId: args.gameId,
    })
  },
})

export const tryFinalizeGame = internalAction({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.games.finalizeResolvedGame, {
      gameId: args.gameId,
    })
  },
})
