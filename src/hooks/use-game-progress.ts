import { lookupModelName } from "@/constants/models"

type ParticipantStatus = "done" | "pending" | "failed"

type Participant = {
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

export function useGameProgress({
  game,
  answers,
  votes,
  players,
  llmEvents,
  playerId,
}: UseGameProgressParams) {
  const answeredModelIds = new Set(answers.map((a) => a.model))

  const failedModelIds = new Set(
    llmEvents
      .filter((e) => e.stage === "answer" && !e.success)
      .map((e) => e.model)
  )

  const votedVoterIds = new Set(votes.map((v) => v.voterId))

  const voteCounts: Record<string, number> = {}
  const voterNames: Record<string, Array<string>> = {}
  for (const answer of answers) {
    voteCounts[answer._id] = 0
    voterNames[answer._id] = []
  }
  for (const vote of votes) {
    voteCounts[vote.answerId] = (voteCounts[vote.answerId] || 0) + 1
    const name = vote.voterId.startsWith("user:")
      ? players.find(
          (p) => `user:${p.playerId}` === vote.voterId
        )?.displayName ?? vote.voterId
      : lookupModelName(vote.voterId.replace("model:", ""))
    voterNames[vote.answerId].push(name)
  }

  const timerDeadline =
    game.advanceMode === "timer"
      ? game.status === "responding" && game.respondedAt != null && game.respondTimeLimit != null
        ? game.respondedAt + game.respondTimeLimit * 1000
        : game.status === "voting" && game.votingAt != null && game.voteTimeLimit != null
          ? game.votingAt + game.voteTimeLimit * 1000
          : undefined
      : undefined

  const respondParticipants: Participant[] = [
    ...game.playerModels.map((m) => ({
      id: m,
      label: lookupModelName(m),
      status: (failedModelIds.has(m) ? "failed" : answeredModelIds.has(m) ? "done" : "pending") as ParticipantStatus,
    })),
    ...players.map((p) => ({
      id: p.playerId,
      label: playerId != null && p.playerId === playerId ? "you" : p.displayName,
      status: (answeredModelIds.has(`user:${p.playerId}`) ? "done" : "pending") as ParticipantStatus,
      subtitle: playerId != null && p.playerId === playerId && !answeredModelIds.has(`user:${p.playerId}`) ? "your answer missing" : undefined,
    })),
  ]

  const voteParticipants: Participant[] = [
    ...game.voterModels.map((m) => ({
      id: m,
      label: lookupModelName(m),
      status: (votedVoterIds.has(`model:${m}`) ? "done" : "pending") as ParticipantStatus,
    })),
    ...players.map((p) => ({
      id: p.playerId,
      label: playerId != null && p.playerId === playerId ? "you" : p.displayName,
      status: (votedVoterIds.has(`user:${p.playerId}`) ? "done" : "pending") as ParticipantStatus,
      subtitle: playerId != null && p.playerId === playerId && !votedVoterIds.has(`user:${p.playerId}`) ? "not voted yet" : undefined,
    })),
  ]

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
