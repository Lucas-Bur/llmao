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

const side = v.union(v.literal("A"), v.literal("B"))
const winner = v.union(v.literal("A"), v.literal("B"), v.literal("draw"))

export default defineSchema({
  games: defineTable({
    status: gameStatus,

    promptModel: v.string(),
    answerModelA: v.string(),
    answerModelB: v.string(),

    promptId: v.optional(v.id("prompts")),
    answerIdA: v.optional(v.id("answers")),
    answerIdB: v.optional(v.id("answers")),

    winner: v.optional(winner),
    scoreA: v.optional(v.number()),
    scoreB: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  prompts: defineTable({
    gameId: v.id("games"),
    model: v.string(),
    text: v.string(),
    locked: v.boolean(),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),

  answers: defineTable({
    gameId: v.id("games"),
    side,
    model: v.string(),
    text: v.string(),
    locked: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_side", ["gameId", "side"]),

  votes: defineTable({
    gameId: v.id("games"),
    voterKind: v.union(v.literal("user"), v.literal("model")),
    voterId: v.string(),
    choice: side,
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
