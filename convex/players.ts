import { v } from "convex/values"

import { mutation, query, type MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

function now() {
  return Date.now()
}

const playerArgs = {
  gameId: v.id("games"),
  playerId: v.string(),
  displayName: v.string(),
} as const

async function fetchAllPlayers(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  return await ctx.db
    .query("players")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect()
}

async function assertUniqueDisplayName(
  ctx: MutationCtx,
  gameId: Id<"games">,
  playerId: string,
  displayName: string,
) {
  const allPlayers = await fetchAllPlayers(ctx, gameId)

  const duplicateName = allPlayers.find(
    (p) =>
      p.playerId !== playerId &&
      p.displayName.toLowerCase() === displayName.toLowerCase(),
  )
  if (duplicateName) {
    throw new Error(`Name "${displayName}" ist bereits vergeben`)
  }
}

async function findPlayer(
  ctx: MutationCtx,
  gameId: Id<"games">,
  playerId: string,
) {
  return await ctx.db
    .query("players")
    .withIndex("by_gameId_playerId", (q) =>
      q.eq("gameId", gameId).eq("playerId", playerId)
    )
    .unique()
}

export const joinGame = mutation({
  args: playerArgs,
  handler: async (ctx, args) => {
    const existing = await findPlayer(ctx, args.gameId, args.playerId)

    await assertUniqueDisplayName(ctx, args.gameId, args.playerId, args.displayName)

    if (existing) {
      // Update display name on rejoin
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
      })
      return { isHost: existing.isHost, playerId: existing.playerId }
    }

    // First player becomes host
    const allExisting = await fetchAllPlayers(ctx, args.gameId)
    const isHost = allExisting.length === 0

    await ctx.db.insert("players", {
      gameId: args.gameId,
      playerId: args.playerId,
      displayName: args.displayName,
      isHost,
      joinedAt: now(),
    })

    return { isHost, playerId: args.playerId }
  },
})

export const listPlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .order("asc")
      .collect()
  },
})

export const setDisplayName = mutation({
  args: playerArgs,
  handler: async (ctx, args) => {
    const existing = await findPlayer(ctx, args.gameId, args.playerId)

    if (!existing) throw new Error("Player not found")

    await assertUniqueDisplayName(ctx, args.gameId, args.playerId, args.displayName)

    await ctx.db.patch(existing._id, {
      displayName: args.displayName,
    })
  },
})
