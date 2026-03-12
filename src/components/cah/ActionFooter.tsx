import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query"
import { api } from "convex/_generated/api"
import {
  ArrowRight,
  Lightbulb,
  PenLine,
  Play,
  RotateCcw,
  Vote,
} from "lucide-react"

import { GameStepper } from "./GameStepper"
import type { Game, GameStatus } from "./types"

import { Button } from "@/components/ui/button"

interface ActionFooterProps {
  gameId: Game["_id"]
  gameStatus: GameStatus
  selectedCardId: string | null
  allCardsFlipped: boolean
  hasUserVoted: boolean
  hasUserSubmittedCard: boolean
  canSubmitCard: boolean
  onSubmitCard: () => void
  onVote: () => void
  onAdvanceState: () => void
  onNewGame: () => void
}

function getNextAction(status: GameStatus): {
  label: string
  icon: "play" | "arrow" | "reset"
} {
  switch (status) {
    case "created":
      return { label: "Prompt generieren", icon: "play" }
    case "prompting":
      return { label: "Warten...", icon: "arrow" }
    case "responding":
      return { label: "Zum Voting", icon: "arrow" }
    case "voting":
      return { label: "Auswerten", icon: "arrow" }
    case "resolved":
      return { label: "Neues Spiel", icon: "reset" }
    case "locked":
      return { label: "Neues Spiel", icon: "reset" }
    default:
      return { label: "Weiter", icon: "arrow" }
  }
}

export function ActionFooter({
  gameId,
  gameStatus,
  selectedCardId,
  allCardsFlipped,
  hasUserVoted,
  hasUserSubmittedCard,
  canSubmitCard,
  onSubmitCard,
  onVote,
  onAdvanceState,
  onNewGame,
}: ActionFooterProps) {
  const nextAction = getNextAction(gameStatus)
  const isVotingPhase = gameStatus === "voting"
  const canVote =
    isVotingPhase && allCardsFlipped && selectedCardId && !hasUserVoted
  const isGameOver = gameStatus === "resolved" || gameStatus === "locked"

  const { mutateAsync: triggerGenerateAnswersMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerGenerateAnswers),
  })

  return (
    <footer className="fixed right-0 bottom-0 left-0 z-30 border-t bg-background">
      <div className="flex h-16 items-center justify-between gap-8 px-4">
        {/* Left: Submit own card */}
        <div className="flex w-48 items-center gap-3">
          {canSubmitCard && !hasUserSubmittedCard && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSubmitCard}
              className="gap-2 rounded-none"
            >
              <PenLine className="h-4 w-4" />
              Eigene Karte
            </Button>
          )}
          {canSubmitCard && hasUserSubmittedCard && (
            <span className="text-xs text-muted-foreground">
              Karte eingereicht
            </span>
          )}
        </div>

        {/* Center: Stepper */}
        <div className="flex flex-1 justify-center">
          <GameStepper status={gameStatus} />
        </div>

        {/* Right: Actions */}
        <div className="flex w-48 items-center justify-end gap-3">
          {/* Vote button during voting */}
          {isVotingPhase && !hasUserVoted && (
            <Button
              onClick={onVote}
              disabled={!canVote}
              className="gap-2 rounded-none"
              size="sm"
            >
              <Vote className="h-4 w-4" />
              Abstimmen
            </Button>
          )}

          {/* Advance / New Game button */}
          {isGameOver ? (
            <Button
              onClick={onNewGame}
              className="gap-2 rounded-none"
              size="sm"
            >
              <RotateCcw className="h-4 w-4" />
              {nextAction.label}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onAdvanceState}
                disabled={gameStatus === "prompting"}
                className="gap-2 rounded-none"
              >
                {nextAction.icon === "play" && <Play className="h-4 w-4" />}
                {nextAction.icon === "arrow" && (
                  <ArrowRight className="h-4 w-4" />
                )}
                {nextAction.label}
              </Button>{" "}
              {gameStatus === "responding" ? (
                <Button
                  onClick={async () =>
                    await triggerGenerateAnswersMutation({ gameId })
                  }
                  className="gap-2 rounded-none"
                  size="sm"
                >
                  <Lightbulb className="h-4 w-4" />
                  Antworten generieren
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </footer>
  )
}
