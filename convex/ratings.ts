import type { MutationCtx } from "./_generated/server"

const DEFAULT_ELO = 1000
const K = 32

type Winner = "A" | "B" | "draw"

export async function getOrCreateRating(ctx: MutationCtx, model: string) {
  const existing = await ctx.db
    .query("ratings")
    .withIndex("by_model", (q) => q.eq("model", model))
    .unique()

  if (existing) {
    return existing
  }

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
  if (!created) {
    throw new Error("Failed to create rating")
  }

  return created
}

export async function applyEloResult(
  ctx: MutationCtx,
  modelA: string,
  modelB: string,
  winner: Winner
) {
  const ratingA = await getOrCreateRating(ctx, modelA)
  const ratingB = await getOrCreateRating(ctx, modelB)

  const expectedA = 1 / (1 + Math.pow(10, (ratingB.elo - ratingA.elo) / 400))
  const expectedB = 1 - expectedA

  const actualA = winner === "A" ? 1 : winner === "B" ? 0 : 0.5
  const actualB = 1 - actualA

  const nextA = Math.round(ratingA.elo + K * (actualA - expectedA))
  const nextB = Math.round(ratingB.elo + K * (actualB - expectedB))
  const now = Date.now()

  await ctx.db.patch("ratings", ratingA._id, {
    elo: nextA,
    wins: ratingA.wins + (winner === "A" ? 1 : 0),
    losses: ratingA.losses + (winner === "B" ? 1 : 0),
    draws: ratingA.draws + (winner === "draw" ? 1 : 0),
    gamesPlayed: ratingA.gamesPlayed + 1,
    updatedAt: now,
  })

  await ctx.db.patch("ratings", ratingB._id, {
    elo: nextB,
    wins: ratingB.wins + (winner === "B" ? 1 : 0),
    losses: ratingB.losses + (winner === "A" ? 1 : 0),
    draws: ratingB.draws + (winner === "draw" ? 1 : 0),
    gamesPlayed: ratingB.gamesPlayed + 1,
    updatedAt: now,
  })

  return {
    before: {
      a: ratingA.elo,
      b: ratingB.elo,
    },
    after: {
      a: nextA,
      b: nextB,
    },
  }
}
