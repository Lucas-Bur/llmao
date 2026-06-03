import { v } from "convex/values"

import { mutation, query, type MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

function now() {
  return Date.now()
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
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await findPlayer(ctx, args.gameId, args.playerId)

    // Check duplicate display name (case-insensitive, excluding self)
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const duplicateName = allPlayers.find(
      (p) =>
        p.playerId !== args.playerId &&
        p.displayName.toLowerCase() === args.displayName.toLowerCase()
    )
    if (duplicateName) {
      throw new Error(
        `Name "${args.displayName}" ist bereits vergeben`
      )
    }

    if (existing) {
      // Update display name on rejoin
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
      })
      return { isHost: existing.isHost, playerId: existing.playerId }
    }

    // First player becomes host
    const isHost = allPlayers.length === 0

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
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await findPlayer(ctx, args.gameId, args.playerId)

    if (!existing) throw new Error("Player not found")

    // Check duplicate display name (case-insensitive, excluding self)
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect()

    const duplicateName = allPlayers.find(
      (p) =>
        p.playerId !== args.playerId &&
        p.displayName.toLowerCase() === args.displayName.toLowerCase()
    )
    if (duplicateName) {
      throw new Error(
        `Name "${args.displayName}" ist bereits vergeben`
      )
    }

    await ctx.db.patch(existing._id, {
      displayName: args.displayName,
    })
  },
})
