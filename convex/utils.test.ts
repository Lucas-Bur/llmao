import { describe, it, expect } from "vitest"
import { cleanResponse, shuffle } from "./utils"

describe("cleanResponse", () => {
  it("strips surrounding double quotes", () => {
    expect(cleanResponse('"hello"')).toBe("hello")
  })

  it("strips surrounding single quotes", () => {
    expect(cleanResponse("'hello'")).toBe("hello")
  })

  it("handles nested quotes by only stripping outer pair", () => {
    expect(cleanResponse(`"outer 'inner' still"`)).toBe(`outer 'inner' still`)
  })

  it("no-ops on plain text", () => {
    expect(cleanResponse("hello")).toBe("hello")
  })

  it("trims whitespace before stripping quotes", () => {
    expect(cleanResponse('  "hello"  ')).toBe("hello")
  })
})

describe("shuffle", () => {
  it("returns all elements", () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input)
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5]
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })
})
