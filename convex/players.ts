import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

function now() {
  return Date.now()
}

export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", args.gameId).eq("playerId", args.playerId)
      )
      .unique()

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
    const existing = await ctx.db
      .query("players")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", args.gameId).eq("playerId", args.playerId)
      )
      .unique()

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
