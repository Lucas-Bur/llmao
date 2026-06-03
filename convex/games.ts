import { v } from "convex/values"

import { internal } from "./_generated/api"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import {
  handleAdvanceToVoting,
  handleAnswerFailure,
  handleAnswerResult,
  handleAutoAdvanceToVoting,
  handleAutoFinalize,
  handleFinalize,
  handlePromptFailure,
  handlePromptResult,
  handleStart,
  handleUserAnswer,
  handleUserVote,
  handleVoteFailure,
  handleVoteResult,
} from "./state_machine"
import { PAST_STATUSES } from "./lifecycle"

const advanceModeValidator = v.union(
  v.literal("all_answered"),
  v.literal("timer"),
  v.literal("manual"),
)

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
    advanceMode: v.optional(
      v.union(v.literal("all_answered"), v.literal("timer"), v.literal("manual")),
    ),
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
      ...(args.respondTimeLimit !== undefined && {
        respondTimeLimit: args.respondTimeLimit,
      }),
      ...(args.voteTimeLimit !== undefined && {
        voteTimeLimit: args.voteTimeLimit,
      }),
    }

    await ctx.db.patch("games", args.gameId, update)
  },
})

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await handleStart(ctx, args.gameId)
    return { ok: true }
  },
})

export const submitUserAnswer = mutation({
  args: {
    gameId: v.id("games"),
    authorId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await handleUserAnswer(ctx, args.gameId, args.authorId, args.text)
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
    await handleUserVote(ctx, args.gameId, args.voterId, args.answerId)
    return { ok: true }
  },
})

export const advanceToVoting = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await handleAdvanceToVoting(ctx, args.gameId)
    return { ok: true }
  },
})

export const triggerGenerateAnswers = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId)
    if (!game) throw new Error("Game not found")

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

    const [prompts, answers, votes, llmEvents] = await Promise.all([
      ctx.db
        .query("prompts")
        .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("answers")
        .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("votes")
        .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("llmEvents")
        .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
        .collect(),
    ])

    for (const p of prompts) await ctx.db.delete("prompts", p._id)
    for (const a of answers) await ctx.db.delete("answers", a._id)
    for (const v of votes) await ctx.db.delete("votes", v._id)
    for (const e of llmEvents) await ctx.db.delete("llmEvents", e._id)

    return args.gameId
  },
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

type GameInclude = {
  prompt?: boolean
  answers?: boolean
  votes?: boolean
  players?: boolean
  llmEvents?: boolean
}

type GameDetails = {
  game: Doc<"games">
  prompt?: Doc<"prompts"> | null
  answers?: Doc<"answers">[]
  votes?: Doc<"votes">[]
  players?: Doc<"players">[]
  llmEvents?: Doc<"llmEvents">[]
}

async function fetchGameDetails(
  ctx: QueryCtx,
  gameId: Id<"games">,
  include: GameInclude,
): Promise<GameDetails | null> {
  const game = await ctx.db.get("games", gameId)
  if (!game) return null

  const result: GameDetails = { game }

  if (include.prompt && game.promptId) {
    result.prompt = await ctx.db.get("prompts", game.promptId)
  }
  if (include.answers) {
    result.answers = await ctx.db
      .query("answers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect()
  }
  if (include.votes) {
    result.votes = await ctx.db
      .query("votes")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect()
  }
  if (include.players) {
    result.players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect()
  }
  if (include.llmEvents) {
    result.llmEvents = await ctx.db
      .query("llmEvents")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect()
  }

  return result
}

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await fetchGameDetails(ctx, args.gameId, {
      prompt: true,
      answers: true,
      votes: true,
      players: true,
      llmEvents: true,
    })
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
        q.or(...args.statuses.map((s) => q.eq(q.field("status"), s))),
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
    await handlePromptResult(ctx, args)
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
    await handlePromptFailure(ctx, args)
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
    await handleAnswerResult(ctx, args)
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
    await handleAnswerFailure(ctx, args)
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
    await handleVoteResult(ctx, args)
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
    await handleVoteFailure(
      ctx,
      args.gameId,
      args.model,
      args.promptText,
      args.errorMessage,
    )
  },
})

export const finalizeResolvedGame = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await handleFinalize(ctx, args.gameId)
  },
})

// ---------------------------------------------------------------------------
// Timer-triggered internal mutations
// ---------------------------------------------------------------------------

export const autoAdvanceToVoting = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await handleAutoAdvanceToVoting(ctx, args.gameId)
  },
})

export const autoFinalizeGame = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await handleAutoFinalize(ctx, args.gameId)
  },
})

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

export const getGameWithDetails = internalQuery({
  args: {
    gameId: v.id("games"),
    include: v.optional(
      v.object({
        prompt: v.optional(v.boolean()),
        answers: v.optional(v.boolean()),
        votes: v.optional(v.boolean()),
        players: v.optional(v.boolean()),
        llmEvents: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return await fetchGameDetails(ctx, args.gameId, args.include ?? {})
  },
})
