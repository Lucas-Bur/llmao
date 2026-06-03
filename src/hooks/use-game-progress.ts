import { lookupModelName } from "@/constants/models"

interface UseGameProgressParams {
  game: {
    advanceMode?: string | null
    status: string
    respondedAt?: number | null
    respondTimeLimit?: number | null
    votingAt?: number | null
    voteTimeLimit?: number | null
  }
  answers: Array<{ _id: string; model: string }>
  votes: Array<{ answerId: string; voterId: string }>
  players: Array<{ playerId: string; displayName: string }>
  llmEvents: Array<{ stage: string; success: boolean; model: string }>
}

export function useGameProgress({
  game,
  answers,
  votes,
  players,
  llmEvents,
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

  return {
    voteCounts,
    voterNames,
    timerDeadline,
    answeredModelIds,
    failedModelIds,
    votedVoterIds,
  }
}
