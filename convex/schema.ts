import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const gameStatus = v.union(
  v.literal("created"),
  v.literal("prompting"),
  v.literal("responding"),
  v.literal("voting"),
  v.literal("resolved"),
  v.literal("locked")
)

const advanceMode = v.union(
  v.literal("all_answered"),
  v.literal("timer"),
  v.literal("manual")
)

export default defineSchema({
  games: defineTable({
    status: gameStatus,
    hostId: v.optional(v.string()),
    promptModel: v.string(),
    playerModels: v.array(v.string()),
    voterModels: v.array(v.string()),
    language: v.optional(v.string()),
    advanceMode: v.optional(advanceMode),
    respondTimeLimit: v.optional(v.number()),
    voteTimeLimit: v.optional(v.number()),

    promptId: v.optional(v.id("prompts")),

    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  players: defineTable({
    gameId: v.id("games"),
    playerId: v.string(),
    displayName: v.string(),
    isHost: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_playerId", ["gameId", "playerId"]),

  prompts: defineTable({
    gameId: v.id("games"),
    model: v.string(),
    text: v.string(),
    locked: v.boolean(),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),

  answers: defineTable({
    gameId: v.id("games"),
    model: v.string(),
    text: v.string(),
    locked: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_model", ["gameId", "model"]),

  votes: defineTable({
    gameId: v.id("games"),
    voterKind: v.union(v.literal("user"), v.literal("model")),
    voterId: v.string(),
    answerId: v.id("answers"),
    locked: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_voterId", ["gameId", "voterId"]),

  ratings: defineTable({
    model: v.string(),
    elo: v.number(),
    wins: v.number(),
    losses: v.number(),
    draws: v.number(),
    gamesPlayed: v.number(),
    updatedAt: v.number(),
  }).index("by_model", ["model"]),

  llmEvents: defineTable({
    gameId: v.id("games"),
    stage: v.union(v.literal("prompt"), v.literal("answer"), v.literal("vote")),
    role: v.string(),
    model: v.string(),
    promptText: v.string(),
    responseText: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    locked: v.boolean(),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),
})
