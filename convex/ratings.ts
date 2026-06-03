import type { MutationCtx } from "./_generated/server"

const DEFAULT_ELO = 1000
export const K = 32

export function computeEloChanges(
  currentElos: number[],
  votes: number[]
): Array<{ eloDelta: number; isWin: boolean; isLoss: boolean; isDraw: boolean }> {
  if (currentElos.length < 2) return []

  const totalVotes = votes.reduce((sum, v) => sum + v, 0)
  if (totalVotes === 0) {
    return currentElos.map(() => ({ eloDelta: 0, isWin: false, isLoss: false, isDraw: false }))
  }

  const n = currentElos.length
  const actualShares = votes.map((v) => v / totalVotes)

  const rawExpected = currentElos.map((eloA, idxA) => {
    let sum = 0
    for (let idxB = 0; idxB < currentElos.length; idxB++) {
      if (idxA !== idxB) {
        sum += 1 / (1 + Math.pow(10, (currentElos[idxB] - eloA) / 400))
      }
    }
    return sum / (n - 1)
  })

  const totalExpected = rawExpected.reduce((a, b) => a + b, 0)
  const expectedShares = rawExpected.map((e) => e / totalExpected)

  const maxVotes = Math.max(...votes)
  const topCount = votes.filter((v) => v === maxVotes).length

  return currentElos.map((_, i) => {
    const diff = actualShares[i] - expectedShares[i]
    const eloDelta = Math.round(K * diff * (n - 1))

    const isTop = votes[i] === maxVotes
    const isDraw = topCount > 1 && isTop
    const isWin = topCount === 1 && isTop
    const isLoss = !isTop

    return { eloDelta, isWin, isLoss, isDraw }
  })
}

type PlayerVoteInput = {
  model: string
  votes: number
}

export async function getOrCreateRating(ctx: MutationCtx, model: string) {
  const existing = await ctx.db
    .query("ratings")
    .withIndex("by_model", (q) => q.eq("model", model))
    .unique()

  if (existing) return existing

  const id = await ctx.db.insert("ratings", {
    model,
    elo: DEFAULT_ELO,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    updatedAt: Date.now(),
  })

  const created = await ctx.db.get("ratings", id)
  if (!created) throw new Error("Failed to create rating")
  return created
}

/**
 * Multi-player Elo update based on vote shares.
 *
 * Each player's "actual score" is their proportion of total votes.
 * Expected score is derived from pairwise Elo expectations, normalized.
 * With 2 players this reduces to standard Elo.
 */
export async function applyMultiPlayerElo(
  ctx: MutationCtx,
  players: Array<PlayerVoteInput>
) {
  if (players.length < 2) return

  const totalVotes = players.reduce((sum, p) => sum + p.votes, 0)
  if (totalVotes === 0) return

  const ratings = await Promise.all(
    players.map((p) => getOrCreateRating(ctx, p.model))
  )

  const changes = computeEloChanges(
    ratings.map((r) => r.elo),
    players.map((p) => p.votes)
  )

  const ts = Date.now()

  for (let i = 0; i < players.length; i++) {
    const { eloDelta, isWin, isLoss, isDraw } = changes[i]

    await ctx.db.patch("ratings", ratings[i]._id, {
      elo: ratings[i].elo + eloDelta,
      wins: ratings[i].wins + (isWin ? 1 : 0),
      losses: ratings[i].losses + (isLoss ? 1 : 0),
      draws: ratings[i].draws + (isDraw ? 1 : 0),
      gamesPlayed: ratings[i].gamesPlayed + 1,
      updatedAt: ts,
    })
  }
}
