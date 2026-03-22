// Types based on Convex schema

import type { Doc } from "convex/_generated/dataModel"

export type GameStatus = Doc<"games">["status"]

export type Game = Doc<"games">

export type Prompt = Doc<"prompts">

export type Answer = Doc<"answers">

export type Vote = Doc<"votes">

export type Rating = Doc<"ratings">

export type GameData = {
  game: Game
  prompt: Prompt | null
  answers: Array<Answer>
  votes: Array<Vote>
}

// UI State types
export type CardFlipState = {
  [answerId: string]: boolean
}

export type ModelEloDisplay = {
  model: string
  eloBefore: number
  eloAfter: number
  delta: number
}
