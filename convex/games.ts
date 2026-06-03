import { v } from "convex/values"

import { internal } from "./_generated/api"

const advanceModeValidator = v.union(
  v.literal("all_answered"),
  v.literal("timer"),
  v.literal("manual")
)
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import { applyMultiPlayerElo } from "./ratings"
import { assertStatus, PAST_STATUSES } from "./lifecycle"

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
    hostId: v.string(),
    promptModel: v.string(),
    playerModels: v.array(v.string()),
    voterModels: v.array(v.string()),
    language: v.string(),
    advanceMode: advanceModeValidator,
    respondTimeLimit: v.optional(v.number()),
    voteTimeLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ts = now()
    return await ctx.db.insert("games", {
      status: "created",
      hostId: args.hostId,
      promptModel: args.promptModel,
      playerModels: args.playerModels,
      voterModels: args.voterModels,
      language: args.language,
      advanceMode: args.advanceMode,
      respondTimeLimit: args.respondTimeLimit,
      voteTimeLimit: args.voteTimeLimit,
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
    language: v.optional(v.string()),
    advanceMode: v.optional(v.union(v.literal("all_answered"), v.literal("timer"), v.literal("manual"))),
    respondTimeLimit: v.optional(v.number()),
    voteTimeLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ts = now()

    const update: Record<string, unknown> = {
      updatedAt: ts,
      ...(args.promptModel !== undefined && { promptModel: args.promptModel }),
      ...(args.playerModels !== undefined && {
        playerModels: args.playerModels,
      }),
      ...(args.voterModels !== undefined && { voterModels: args.voterModels }),
      ...(args.language !== undefined && { language: args.language }),
      ...(args.advanceMode !== undefined && { advanceMode: args.advanceMode }),
      ...(args.respondTimeLimit !== undefined && { respondTimeLimit: args.respondTimeLimit }),
      ...(args.voteTimeLimit !== undefined && { voteTimeLimit: args.voteTimeLimit }),
    }

    await ctx.db.patch("games", args.gameId, update)
  },
})

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    assertStatus(game, "created")

    if (game.playerModels.length === 0) {
      throw new Error("At least one player model required")
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


async function checkAndAdvanceFromResponding(
  ctx: MutationCtx,
  gameId: Id<"games">,
  game: Doc<"games">
) {
  if (game.advanceMode === "manual") return

  const answers = await ctx.db
    .query("answers")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect()

  const humanPlayers = await ctx.db
    .query("players")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect()

  const answeredModels = new Set(answers.map((a) => a.model))
  const allAIModelsAnswered = game.playerModels.every((m) =>
    answeredModels.has(m)
  )
  const allHumansAnswered = humanPlayers.every((p) =>
    answeredModels.has(`user:${p.playerId}`)
  )

  if (allAIModelsAnswered && allHumansAnswered && answers.length >= 2) {
    await advanceGameToVoting(ctx, gameId, game)
  }
}

async function advanceGameToVoting(
  ctx: MutationCtx,
  gameId: Id<"games">,
  game: Doc<"games">
) {
  const ts = now()
  await ctx.db.patch("games", gameId, {
    status: "voting",
    votingAt: ts,
    updatedAt: ts,
  })

  await ctx.scheduler.runAfter(0, internal.orchestrators.generateModelVotes, {
    gameId,
  })

  if (game.advanceMode === "timer" && game.voteTimeLimit) {
    await ctx.scheduler.runAfter(
      game.voteTimeLimit * 1000,
      internal.games.autoFinalizeGame,
      { gameId }
    )
  }
}

async function checkAndAdvanceFromVoting(
  ctx: MutationCtx,
  gameId: Id<"games">,
  game: Doc<"games">
) {
  if (game.advanceMode === "manual") return

  const votes = await ctx.db
    .query("votes")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect()

  const humanPlayers = await ctx.db
    .query("players")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect()

  const existingVoterIds = new Set(votes.map((v) => v.voterId))
  const allAIVoted = game.voterModels.every(
    (m) => existingVoterIds.has(`model:${m}`)
  )
  const allHumansVoted = humanPlayers.every((p) =>
    existingVoterIds.has(`user:${p.playerId}`)
  )

  if (allAIVoted && allHumansVoted) {
    await ctx.scheduler.runAfter(0, internal.games.autoFinalizeGame, {
      gameId,
    })
  }
}

export const submitUserAnswer = mutation({
  args: {
    gameId: v.id("games"),
    authorId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    assertStatus(game, "responding")

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

    await checkAndAdvanceFromResponding(ctx, args.gameId, game)

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
    assertStatus(game, "voting")

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

    await checkAndAdvanceFromVoting(ctx, args.gameId, game)

    return { ok: true }
  },
})

export const advanceToVoting = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    assertStatus(game, "responding")

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    if (answers.length < 2) {
      throw new Error("Need at least 2 answers before voting")
    }

    await advanceGameToVoting(ctx, args.gameId, game)

    return { ok: true }
  },
})

export const autoAdvanceToVoting = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "responding") return

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    if (answers.length < 2) return

    await advanceGameToVoting(ctx, args.gameId, game)
  },
})

export const autoFinalizeGame = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.status !== "voting") return

    await ctx.scheduler.runAfter(0, internal.games.finalizeResolvedGame, {
      gameId: args.gameId,
    })
  },
})

// ---------------------------------------------------------------------------
// Trigger mutations (schedule internal actions)
// ---------------------------------------------------------------------------


export const triggerGenerateAnswers = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    assertStatus(game, "responding")

    await ctx.scheduler.runAfter(0, internal.orchestrators.generateAnswers, {
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
    assertStatus(game, "voting")

    await ctx.scheduler.runAfter(0, internal.orchestrators.tryFinalizeGame, {
      gameId: args.gameId,
    })
    return { ok: true }
  },
})

export const resetGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")
    if (!PAST_STATUSES.includes(game.status)) {
      throw new Error("Can only reset a finished game")
    }

    const ts = now()
    await ctx.db.patch("games", args.gameId, {
      status: "created",
      promptId: undefined,
      respondedAt: undefined,
      votingAt: undefined,
      resolvedAt: undefined,
      lockedAt: undefined,
      updatedAt: ts,
    })

    // Delete prompts, answers, votes for this game
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()
    for (const p of prompts) await ctx.db.delete("prompts", p._id)

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()
    for (const a of answers) await ctx.db.delete("answers", a._id)

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()
    for (const v of votes) await ctx.db.delete("votes", v._id)

    const llmEvents = await ctx.db
      .query("llmEvents")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()
    for (const e of llmEvents) await ctx.db.delete("llmEvents", e._id)

    return args.gameId
  },
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) return

    const prompt = game.promptId
      ? await ctx.db.get("prompts", game.promptId)
      : undefined

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const llmEvents = await ctx.db
      .query("llmEvents")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    return { game, prompt, answers, votes, players, llmEvents }
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

export const listGamesByStatus = query({
  args: { statuses: v.array(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_createdAt")
      .order("desc")
      .filter((q) =>
        q.or(...args.statuses.map((s) => q.eq(q.field("status"), s)))
      )
      .take(50)
  },
})

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const ratings = await ctx.db.query("ratings").collect()
    return ratings.toSorted((a, b) => b.elo - a.elo)
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

    const ts = now()
    await ctx.db.patch("games", args.gameId, {
      status: "responding",
      promptId,
      respondedAt: ts,
      updatedAt: ts,
    })

    // Auto-schedule answer generation
    await ctx.scheduler.runAfter(0, internal.orchestrators.generateAnswers, {
      gameId: args.gameId,
    })

    // Schedule timer-based advance if configured
    if (game.advanceMode === "timer" && game.respondTimeLimit) {
      await ctx.scheduler.runAfter(
        game.respondTimeLimit * 1000,
        internal.games.autoAdvanceToVoting,
        { gameId: args.gameId }
      )
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

    await checkAndAdvanceFromResponding(ctx, args.gameId, game)
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
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")

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

    await checkAndAdvanceFromVoting(ctx, args.gameId, game)
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
    if (!game) return

    const prompt = game.promptId
      ? await ctx.db.get("prompts", game.promptId)
      : undefined

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    return { game, prompt, answers, votes, players }
  },
})
