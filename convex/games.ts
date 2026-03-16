import { v } from "convex/values"

import { internal } from "./_generated/api"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { applyMultiPlayerElo } from "./ratings"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return Date.now()
}

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const createGame = mutation({
  args: {
    promptModel: v.string(),
    playerModels: v.array(v.string()),
    voterModels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const ts = now()
    return await ctx.db.insert("games", {
      status: "created",
      promptModel: args.promptModel,
      playerModels: args.playerModels,
      voterModels: args.voterModels,
      createdAt: ts,
      updatedAt: ts,
    })
  },
})

export const updateGame = mutation({
  args: {
    gameId: v.id("games"),
    promptModel: v.optional(v.string()),
    playerModels: v.optional(v.array(v.string())),
    voterModels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const ts = now()

    const update = {
      updatedAt: ts,
      ...(args.promptModel !== undefined && { promptModel: args.promptModel }),
      ...(args.playerModels !== undefined && {
        playerModels: args.playerModels,
      }),
      ...(args.voterModels !== undefined && { voterModels: args.voterModels }),
    }

    await ctx.db.patch("games", args.gameId, update)
  },
})

export const submitUserAnswer = mutation({
  args: {
    gameId: v.id("games"),
    authorId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "responding") {
      throw new Error("Game is not in responding state")
    }

    const model = `${args.authorId}`

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_gameId_model", (q) =>
        q.eq("gameId", args.gameId).eq("model", model)
      )
      .unique()

    if (existing) throw new Error("Player already answered")

    await ctx.db.insert("answers", {
      gameId: args.gameId,
      model,
      text: args.text.trim(),
      locked: true,
      createdAt: now(),
    })

    return { ok: true }
  },
})

export const submitUserVote = mutation({
  args: {
    gameId: v.id("games"),
    voterId: v.string(),
    answerId: v.id("answers"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "voting") {
      throw new Error("Game is not in voting state")
    }

    const answer = await ctx.db.get("answers", args.answerId)
    if (answer?.gameId !== args.gameId) {
      throw new Error("Answer does not belong to this game")
    }

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_gameId_voterId", (q) =>
        q.eq("gameId", args.gameId).eq("voterId", args.voterId)
      )
      .unique()

    if (existing) throw new Error("Voter already voted")

    await ctx.db.insert("votes", {
      gameId: args.gameId,
      voterKind: "user",
      voterId: args.voterId,
      answerId: args.answerId,
      locked: true,
      createdAt: now(),
    })

    return { ok: true }
  },
})

export const advanceToVoting = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "responding") {
      throw new Error("Game is not in responding state")
    }

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    if (answers.length < 2) {
      throw new Error("Need at least 2 answers before voting")
    }

    await ctx.db.patch("games", args.gameId, {
      status: "voting",
      updatedAt: now(),
    })

    return { ok: true }
  },
})

// ---------------------------------------------------------------------------
// Trigger mutations (schedule internal actions)
// ---------------------------------------------------------------------------

export const triggerGeneratePrompt = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "created") {
      throw new Error("Game is not in created state")
    }

    await ctx.db.patch("games", args.gameId, {
      status: "prompting",
      updatedAt: now(),
    })

    await ctx.scheduler.runAfter(0, internal.orchestrators.generatePrompt, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const triggerGenerateAnswers = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "responding") {
      throw new Error("Game is not in responding state")
    }

    await ctx.scheduler.runAfter(0, internal.orchestrators.generateAnswers, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const triggerGenerateModelVotes = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "voting") {
      throw new Error("Game is not in voting state")
    }

    await ctx.scheduler.runAfter(0, internal.orchestrators.generateModelVotes, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const triggerFinalizeGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "voting") {
      throw new Error("Game is not in voting state")
    }

    await ctx.scheduler.runAfter(0, internal.orchestrators.tryFinalizeGame, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) return null

    const prompt = game.promptId
      ? await ctx.db.get("prompts", game.promptId)
      : null

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    return { game, prompt, answers, votes }
  },
})

export const listRecentGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("games")
      .withIndex("by_createdAt")
      .order("desc")
      .take(50)
  },
})

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const ratings = await ctx.db.query("ratings").collect()
    return ratings.sort((a, b) => b.elo - a.elo)
  },
})

// ---------------------------------------------------------------------------
// Internal mutations (called by orchestrators)
// ---------------------------------------------------------------------------

export const savePromptResult = internalMutation({
  args: {
    gameId: v.id("games"),
    model: v.string(),
    text: v.string(),
    promptText: v.string(),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "prompting") return

    const promptId = await ctx.db.insert("prompts", {
      gameId: args.gameId,
      model: args.model,
      text: args.text,
      locked: true,
      createdAt: now(),
    })

    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "prompt",
      role: "writer",
      model: args.model,
      promptText: args.promptText,
      responseText: args.rawResponse,
      success: true,
      locked: true,
      createdAt: now(),
    })

    await ctx.db.patch("games", args.gameId, {
      status: "responding",
      promptId,
      updatedAt: now(),
    })
  },
})

export const savePromptFailure = internalMutation({
  args: {
    gameId: v.id("games"),
    model: v.string(),
    promptText: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "prompt",
      role: "writer",
      model: args.model,
      promptText: args.promptText,
      responseText: "",
      success: false,
      errorMessage: args.errorMessage,
      locked: true,
      createdAt: now(),
    })

    // Reset to created so user can retry
    const game = await ctx.db.get("games", args.gameId)
    if (game?.status === "prompting") {
      await ctx.db.patch("games", args.gameId, {
        status: "created",
        updatedAt: now(),
      })
    }
  },
})

export const saveAnswerResult = internalMutation({
  args: {
    gameId: v.id("games"),
    model: v.string(),
    text: v.string(),
    promptText: v.string(),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "responding") return

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_gameId_model", (q) =>
        q.eq("gameId", args.gameId).eq("model", args.model)
      )
      .unique()

    if (existing) return

    await ctx.db.insert("answers", {
      gameId: args.gameId,
      model: args.model,
      text: args.text,
      locked: true,
      createdAt: now(),
    })

    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "answer",
      role: "player",
      model: args.model,
      promptText: args.promptText,
      responseText: args.rawResponse,
      success: true,
      locked: true,
      createdAt: now(),
    })

    await ctx.db.patch("games", args.gameId, { updatedAt: now() })
  },
})

export const saveAnswerFailure = internalMutation({
  args: {
    gameId: v.id("games"),
    model: v.string(),
    promptText: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "answer",
      role: "player",
      model: args.model,
      promptText: args.promptText,
      responseText: "",
      success: false,
      errorMessage: args.errorMessage,
      locked: true,
      createdAt: now(),
    })
  },
})

export const saveModelVote = internalMutation({
  args: {
    gameId: v.id("games"),
    voterId: v.string(),
    model: v.string(),
    answerId: v.id("answers"),
    promptText: v.string(),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_gameId_voterId", (q) =>
        q.eq("gameId", args.gameId).eq("voterId", args.voterId)
      )
      .unique()

    if (existing) return

    await ctx.db.insert("votes", {
      gameId: args.gameId,
      voterKind: "model",
      voterId: args.voterId,
      answerId: args.answerId,
      locked: true,
      createdAt: now(),
    })

    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "vote",
      role: "judge",
      model: args.model,
      promptText: args.promptText,
      responseText: args.rawResponse,
      success: true,
      locked: true,
      createdAt: now(),
    })
  },
})

export const saveModelVoteFailure = internalMutation({
  args: {
    gameId: v.id("games"),
    voterId: v.string(),
    model: v.string(),
    promptText: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "vote",
      role: "judge",
      model: args.model,
      promptText: args.promptText,
      responseText: "",
      success: false,
      errorMessage: args.errorMessage,
      locked: true,
      createdAt: now(),
    })
  },
})

export const finalizeResolvedGame = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "voting") return

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    if (votes.length === 0) return

    // Count votes per answer
    const voteCounts = new Map<string, number>()
    for (const a of answers) {
      voteCounts.set(a._id.toString(), 0)
    }
    for (const vote of votes) {
      const key = vote.answerId.toString()
      voteCounts.set(key, (voteCounts.get(key) ?? 0) + 1)
    }

    await ctx.db.patch("games", args.gameId, {
      status: "resolved",
      resolvedAt: now(),
      updatedAt: now(),
    })

    // Apply multi-player Elo
    const players = answers.map((a) => ({
      model: a.model,
      votes: voteCounts.get(a._id.toString()) ?? 0,
    }))

    await applyMultiPlayerElo(ctx, players)

    await ctx.db.patch("games", args.gameId, {
      status: "locked",
      lockedAt: now(),
      updatedAt: now(),
    })
  },
})

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

export const getGameInternal = internalQuery({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) return null

    const prompt = game.promptId
      ? await ctx.db.get("prompts", game.promptId)
      : null

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    return { game, prompt, answers, votes }
  },
})
