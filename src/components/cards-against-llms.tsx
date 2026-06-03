import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { ChevronRight, Smartphone, Smile } from "lucide-react"

import { BlackCard } from "./cah/black-card"
import { GameStepper } from "./cah/game-stepper"
import { WhiteCard } from "./cah/white-card"

import { Button } from "@/components/ui/button"
import { lookupModelName } from "@/constants/models"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"

export default function TVDisplay({
  gameId,
}: Readonly<{ gameId: string }>) {
  const navigate = useNavigate()
  const { data: gameObject } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> })
  )

  if (!gameObject) {
    return <div className="p-6 text-sm text-muted-foreground">Spiel wird geladen...</div>
  }
  const game = gameObject.game
  const prompt = gameObject.prompt
  const allAnswers = gameObject.answers ?? []
  const votes = gameObject.votes ?? []
  const players = gameObject.players ?? []

  const voteCounts: Record<string, number> = {}
  const voterNames: Record<string, Array<string>> = {}
  for (const answer of allAnswers) {
    voteCounts[answer._id] = 0
    voterNames[answer._id] = []
  }
  for (const vote of votes) {
    voteCounts[vote.answerId] = (voteCounts[vote.answerId] || 0) + 1
    const name = vote.voterId.replace("model:", "")
    voterNames[vote.answerId].push(name)
  }

  const statusLabel: Record<string, string> = {
    created: "Konfiguration läuft...",
    prompting: "Prompt wird generiert...",
    responding: "Antworten werden gesammelt...",
    voting: "Abstimmung läuft...",
    resolved: "Spiel beendet",
    locked: "Spiel beendet",
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-(--header-height) items-center px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center border">
                <Smile className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">LLMAO</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link
              to="/games"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Alle Spiele
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{useUniqueNameFromId(gameId)}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {statusLabel[game.status] ?? game.status}
            </p>
            <GameStepper status={game.status} />
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            Spieler:{" "}
            {players.map((p) => p.displayName).join(", ") ||
              "Noch niemand da — scanne den QR-Code!"}
          </p>

          <p className="mb-1 text-xs text-muted-foreground">
            Prompt-Modell: {lookupModelName(game.promptModel)}
          </p>

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
          {game.status === "prompting" && (
            <div className="flex h-56 items-center justify-center border border-dashed">
              <p className="text-sm text-muted-foreground">
                Prompt wird generiert...
              </p>
            </div>
          )}

          {(game.status === "responding" ||
            game.status === "voting" ||
            game.status === "resolved" ||
            game.status === "locked") && (
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
                      isFlipped
                      isSelected={false}
                      isLoading={false}
                      voteCount={voteCounts[answer._id]}
                      voterNames={voterNames[answer._id]}
                      hasVoted={false}
                      canSelect={false}
                      onFlip={() => {}}
                      onSelect={() => {}}
                    />
                  ))}
            </div>
          )}

          {(game.status === "resolved" || game.status === "locked") && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Spiel beendet — ELO-Änderungen wurden berechnet
              </p>
            </div>
          )}
        </div>

        {/* Right side: Join panel */}
        <div className="flex w-56 flex-col items-center justify-center gap-4 border-l p-6">
          <div className="mb-2 h-36 w-36 bg-muted flex items-center justify-center text-[10px] text-muted-foreground text-center border">
            QR-CODE
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Scanne den Code mit deinem Handy
          </p>
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={() => navigate({ to: "/games/$gameId/play", params: { gameId } })}
          >
            <Smartphone className="h-4 w-4" />
            Jetzt beitreten
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Erster Besucher wird Host<br />
            und kann das Spiel konfigurieren
          </p>
        </div>
      </div>
    </div>
  )
}
