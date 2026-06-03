import { WhiteCard } from "@/components/cah/white-card"
import { PhaseProgress } from "@/components/cah/phase-progress"
import { Button } from "@/components/ui/button"
import { resolveDisplayName } from "@/constants/models"
import type { Doc, Id } from "convex/_generated/dataModel"
import type { Participant } from "@/hooks/use-game-progress"

type Props = {
  gameId: Id<"games">
  hasVoted: boolean
  onVotedChange: (v: boolean) => void
  selectedCardId: string | undefined
  onSelectedCardChange: (id: string | undefined) => void
  isVoting: boolean
  voteParticipants: Participant[]
  timerDeadline: number | undefined
  otherAnswers: Doc<"answers">[]
  allPlayers: Doc<"players">[]
  voteCounts: Record<string, number>
  voterNames: Record<string, string[]>
  isHost: boolean
  playerId: string
  submitVote: (args: {
    gameId: Id<"games">
    voterId: string
    answerId: Id<"answers">
  }) => Promise<unknown>
  finalizeGame: (args: { gameId: Id<"games"> }) => Promise<unknown>
}

export function VotingScreen({
  gameId,
  hasVoted,
  onVotedChange,
  selectedCardId,
  onSelectedCardChange,
  isVoting,
  voteParticipants,
  timerDeadline,
  otherAnswers,
  allPlayers,
  voteCounts,
  voterNames,
  isHost,
  playerId,
  submitVote,
  finalizeGame,
}: Props) {
  return (
    <div className="space-y-3">
      <PhaseProgress
        label="Votes"
        participants={voteParticipants}
        timerDeadline={timerDeadline}
      />

      <div className="space-y-2">
        {otherAnswers.map((answer) => (
          <WhiteCard
            key={answer._id}
            id={answer._id}
            text={answer.text}
            model={resolveDisplayName(answer.model, allPlayers)}
            isFlipped
            isSelected={selectedCardId === answer._id}
            isLoading={false}
            hasVoted={false}
            voteCount={voteCounts[answer._id] ?? 0}
            voterNames={voterNames[answer._id]}
            canSelect={!hasVoted}
            onFlip={() => {}}
            onSelect={() => {
              if (hasVoted) return
              onSelectedCardChange(
                selectedCardId === answer._id ? undefined : answer._id,
              )
            }}
          />
        ))}

        {!hasVoted && !selectedCardId && (
          <p className="text-center text-xs text-muted-foreground">
            Pick the funniest answer
          </p>
        )}

        {!hasVoted && selectedCardId && (
          <Button
            className="mt-4 w-full rounded-none"
            disabled={isVoting}
            onClick={async () => {
              await submitVote({
                gameId,
                voterId: `user:${playerId}`,
                answerId: selectedCardId as Id<"answers">,
              })
              onVotedChange(true)
            }}
          >
            {isVoting ? "Voting..." : "Vote"}
          </Button>
        )}
      </div>

      {isHost && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Skip phase? The game will be finalized for all players immediately, possibly before everyone has voted.
          </p>
          <Button
            size="sm"
            className="w-full rounded-none text-xs"
            onClick={async () => {
              await finalizeGame({ gameId })
            }}
          >
            Finalize →
          </Button>
        </div>
      )}
    </div>
  )
}
