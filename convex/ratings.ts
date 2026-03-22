import type { MutationCtx } from "./_generated/server"

const DEFAULT_ELO = 1000
const K = 32

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

  // Fetch current ratings
  const ratings = await Promise.all(
    players.map((p) => getOrCreateRating(ctx, p.model))
  )

  const n = players.length
  const actualShares = players.map((p) => p.votes / totalVotes)

  // Pairwise expected shares
  const rawExpected = ratings.map((rA) => {
    let sum = 0
    for (const rB of ratings) {
      if (rA._id !== rB._id) {
        sum += 1 / (1 + Math.pow(10, (rB.elo - rA.elo) / 400))
      }
    }
    return sum / (n - 1)
  })

  const totalExpected = rawExpected.reduce((a, b) => a + b, 0)
  const expectedShares = rawExpected.map((expected) => expected / totalExpected)

  // Determine winner for win/loss/draw tracking
  const maxVotes = Math.max(...players.map((p) => p.votes))
  const topCount = players.filter((p) => p.votes === maxVotes).length

  const ts = Date.now()

  for (let i = 0; i < n; i++) {
    const diff = actualShares[i] - expectedShares[i]
    const eloChange = Math.round(K * diff * (n - 1))
    const newElo = ratings[i].elo + eloChange

    const isTop = players[i].votes === maxVotes
    const isDraw = topCount > 1 && isTop
    const isWin = topCount === 1 && isTop
    const isLoss = !isTop

    await ctx.db.patch("ratings", ratings[i]._id, {
      elo: newElo,
      wins: ratings[i].wins + (isWin ? 1 : 0),
      losses: ratings[i].losses + (isLoss ? 1 : 0),
      draws: ratings[i].draws + (isDraw ? 1 : 0),
      gamesPlayed: ratings[i].gamesPlayed + 1,
      updatedAt: ts,
    })
  }
}
