import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { Smartphone, Timer } from "lucide-react"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { BlackCard } from "./cah/black-card"
import { GameStepper } from "./cah/game-stepper"
import { QRCode } from "./qr-code"
import { WhiteCard } from "./cah/white-card"

import { Button } from "@/components/ui/button"
import { lookupModelName } from "@/constants/models"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"

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

  const {origin}= useRouter()

  const { data: gameObject, isLoading } = useQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> })
  )

  useEffect(() => {
    setBreadcrumb(
      <Link
        to="/games"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Alle Spiele
        <span className="ml-1 text-muted-foreground/50">/ {roomName}</span>
      </Link>
    )
    return () => setBreadcrumb(null)
  }, [gameId, roomName, setBreadcrumb])

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100svh-var(--header-height))] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Spiel wird geladen...</p>
      </div>
    )
  }

  if (!gameObject) {
    return (
      <div className="flex min-h-[calc(100svh-var(--header-height))] flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-muted-foreground">Spiel nicht gefunden</p>
        <Button onClick={() => navigate({ to: "/games" })}>
          Zurück zur Übersicht
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

  // Which models have answered / failed
  const answeredModelIds = new Set(allAnswers.map((a) => a.model))
  const failedModelIds = new Set(
    llmEvents
      .filter((e) => e.stage === "answer" && !e.success)
      .map((e) => e.model)
  )

  // Player submission status during responding
  const expectedAIPlayers = game.playerModels ?? []

  // Vote progress during voting
  const votedVoterIds = new Set(votes.map((v) => v.voterId))
  const expectedVoters = game.voterModels ?? []

  const voteCounts: Record<string, number> = {}
  const voterNames: Record<string, Array<string>> = {}
  for (const answer of allAnswers) {
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

  return (
    <div className="flex min-h-[calc(100svh-var(--header-height))] bg-background">
      <div className="flex flex-1">
        <div className="flex flex-1 flex-col p-6">
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
                Host konfiguriert das Spiel...
              </p>
              <p className="text-xs text-muted-foreground">
                Öffne die Play-Seite auf deinem Handy, um Host zu werden
              </p>
            </div>
          )}

          {showCards && (
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
                      model={
                        answer.model.startsWith("user:")
                          ? players.find(
                              (p) => `user:${p.playerId}` === answer.model
                            )?.displayName ?? answer.model
                          : lookupModelName(answer.model)
                      }
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

        </div>

        {/* Right side: sidebar */}
        <div className="flex w-56 flex-col gap-4 border-l p-4">
          {/* Player progress */}
          {game.status === "responding" && (
            <div className="text-xs">
              <p className="mb-2 font-medium text-foreground">Antworten</p>
              <div className="space-y-1 text-muted-foreground">
                {expectedAIPlayers.map((m) => (
                  <div key={m} className="flex justify-between">
                    <span className={answeredModelIds.has(m) ? "text-green-600" : failedModelIds.has(m) ? "text-destructive" : undefined}>
                      {lookupModelName(m)}
                    </span>
                    <span>{answeredModelIds.has(m) ? "✓" : failedModelIds.has(m) ? "✗" : "⟳"}</span>
                  </div>
                ))}
                {players.map((p) => (
                  <div key={p.playerId} className="flex justify-between">
                    <span className={answeredModelIds.has(`user:${p.playerId}`) ? "text-green-600" : undefined}>
                      {p.displayName}
                    </span>
                    <span>{answeredModelIds.has(`user:${p.playerId}`) ? "✓" : "⟳"}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-muted-foreground">
                <span>
                  {answeredModelIds.size}/{expectedAIPlayers.length + players.length}
                </span>
                {timerDeadline != null && <CountdownTimer deadline={timerDeadline} />}
              </div>
            </div>
          )}

          {game.status === "voting" && (
            <div className="text-xs">
              <p className="mb-2 font-medium text-foreground">Abstimmung</p>
              <div className="space-y-1 text-muted-foreground">
                {expectedVoters.map((m) => {
                  const voted = votedVoterIds.has(`model:${m}`)
                  return (
                    <div key={m} className="flex justify-between">
                      <span className={voted ? "text-green-600" : undefined}>
                        {lookupModelName(m)}
                      </span>
                      <span>{voted ? "✓" : "⟳"}</span>
                    </div>
                  )
                })}
                {players.map((p) => {
                  const voted = votedVoterIds.has(`user:${p.playerId}`)
                  return (
                    <div key={p.playerId} className="flex justify-between">
                      <span className={voted ? "text-green-600" : undefined}>
                        {p.displayName}
                      </span>
                      <span>{voted ? "✓" : "⟳"}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-muted-foreground">
                <span>
                  {votedVoterIds.size}/{expectedVoters.length + players.length}
                </span>
                {timerDeadline != null && <CountdownTimer deadline={timerDeadline} />}
              </div>
            </div>
          )}

          {/* QR code + join */}
          <div className="flex flex-col items-center gap-3">
            <QRCode url={`${origin}/games/${gameId}/play`} size={160} />
            <p className="text-center text-xs text-muted-foreground">
              Scanne den Code mit deinem Handy
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
              Jetzt beitreten
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Erster Besucher wird Host
              <br />
              und kann das Spiel konfigurieren
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CountdownTimer({ deadline }: Readonly<{ deadline: number }>) {
  const [remaining, setRemaining] = useState(
    () => Math.max(0, Math.floor((deadline - Date.now()) / 1000))
  )

  useEffect(() => {
    if (remaining <= 0) return
    const interval = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline, remaining])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <span className="flex items-center gap-1 font-medium text-foreground">
      <Timer className="h-3 w-3" />
      {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`}
    </span>
  )
}
