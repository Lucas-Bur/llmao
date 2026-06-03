import { describe, it, expect } from "vitest"
import { computeEloChanges } from "./ratings"

describe("computeEloChanges", () => {
  it("two players: winner gains ELO, loser loses ELO", () => {
    const result = computeEloChanges([1000, 1000], [10, 0])
    expect(result[0].eloDelta).toBeGreaterThan(0)
    expect(result[1].eloDelta).toBeLessThan(0)
    expect(result[0].isWin).toBe(true)
    expect(result[1].isLoss).toBe(true)
  })

  it("three players: different vote distributions", () => {
    const result = computeEloChanges([1000, 1000, 1000], [10, 7, 1])
    expect(result[0].eloDelta).toBeGreaterThan(0)
    expect(result[1].eloDelta).toBeGreaterThan(0)
    expect(result[2].eloDelta).toBeLessThan(0)
  })

  it("all players get equal votes (draw)", () => {
    const result = computeEloChanges([1000, 1000, 1000], [5, 5, 5])
    expect(result[0].eloDelta).toBe(0)
    expect(result[1].eloDelta).toBe(0)
    expect(result[2].eloDelta).toBe(0)
    expect(result[0].isDraw).toBe(true)
    expect(result[1].isDraw).toBe(true)
    expect(result[2].isDraw).toBe(true)
  })

  it("single player returns empty array", () => {
    const result = computeEloChanges([1000], [10])
    expect(result).toEqual([])
  })

  it("one player gets all votes", () => {
    const result = computeEloChanges([1000, 1000, 1000], [10, 0, 0])
    expect(result[0].eloDelta).toBeGreaterThan(0)
    expect(result[1].eloDelta).toBeLessThan(0)
    expect(result[2].eloDelta).toBeLessThan(0)
    expect(result[0].isWin).toBe(true)
    expect(result[1].isLoss).toBe(true)
    expect(result[2].isLoss).toBe(true)
  })

  it("winner gain approximately equals loser loss (symmetry)", () => {
    const result = computeEloChanges([1000, 1000], [10, 0])
    expect(result[0].eloDelta + result[1].eloDelta).toBe(0)
  })
})
