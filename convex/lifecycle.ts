export type SpielStatus = "created" | "prompting" | "responding" | "voting" | "resolved" | "locked"

export type Transition = {
  from: SpielStatus
  to: SpielStatus
  label: string
}

const VALID_TRANSITIONS: Record<SpielStatus, ReadonlyArray<SpielStatus>> = {
  created: ["prompting"],
  prompting: ["responding", "created"],
  responding: ["voting"],
  voting: ["resolved"],
  resolved: ["locked", "created"],
  locked: ["created"],
}

export function assertCanTransition(from: SpielStatus, to: SpielStatus): void {
  const allowed = VALID_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`)
  }
}

export function assertStatus(
  game: { status: SpielStatus },
  expected: SpielStatus,
  label?: string,
): void {
  if (game.status !== expected) {
    throw new Error(label ?? `Expected status ${expected}, got ${game.status}`)
  }
}

export function canTransition(
  from: SpielStatus,
  to: SpielStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function nextStatuses(
  current: SpielStatus,
): ReadonlyArray<SpielStatus> {
  return VALID_TRANSITIONS[current]
}

export const ONGOING_STATUSES: ReadonlyArray<SpielStatus> = [
  "created",
  "prompting",
  "responding",
  "voting",
]

export const PAST_STATUSES: ReadonlyArray<SpielStatus> = [
  "resolved",
  "locked",
]

// ---------------------------------------------------------------------------
// Transition table — single source of truth for named transitions
// ---------------------------------------------------------------------------

export type TransitionName =
  | "start"
  | "promptFailed"
  | "promptComplete"
  | "advanceToVoting"
  | "finalizeGame"
  | "lockGame"

export type TransitionDef = {
  from: SpielStatus
  to: SpielStatus
  label: string
  /** Game field to set the current timestamp on when entering `to` status */
  timestampField?: keyof { respondedAt: number; votingAt: number; resolvedAt: number; lockedAt: number }
}

export const TRANSITION_TABLE: Record<TransitionName, TransitionDef> = {
  start: {
    from: "created",
    to: "prompting",
    label: "Start game",
  },
  promptFailed: {
    from: "prompting",
    to: "created",
    label: "Prompt failed",
  },
  promptComplete: {
    from: "prompting",
    to: "responding",
    label: "Prompt complete",
    timestampField: "respondedAt",
  },
  advanceToVoting: {
    from: "responding",
    to: "voting",
    label: "Advance to voting",
    timestampField: "votingAt",
  },
  finalizeGame: {
    from: "voting",
    to: "resolved",
    label: "Finalize game",
    timestampField: "resolvedAt",
  },
  lockGame: {
    from: "resolved",
    to: "locked",
    label: "Lock game after Elo applied",
    timestampField: "lockedAt",
  },
}
