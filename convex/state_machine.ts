import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import {
  assertStatus,
  TRANSITION_TABLE,
  type TransitionName,
} from "./lifecycle"
import { applyMultiPlayerElo } from "./ratings"
import { logLLMEvent } from "./llm_events"

function now() {
  return Date.now()
}

// ---------------------------------------------------------------------------
// Shared preamble — kills 5+ duplicate "get game → check status" blocks
// ---------------------------------------------------------------------------

export async function loadGame(
  ctx: MutationCtx,
  gameId: Id<"games">,
): Promise<Doc<"games">> {
  const game = await ctx.db.get("games", gameId)
  if (!game) throw new Error("Game not found")
  return game
}

async function loadGameSilent(
  ctx: MutationCtx,
  gameId: Id<"games">,
  expectedStatus: string,
): Promise<Doc<"games"> | null> {
  const game = await ctx.db.get("games", gameId)
  if (!game) return null
  if (game.status !== expectedStatus) return null
  return game
}

// ---------------------------------------------------------------------------
// Core transition
// ---------------------------------------------------------------------------

type ScheduleOptions = {
  onEnter?: (
    ctx: MutationCtx,
    gameId: Id<"games">,
    game: Doc<"games">,
  ) => Promise<void>
  skipIfWrongStatus?: boolean
}

async function scheduleTransition(
  ctx: MutationCtx,
  gameId: Id<"games">,
  game: Doc<"games">,
  transition: TransitionName,
  options?: ScheduleOptions,
): Promise<boolean> {
  const def = TRANSITION_TABLE[transition]

  if (game.status !== def.from) {
    if (options?.skipIfWrongStatus) return false
    assertStatus(
      game,
      def.from,
      `Cannot transition "${transition}": ${def.from} → ${def.to}`,
    )
  }

  const ts = now()
  const patchFields: Record<string, unknown> = {
    status: def.to,
    updatedAt: ts,
  }
  if (def.timestampField) {
    patchFields[def.timestampField] = ts
  }

  await ctx.db.patch("games", gameId, patchFields)

  if (options?.onEnter) {
    await options.onEnter(ctx, gameId, game)
  }

  return true
}

// ---------------------------------------------------------------------------
// Helpers for the advance check
// ---------------------------------------------------------------------------

async function fetchByGameId(
  ctx: MutationCtx,
  gameId: Id<"games">,
  table: "answers",
): Promise<Doc<"answers">[]>
async function fetchByGameId(
  ctx: MutationCtx,
  gameId: Id<"games">,
  table: "votes",
): Promise<Doc<"votes">[]>
async function fetchByGameId(
  ctx: MutationCtx,
  gameId: Id<"games">,
  table: "players",
): Promise<Doc<"players">[]>
async function fetchByGameId(
  ctx: MutationCtx,
  gameId: Id<"games">,
  table: string,
): Promise<Doc<"answers" | "votes" | "players">[]> {
  return await ctx.db
    .query(table as "answers" | "votes" | "players")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect()
}

// ---------------------------------------------------------------------------
// Advance check — consolidated from checkAndAdvanceFromResponding + Voting
// ---------------------------------------------------------------------------

async function advanceToVoting(
  ctx: MutationCtx,
  gameId: Id<"games">,
  game: Doc<"games">,
) {
  await scheduleTransition(ctx, gameId, game, "advanceToVoting", {
    skipIfWrongStatus: true,
    onEnter: async (ctx, gameId) => {
      await ctx.scheduler.runAfter(
        0,
        internal.orchestrators.generateModelVotes,
        { gameId },
      )
      if (game.advanceMode === "timer" && game.voteTimeLimit) {
        await ctx.scheduler.runAfter(
          game.voteTimeLimit * 1000,
          internal.games.autoFinalizeGame,
          { gameId },
        )
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Public handler interface (the deep module's seam)
// ---------------------------------------------------------------------------

export async function handleStart(ctx: MutationCtx, gameId: Id<"games">) {
  const game = await loadGame(ctx, gameId)
  assertStatus(game, "created")

  await scheduleTransition(ctx, gameId, game, "start", {
    onEnter: async (ctx, gameId) => {
      await ctx.scheduler.runAfter(
        0,
        internal.orchestrators.generatePrompt,
        { gameId },
      )
    },
  })
}

export type PromptResult = {
  gameId: Id<"games">
  model: string
  text: string
  promptText: string
  rawResponse: string
}

export async function handlePromptResult(
  ctx: MutationCtx,
  args: PromptResult,
) {
  const game = await loadGameSilent(ctx, args.gameId, "prompting")
  if (!game) return

  const promptId = await ctx.db.insert("prompts", {
    gameId: args.gameId,
    model: args.model,
    text: args.text,
    locked: true,
    createdAt: now(),
  })

  await logLLMEvent(ctx, {
    gameId: args.gameId,
    stage: "prompt",
    role: "writer",
    model: args.model,
    promptText: args.promptText,
    responseText: args.rawResponse,
  })

  await scheduleTransition(ctx, args.gameId, game, "promptComplete", {
    skipIfWrongStatus: true,
    onEnter: async (ctx, gameId) => {
      await ctx.db.patch("games", gameId, { promptId })

      await ctx.scheduler.runAfter(
        0,
        internal.orchestrators.generateAnswers,
        { gameId },
      )

      if (game.advanceMode === "timer" && game.respondTimeLimit) {
        await ctx.scheduler.runAfter(
          game.respondTimeLimit * 1000,
          internal.games.autoAdvanceToVoting,
          { gameId },
        )
      }
    },
  })
}

export type PromptFailure = {
  gameId: Id<"games">
  model: string
  promptText: string
  errorMessage: string
}

export async function handlePromptFailure(
  ctx: MutationCtx,
  args: PromptFailure,
) {
  await logLLMEvent(ctx, {
    gameId: args.gameId,
    stage: "prompt",
    role: "writer",
    model: args.model,
    promptText: args.promptText,
    errorMessage: args.errorMessage,
  })

  const game = await ctx.db.get("games", args.gameId)
  if (game) {
    await scheduleTransition(ctx, args.gameId, game, "promptFailed", {
      skipIfWrongStatus: true,
    })
  }
}

export type AnswerResult = {
  gameId: Id<"games">
  model: string
  text: string
  promptText: string
  rawResponse: string
}

export async function handleAnswerResult(
  ctx: MutationCtx,
  args: AnswerResult,
) {
  const game = await loadGameSilent(ctx, args.gameId, "responding")
  if (!game) return

  const existing = await ctx.db
    .query("answers")
    .withIndex("by_gameId_model", (q) =>
      q.eq("gameId", args.gameId).eq("model", args.model),
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

  await logLLMEvent(ctx, {
    gameId: args.gameId,
    stage: "answer",
    role: "player",
    model: args.model,
    promptText: args.promptText,
    responseText: args.rawResponse,
  })

  await ctx.db.patch("games", args.gameId, { updatedAt: now() })
  await checkAdvance(ctx, args.gameId)
}

export type AnswerFailure = {
  gameId: Id<"games">
  model: string
  promptText: string
  errorMessage: string
}

export async function handleAnswerFailure(
  ctx: MutationCtx,
  args: AnswerFailure,
) {
  await logLLMEvent(ctx, {
    gameId: args.gameId,
    stage: "answer",
    role: "player",
    model: args.model,
    promptText: args.promptText,
    errorMessage: args.errorMessage,
  })

  await checkAdvance(ctx, args.gameId)
}

export type VoteResult = {
  gameId: Id<"games">
  voterId: string
  model: string
  answerId: Id<"answers">
  promptText: string
  rawResponse: string
}

export async function handleVoteResult(ctx: MutationCtx, args: VoteResult) {
  const game = await loadGame(ctx, args.gameId)
  assertStatus(game, "voting")

  const existing = await ctx.db
    .query("votes")
    .withIndex("by_gameId_voterId", (q) =>
      q.eq("gameId", args.gameId).eq("voterId", args.voterId),
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

  await logLLMEvent(ctx, {
    gameId: args.gameId,
    stage: "vote",
    role: "judge",
    model: args.model,
    promptText: args.promptText,
    responseText: args.rawResponse,
  })

  await checkAdvance(ctx, args.gameId)
}

export async function handleVoteFailure(
  ctx: MutationCtx,
  gameId: Id<"games">,
  model: string,
  promptText: string,
  errorMessage: string,
) {
  await logLLMEvent(ctx, {
    gameId,
    stage: "vote",
    role: "judge",
    model,
    promptText,
    errorMessage,
  })

  await checkAdvance(ctx, gameId)
}

export async function handleUserAnswer(
  ctx: MutationCtx,
  gameId: Id<"games">,
  authorId: string,
  text: string,
) {
  const game = await loadGame(ctx, gameId)
  assertStatus(game, "responding")

  const model = `${authorId}`

  const existing = await ctx.db
    .query("answers")
    .withIndex("by_gameId_model", (q) =>
      q.eq("gameId", gameId).eq("model", model),
    )
    .unique()

  if (existing) throw new Error("Player already answered")

  await ctx.db.insert("answers", {
    gameId,
    model,
    text: text.trim(),
    locked: true,
    createdAt: now(),
  })

  await checkAdvance(ctx, gameId)
}

export async function handleUserVote(
  ctx: MutationCtx,
  gameId: Id<"games">,
  voterId: string,
  answerId: Id<"answers">,
) {
  const game = await loadGame(ctx, gameId)
  assertStatus(game, "voting")

  const answer = await ctx.db.get("answers", answerId)
  if (answer?.gameId !== gameId) {
    throw new Error("Answer does not belong to this game")
  }

  const existing = await ctx.db
    .query("votes")
    .withIndex("by_gameId_voterId", (q) =>
      q.eq("gameId", gameId).eq("voterId", voterId),
    )
    .unique()

  if (existing) throw new Error("Voter already voted")

  await ctx.db.insert("votes", {
    gameId,
    voterKind: "user",
    voterId,
    answerId,
    locked: true,
    createdAt: now(),
  })

  await checkAdvance(ctx, gameId)
}

export async function handleAdvanceToVoting(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await loadGame(ctx, gameId)
  assertStatus(game, "responding")

  const answers = await fetchByGameId(ctx, gameId, "answers")

  if (answers.length < 2) {
    throw new Error("Need at least 2 answers before voting")
  }

  await advanceToVoting(ctx, gameId, game)
}

export async function handleAutoAdvanceToVoting(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get("games", gameId)
  if (!game) return
  if (game.status !== "responding") return

  const answers = await fetchByGameId(ctx, gameId, "answers")

  if (answers.length < 2) return

  await advanceToVoting(ctx, gameId, game)
}

export async function handleAutoFinalize(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get("games", gameId)
  if (!game) return
  if (game.status !== "voting") return

  await ctx.scheduler.runAfter(0, internal.games.finalizeResolvedGame, {
    gameId,
  })
}

export async function handleFinalize(ctx: MutationCtx, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId)
  if (!game) return
  if (game.status !== "voting") return

  const [answers, votes] = await Promise.all([
    fetchByGameId(ctx, gameId, "answers"),
    fetchByGameId(ctx, gameId, "votes"),
  ])

  if (votes.length === 0) return

  const voteCounts = new Map<string, number>()
  for (const a of answers) {
    voteCounts.set(a._id.toString(), 0)
  }
  for (const vote of votes) {
    const key = vote.answerId.toString()
    voteCounts.set(key, (voteCounts.get(key) ?? 0) + 1)
  }

  const done = await scheduleTransition(ctx, gameId, game, "finalizeGame", {
    skipIfWrongStatus: true,
  })
  if (!done) return

  const gamePlayers = await fetchByGameId(ctx, gameId, "players")
  const playerMap = new Map(gamePlayers.map((p) => [p.playerId, p.displayName]))

  const players = answers.map((a) => ({
    model: a.model,
    votes: voteCounts.get(a._id.toString()) ?? 0,
    displayName: a.model.startsWith("user:")
      ? (playerMap.get(a.model.slice("user:".length)) ?? undefined)
      : undefined,
  }))

  await applyMultiPlayerElo(ctx, players)

  const gameAfterElo = await ctx.db.get("games", gameId)
  if (gameAfterElo) {
    await scheduleTransition(ctx, gameId, gameAfterElo, "lockGame", {
      skipIfWrongStatus: true,
    })
  }
}

// ---------------------------------------------------------------------------
// Advance check (exported for human mutations and internal use)
// ---------------------------------------------------------------------------

async function checkAdvance(ctx: MutationCtx, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId)
  if (!game || game.advanceMode === "manual") return

  if (game.status === "responding") {
    const [answers, humanPlayers, llmEvents] = await Promise.all([
      fetchByGameId(ctx, gameId, "answers"),
      fetchByGameId(ctx, gameId, "players"),
      ctx.db
        .query("llmEvents")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .collect(),
    ])

    const answeredModels = new Set(answers.map((a) => a.model))
    const failedModels = new Set(
      llmEvents
        .filter((e) => e.stage === "answer" && !e.success)
        .map((e) => e.model),
    )
    const allAIAnswered = game.playerModels.every(
      (m) => answeredModels.has(m) || failedModels.has(m),
    )
    const allHumansAnswered = humanPlayers.every((p) =>
      answeredModels.has(`user:${p.playerId}`),
    )

    if (allAIAnswered && allHumansAnswered && answers.length >= 2) {
      await advanceToVoting(ctx, gameId, game)
    }
  } else if (game.status === "voting") {
    const [votes, humanPlayers, llmEvents] = await Promise.all([
      fetchByGameId(ctx, gameId, "votes"),
      fetchByGameId(ctx, gameId, "players"),
      ctx.db
        .query("llmEvents")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .collect(),
    ])

    const existingVoterIds = new Set(votes.map((v) => v.voterId))
    const failedVoterIds = new Set(
      llmEvents
        .filter((e) => e.stage === "vote" && !e.success)
        .map((e) => `model:${e.model}`),
    )
    const allAIVoted = game.voterModels.every(
      (m) => existingVoterIds.has(`model:${m}`) || failedVoterIds.has(`model:${m}`),
    )
    const allHumansVoted = humanPlayers.every((p) =>
      existingVoterIds.has(`user:${p.playerId}`),
    )

    if (allAIVoted && allHumansVoted) {
      await ctx.scheduler.runAfter(0, internal.games.autoFinalizeGame, {
        gameId,
      })
    }
  }
}
