import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { Smartphone, Timer } from "lucide-react"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { BlackCard } from "./cah/black-card"
import { GameStepper } from "./cah/game-stepper"
import { QRCode } from "./qr-code"
import { WhiteCard } from "./cah/white-card"

import { Button } from "@/components/ui/button"
import { lookupModelName } from "@/constants/models"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"

const STATUS_LABEL: Record<string, string> = {
  created: "Konfiguration läuft...",
  prompting: "Prompt wird generiert...",
  responding: "Antworten werden gesammelt...",
  voting: "Abstimmung läuft...",
  resolved: "Ergebnis",
  locked: "Beendet",
}

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

  // Card visibility: face-down during responding, face-up during voting+
  const cardsFlipped = game.status !== "responding"

  // Which models have answered / failed
  const answeredModelIds = new Set(allAnswers.map((a) => a.model))
  const failedModelIds = new Set(
    llmEvents
      .filter((e) => e.stage === "answer" && !e.success)
      .map((e) => e.model)
  )

  // Player submission status during responding
  const expectedAIPlayers = game.playerModels ?? []
  const submittedAIs = expectedAIPlayers.filter((m) =>
    answeredModelIds.has(m)
  )
  const failedAIs = expectedAIPlayers.filter((m) => failedModelIds.has(m))
  const humanPlayersWithAnswers = players.filter((p) =>
    answeredModelIds.has(`user:${p.playerId}`)
  )

  // Vote progress during voting
  const votedVoterIds = new Set(votes.map((v) => v.voterId))
  const expectedVoters = game.voterModels ?? []
  const votedAIVoters = expectedVoters.filter((m) =>
    votedVoterIds.has(`model:${m}`)
  )
  const humanVotersWhoVoted = players.filter((p) =>
    votedVoterIds.has(`user:${p.playerId}`)
  )

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
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {STATUS_LABEL[game.status] ?? game.status}
            </p>
            <GameStepper status={game.status} />
          </div>

          {/* Player list + human players */}
          <div className="mb-4 text-xs text-muted-foreground">
            <span>Spieler: </span>
            {players.length === 0 && expectedAIPlayers.length === 0 ? (
              <span>Noch niemand da — scanne den QR-Code!</span>
            ) : (
              <>
                {/* AI players */}
                {expectedAIPlayers.map((m) => (
                  <span
                    key={m}
                    className={
                      failedModelIds.has(m)
                        ? "text-destructive"
                        : answeredModelIds.has(m)
                          ? "text-green-600"
                          : undefined
                    }
                  >
                    {lookupModelName(m)}
                    {answeredModelIds.has(m) ? " ✓" : failedModelIds.has(m) ? " ✗" : " ⟳"}{" "}
                  </span>
                ))}
                {/* Human players */}
                {players.map((p) => (
                  <span
                    key={p.playerId}
                    className={
                      answeredModelIds.has(`user:${p.playerId}`)
                        ? "text-green-600"
                        : undefined
                    }
                  >
                    {p.displayName}
                    {answeredModelIds.has(`user:${p.playerId}`)
                      ? " ✓"
                      : " ⟳"}{" "}
                  </span>
                ))}
              </>
            )}
          </div>

          {game.status === "voting" && (
            <div className="mb-4 text-xs text-muted-foreground">
              <span>Voter: </span>
              {expectedVoters.length === 0 && players.length === 0 ? (
                <span>—</span>
              ) : (
                <>
                  {expectedVoters.map((m) => {
                    const voted = votedVoterIds.has(`model:${m}`)
                    return (
                      <span key={m} className={voted ? "text-green-600" : undefined}>
                        {lookupModelName(m)}
                        {voted ? " ✓" : " ⟳"}{" "}
                      </span>
                    )
                  })}
                  {players.map((p) => {
                    const voted = votedVoterIds.has(`user:${p.playerId}`)
                    return (
                      <span key={p.playerId} className={voted ? "text-green-600" : undefined}>
                        {p.displayName}
                        {voted ? " ✓" : " ⟳"}{" "}
                      </span>
                    )
                  })}
                </>
              )}
            </div>
          )}

          {(game.status === "responding" || game.status === "voting") && (
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {game.status === "responding" && (
                  <>
                    Antworten: {submittedAIs.length + humanPlayersWithAnswers.length}
                    /{expectedAIPlayers.length + players.length}
                    {failedAIs.length > 0 && (
                      <span className="ml-2 text-destructive">
                        ({failedAIs.length} fehlgeschlagen)
                      </span>
                    )}
                  </>
                )}
                {game.status === "voting" && (
                  <>
                    Votes: {votedAIVoters.length + humanVotersWhoVoted.length}/{expectedVoters.length + players.length}
                  </>
                )}
              </span>
              {timerDeadline != null && <CountdownTimer deadline={timerDeadline} />}
            </div>
          )}

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
                      isFlipped={cardsFlipped}
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

        {/* Right side: Join panel */}
        <div className="flex w-56 flex-col items-center justify-center gap-4 border-l p-6">
          <div className="mb-2">
            <QRCode
              url={`${origin}/games/${gameId}/play`}
              size={160}
            />
          </div>
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
