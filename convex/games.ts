import { v } from "convex/values"

import { internal } from "./_generated/api"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"

import { applyEloResult } from "./ratings"

export const createGame = mutation({
  args: {
    promptModel: v.string(),
    answerModelA: v.string(),
    answerModelB: v.string(),
    mode: v.union(v.literal("auto"), v.literal("manual")),
    voterModels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const gameId = await ctx.db.insert("games", {
      status: "created",
      mode: args.mode,
      voterModels: args.voterModels,
      promptModel: args.promptModel,
      answerModelA: args.answerModelA,
      answerModelB: args.answerModelB,
      createdAt: now,
      updatedAt: now,
    })

    if (args.mode === "auto") {
      await ctx.scheduler.runAfter(0, internal.orchestrators.generatePrompt, {
        gameId,
      })
    }

    return gameId
  },
})

export const submitUserAnswer = mutation({
  args: {
    gameId: v.id("games"),
    authorId: v.string(),
    side: v.union(v.literal("A"), v.literal("B")),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "responding") {
      throw new Error("Game is not in responding state")
    }

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_gameId_side", (q) =>
        q.eq("gameId", args.gameId).eq("side", args.side)
      )
      .unique()

    if (existing) {
      throw new Error("Side already filled")
    }

    const answerId = await ctx.db.insert("answers", {
      gameId: args.gameId,
      side: args.side,
      model: `user:${args.authorId}`,
      text: args.text.trim(),
      locked: true,
      createdAt: Date.now(),
    })

    const answerA = args.side === "A" ? answerId : game.answerIdA
    const answerB = args.side === "B" ? answerId : game.answerIdB

    await ctx.db.patch("games", args.gameId, {
      answerIdA: answerA,
      answerIdB: answerB,
      status: answerA && answerB ? "voting" : game.status,
      updatedAt: Date.now(),
    })

    if (game.mode === "auto" && answerA && answerB) {
      await ctx.scheduler.runAfter(
        0,
        internal.orchestrators.generateModelVotes,
        { gameId: args.gameId }
      )
    }

    return { ok: true }
  },
})

export const submitUserVote = mutation({
  args: {
    gameId: v.id("games"),
    voterId: v.string(),
    choice: v.union(v.literal("A"), v.literal("B")),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) {
      throw new Error("Game not found")
    }
    if (game.status !== "voting") {
      throw new Error("Game is not in voting state")
    }

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_gameId_voterId", (q) =>
        q.eq("gameId", args.gameId).eq("voterId", args.voterId)
      )
      .unique()

    if (existing) {
      throw new Error("Voter already voted")
    }

    await ctx.db.insert("votes", {
      gameId: args.gameId,
      voterKind: "user",
      voterId: args.voterId,
      choice: args.choice,
      locked: true,
      createdAt: Date.now(),
    })

    if (game.mode === "auto") {
      await ctx.scheduler.runAfter(0, internal.orchestrators.tryFinalizeGame, {
        gameId: args.gameId,
      })
    }

    return { ok: true }
  },
})

export const getGame = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) {
      return null
    }

    const prompt = game.promptId
      ? await ctx.db.get("prompts", game.promptId)
      : null
    const answerA = game.answerIdA
      ? await ctx.db.get("answers", game.answerIdA)
      : null
    const answerB = game.answerIdB
      ? await ctx.db.get("answers", game.answerIdB)
      : null

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    return {
      game,
      prompt,
      answerA,
      answerB,
      votes,
    }
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

export const triggerGeneratePrompt = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.orchestrators.generatePrompt, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const triggerGenerateAnswers = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.orchestrators.generateAnswers, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const triggerGenerateModelVotes = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.orchestrators.generateModelVotes, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const triggerFinalizeGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.orchestrators.tryFinalizeGame, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

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
    if (!game) {
      throw new Error("Game not found")
    }
    if (game.status !== "created" && game.status !== "prompting") {
      return
    }

    const promptId = await ctx.db.insert("prompts", {
      gameId: args.gameId,
      model: args.model,
      text: args.text,
      locked: true,
      createdAt: Date.now(),
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
      createdAt: Date.now(),
    })

    await ctx.db.patch("games", args.gameId, {
      status: "responding",
      promptId,
      updatedAt: Date.now(),
    })

    if (game.mode === "auto") {
      await ctx.scheduler.runAfter(0, internal.orchestrators.generateAnswers, {
        gameId: args.gameId,
      })
    }
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
      createdAt: Date.now(),
    })
  },
})

export const saveAnswerResult = internalMutation({
  args: {
    gameId: v.id("games"),
    side: v.union(v.literal("A"), v.literal("B")),
    model: v.string(),
    text: v.string(),
    promptText: v.string(),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) {
      throw new Error("Game not found")
    }
    if (game.status !== "responding") {
      return
    }

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_gameId_side", (q) =>
        q.eq("gameId", args.gameId).eq("side", args.side)
      )
      .unique()

    if (existing) {
      return
    }

    const answerId = await ctx.db.insert("answers", {
      gameId: args.gameId,
      side: args.side,
      model: args.model,
      text: args.text,
      locked: true,
      createdAt: Date.now(),
    })

    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "answer",
      role: args.side === "A" ? "playerA" : "playerB",
      model: args.model,
      promptText: args.promptText,
      responseText: args.rawResponse,
      success: true,
      locked: true,
      createdAt: Date.now(),
    })

    const answerA = args.side === "A" ? answerId : game.answerIdA
    const answerB = args.side === "B" ? answerId : game.answerIdB

    const nextStatus = answerA && answerB ? "voting" : game.status

    await ctx.db.patch("games", args.gameId, {
      answerIdA: answerA,
      answerIdB: answerB,
      status: nextStatus,
      updatedAt: Date.now(),
    })

    if (game.mode === "auto" && answerA && answerB) {
      await ctx.scheduler.runAfter(
        0,
        internal.orchestrators.generateModelVotes,
        { gameId: args.gameId }
      )
    }
  },
})

export const saveAnswerFailure = internalMutation({
  args: {
    gameId: v.id("games"),
    side: v.union(v.literal("A"), v.literal("B")),
    model: v.string(),
    promptText: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmEvents", {
      gameId: args.gameId,
      stage: "answer",
      role: args.side === "A" ? "playerA" : "playerB",
      model: args.model,
      promptText: args.promptText,
      responseText: "",
      success: false,
      errorMessage: args.errorMessage,
      locked: true,
      createdAt: Date.now(),
    })
  },
})

export const saveModelVote = internalMutation({
  args: {
    gameId: v.id("games"),
    voterId: v.string(),
    model: v.string(),
    choice: v.union(v.literal("A"), v.literal("B")),
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

    if (existing) {
      return
    }

    await ctx.db.insert("votes", {
      gameId: args.gameId,
      voterKind: "model",
      voterId: args.voterId,
      choice: args.choice,
      locked: true,
      createdAt: Date.now(),
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
      createdAt: Date.now(),
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
      createdAt: Date.now(),
    })
  },
})

export const finalizeResolvedGame = internalMutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) {
      throw new Error("Game not found")
    }
    if (game.status !== "voting" && game.status !== "resolved") {
      return
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    if (votes.length === 0) {
      return
    }

    const scoreA = votes.filter((vote) => vote.choice === "A").length
    const scoreB = votes.filter((vote) => vote.choice === "B").length

    const winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "draw"

    await ctx.db.patch("games", args.gameId, {
      status: "resolved",
      winner,
      scoreA,
      scoreB,
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    })

    await applyEloResult(ctx, game.answerModelA, game.answerModelB, winner)

    await ctx.db.patch("games", args.gameId, {
      status: "locked",
      lockedAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const getGameInternal = internalQuery({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) {
      return null
    }

    const prompt = game.promptId
      ? await ctx.db.get("prompts", game.promptId)
      : null
    const answerA = game.answerIdA
      ? await ctx.db.get("answers", game.answerIdA)
      : null
    const answerB = game.answerIdB
      ? await ctx.db.get("answers", game.answerIdB)
      : null

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    return {
      game,
      prompt,
      answerA,
      answerB,
      votes,
    }
  },
})
