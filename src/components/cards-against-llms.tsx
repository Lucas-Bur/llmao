import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { Smartphone } from "lucide-react"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { BlackCard } from "./cah/black-card"
import { PhaseProgress } from "./cah/phase-progress"
import { GameStepper } from "./cah/game-stepper"
import { QRCode } from "./qr-code"
import { WhiteCard } from "./cah/white-card"

import { Button } from "@/components/ui/button"
import { resolveDisplayName } from "@/constants/models"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useGameProgress } from "@/hooks/use-game-progress"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"
import { ResultPodium } from "./cah/result-podium"


const SHOW_CARDS_STATUSES = new Set([
  "voting",
  "resolved",
  "locked",
])

export default function TVDisplay({
  gameId,
}: Readonly<{ gameId: string }>) {
  const navigate = useNavigate()
  const { setBreadcrumb } = useBreadcrumb()
  const roomName = useUniqueNameFromId(gameId)

  const { origin } = useRouter()

  const { data: gameObject, isLoading } = useQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> })
  )

  useEffect(() => {
    setBreadcrumb(
      <Link
        to="/games"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        All Games
        <span className="ml-1 text-muted-foreground/50">/ {roomName}</span>
      </Link>
    )
    return () => setBreadcrumb(null)
  }, [gameId, roomName, setBreadcrumb])

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100svh-var(--header-height))] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading game...</p>
      </div>
    )
  }

  if (!gameObject) {
    return (
      <div className="flex min-h-[calc(100svh-var(--header-height))] flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-muted-foreground">Game not found</p>
        <Button onClick={() => navigate({ to: "/games" })}>
          Back to overview
        </Button>
      </div>
    )
  }

  const game = gameObject.game
  const prompt = gameObject.prompt
  const allAnswers = gameObject.answers ?? []
  const votes = gameObject.votes ?? []
  const players = gameObject.players ?? []
  const llmEvents = gameObject.llmEvents ?? []
  const showCards = SHOW_CARDS_STATUSES.has(game.status)

  // Staggered card reveal when voting → resolved/locked
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set())
  const prevStatusRef = useRef(game.status)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = game.status

    const isNowResolved = game.status === "resolved" || game.status === "locked"
    const wasVoting = prev === "voting"

    if (wasVoting && isNowResolved && allAnswers.length > 0) {
      const ids = allAnswers.map((a) => a._id)
      ids.forEach((id, i) => {
        setTimeout(() => {
          setRevealedCardIds((curr) => new Set([...curr, id]))
        }, i * 800)
      })
    } else if (isNowResolved && revealedCardIds.size === 0) {
      setRevealedCardIds(new Set(allAnswers.map((a) => a._id)))
    } else if (game.status === "voting") {
      setRevealedCardIds(new Set())
    }
  }, [game.status, allAnswers])

  const {
    voteCounts,
    voterNames,
    timerDeadline,
    respondParticipants,
    voteParticipants,
  } = useGameProgress({
    game,
    answers: allAnswers,
    votes,
    players,
    llmEvents,
  })

  const isResolved = game.status === "resolved" || game.status === "locked"

  return (
    <div className="flex min-h-[calc(100svh-var(--header-height))] w-full overflow-x-hidden bg-background">
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <div className="mb-4">
            <GameStepper status={game.status} />
          </div>

          <div className="mb-6">
            <BlackCard
              text={prompt?.text}
              model={prompt?.model}
              isLoading={game.status === "prompting"}
              showModel={game.status !== "created"}
            />
          </div>

          {game.status === "created" && (
            <div className="flex h-56 flex-col items-center justify-center gap-4 border border-dashed">
              <p className="text-sm text-muted-foreground">
                Host is configuring the game...
              </p>
              <p className="text-xs text-muted-foreground">
                Open the play page on your phone to become host
              </p>
            </div>
          )}

          {showCards && game.status === "voting" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allAnswers.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <WhiteCard
                      key={`loading-${i}`}
                      id={`loading-${i}`}
                      text=""
                      model=""
                      isFlipped={false}
                      isSelected={false}
                      isLoading
                      hasVoted={false}
                      canSelect={false}
                      onFlip={() => {}}
                      onSelect={() => {}}
                    />
                  ))
                : allAnswers.map((answer) => (
                    <WhiteCard
                      key={answer._id}
                      id={answer._id}
                      text={answer.text}
                      model={resolveDisplayName(answer.model, players)}
                      isFlipped={revealedCardIds.has(answer._id)}
                      isSelected={false}
                      isLoading={false}
                      voteCount={voteCounts[answer._id]}
                      voterNames={voterNames[answer._id]}
                      hasVoted={game.status !== "voting"}
                      canSelect={false}
                      onFlip={() => {}}
                      onSelect={() => {}}
                    />
                  ))}
            </div>
          )}

          {isResolved && (
            <div className="min-w-0 flex-1">
              <ResultPodium
                answers={allAnswers}
                voteCounts={voteCounts}
                voterNames={voterNames}
                players={players}
                gameStatus={game.status}
              />
            </div>
          )}

        </div>

        {/* Right side: sidebar */}
        <div className="flex w-56 flex-col gap-4 border-l p-4">
          {/* Player progress */}
          {game.status === "responding" && (
            <PhaseProgress
              label="Answers"
              variant="sidebar"
              participants={respondParticipants}
              timerDeadline={timerDeadline}
            />
          )}

          {game.status === "voting" && (
            <PhaseProgress
              label="Voting"
              variant="sidebar"
              participants={voteParticipants}
              timerDeadline={timerDeadline}
            />
          )}

          {/* QR code + join */}
          <div className="flex flex-col items-center gap-3">
            <QRCode url={`${origin}/games/${gameId}/play`} size={160} />
            <p className="text-center text-xs text-muted-foreground">
              Scan the code with your phone
            </p>
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() =>
                navigate({
                  to: "/games/$gameId/play",
                  params: { gameId },
                })
              }
            >
              <Smartphone className="h-4 w-4" />
              Join now
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              First visitor becomes host
              <br />
              and can configure the game
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


