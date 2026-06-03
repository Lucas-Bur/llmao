import { lookupModelName, resolveDisplayName } from "@/constants/models"

type ParticipantStatus = "done" | "pending" | "failed"

export type Participant = {
  id: string
  label: string
  status: ParticipantStatus
  subtitle?: string
}

interface UseGameProgressParams {
  game: {
    advanceMode?: string | null
    status: string
    respondedAt?: number | null
    respondTimeLimit?: number | null
    votingAt?: number | null
    voteTimeLimit?: number | null
    playerModels: string[]
    voterModels: string[]
  }
  answers: Array<{ _id: string; model: string }>
  votes: Array<{ answerId: string; voterId: string }>
  players: Array<{ playerId: string; displayName: string }>
  llmEvents: Array<{ stage: string; success: boolean; model: string }>
  playerId?: string
}

function computeVoteCounts(
  answers: UseGameProgressParams["answers"],
  votes: UseGameProgressParams["votes"],
  players: UseGameProgressParams["players"],
) {
  const voteCounts: Record<string, number> = {}
  const voterNames: Record<string, Array<string>> = {}
  for (const answer of answers) {
    voteCounts[answer._id] = 0
    voterNames[answer._id] = []
  }
  for (const vote of votes) {
    voteCounts[vote.answerId] = (voteCounts[vote.answerId] || 0) + 1
    voterNames[vote.answerId].push(resolveDisplayName(vote.voterId, players))
  }
  return { voteCounts, voterNames }
}

function computeTimerDeadline(game: UseGameProgressParams["game"]) {
  if (game.advanceMode !== "timer") return undefined
  if (game.status === "responding" && game.respondedAt != null && game.respondTimeLimit != null) {
    return game.respondedAt + game.respondTimeLimit * 1000
  }
  if (game.status === "voting" && game.votingAt != null && game.voteTimeLimit != null) {
    return game.votingAt + game.voteTimeLimit * 1000
  }
  return undefined
}

function buildParticipants(
  models: string[],
  doneIds: Set<string>,
  players: UseGameProgressParams["players"],
  playerId: string | undefined,
  modelPrefix: string,
  playerKeyFn: (p: { playerId: string }) => string,
  subtitlePending: string,
  failedIds?: Set<string>,
): Participant[] {
  return [
    ...models.map((m) => ({
      id: m,
      label: lookupModelName(m),
      status: (failedIds?.has(m) ? "failed" : doneIds.has(modelPrefix ? `${modelPrefix}${m}` : m) ? "done" : "pending") as ParticipantStatus,
    })),
    ...players.map((p) => ({
      id: p.playerId,
      label: playerId != null && p.playerId === playerId ? "you" : p.displayName,
      status: (doneIds.has(playerKeyFn(p)) ? "done" : "pending") as ParticipantStatus,
      subtitle: playerId != null && p.playerId === playerId && !doneIds.has(playerKeyFn(p)) ? subtitlePending : undefined,
    })),
  ]
}

export function useGameProgress({
  game,
  answers,
  votes,
  players,
  llmEvents,
  playerId,
}: UseGameProgressParams) {
  const { voteCounts, voterNames } = computeVoteCounts(answers, votes, players)
  const timerDeadline = computeTimerDeadline(game)
  const answeredModelIds = new Set(answers.map((a) => a.model))
  const failedModelIds = new Set(
    llmEvents
      .filter((e) => e.stage === "answer" && !e.success)
      .map((e) => e.model)
  )
  const votedVoterIds = new Set(votes.map((v) => v.voterId))

  const respondParticipants = buildParticipants(
    game.playerModels,
    answeredModelIds,
    players,
    playerId,
    "",
    (p) => `user:${p.playerId}`,
    "your answer missing",
    failedModelIds,
  )
  const voteParticipants = buildParticipants(
    game.voterModels,
    votedVoterIds,
    players,
    playerId,
    "model:",
    (p) => `user:${p.playerId}`,
    "not voted yet",
  )

  return {
    voteCounts,
    voterNames,
    timerDeadline,
    answeredModelIds,
    failedModelIds,
    votedVoterIds,
    respondParticipants,
    voteParticipants,
  }
}
