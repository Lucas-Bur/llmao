import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useEffect, useMemo, useState } from "react"

import { BlackCard } from "@/components/cah/black-card"
import { WhiteCard } from "@/components/cah/white-card"
import { AVAILABLE_MODELS, lookupModelName } from "@/constants/models"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"

function getPlayerId(): string {
  let id = localStorage.getItem("llmao_player_id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("llmao_player_id", id)
  }
  return id
}

export const Route = createFileRoute("/games/$gameId/play")({
  component: RouteComponent,
})

function RouteComponent() {
  const { gameId } = Route.useParams() as { gameId: string }
  const playerId = useMemo(() => getPlayerId(), [])

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("llmao_player_name") ?? ""
  )
  const [nameSubmitted, setNameSubmitted] = useState(
    () => !!localStorage.getItem("llmao_player_name")
  )
  const [hasUserVoted, setHasUserVoted] = useState(false)
  const [hasUserSubmittedCard, setHasUserSubmittedCard] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>()

  const { data: gameObject } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> })
  )
  const { data: players } = useSuspenseQuery(
    convexQuery(api.players.listPlayers, { gameId: gameId as Id<"games"> })
  )
  const { mutateAsync: joinGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.players.joinGame),
  })
  const { mutateAsync: startGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.startGame),
  })
  const { mutateAsync: submitUserAnswerMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserAnswer),
  })
  const { mutateAsync: submitUserVoteMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserVote),
  })
  const { mutateAsync: updateGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.updateGame),
  })

  if (!gameObject) {
    return <div className="p-6 text-sm text-muted-foreground">Spiel wird geladen...</div>
  }
  const game = gameObject.game
  const prompt = gameObject.prompt
  const allAnswers = gameObject.answers ?? []
  const isHost = players.length > 0 && players[0].isHost && game.status === "created"

  useEffect(() => {
    if (nameSubmitted) {
      joinGameMutation({ gameId: gameId as Id<"games">, playerId, displayName })
    }
  }, [nameSubmitted])

  const allCardsFlipped = useMemo(
    () => allAnswers.length > 0 && allAnswers.every((a) => flippedCards[a._id]),
    [allAnswers, flippedCards]
  )



  // Host setup UI
  if (isHost) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-lg font-semibold">
          Raum: {useUniqueNameFromId(gameId)}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Konfiguriere das Spiel, bevor es losgeht
        </p>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">Sprache</h2>
          <Select
            value={game.language}
            onValueChange={async (v) =>
              await updateGameMutation({
                gameId: gameId as Id<"games">,
                language: v,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">Prompt-Modell</h2>
          <Select
            value={game.promptModel}
            onValueChange={async (v) =>
              await updateGameMutation({
                gameId: gameId as Id<"games">,
                promptModel: v,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((m) => (
                <SelectItem key={m} value={m}>
                  {lookupModelName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">Spieler (KI)</h2>
          {AVAILABLE_MODELS.map((model) => (
            <div key={model} className="flex items-center gap-2 py-1">
              <Checkbox
                id={`player-${model}`}
                checked={game.playerModels.includes(model)}
                onCheckedChange={async (checked) => {
                  const updated = checked
                    ? [...game.playerModels, model]
                    : game.playerModels.filter((m) => m !== model)
                  await updateGameMutation({
                    gameId: gameId as Id<"games">,
                    playerModels: updated,
                  })
                }}
              />
              <Label htmlFor={`player-${model}`} className="text-sm">
                {lookupModelName(model)}
              </Label>
            </div>
          ))}
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">Voter (KI)</h2>
          {AVAILABLE_MODELS.map((model) => (
            <div key={model} className="flex items-center gap-2 py-1">
              <Checkbox
                id={`voter-${model}`}
                checked={game.voterModels.includes(model)}
                onCheckedChange={async (checked) => {
                  const updated = checked
                    ? [...game.voterModels, model]
                    : game.voterModels.filter((m) => m !== model)
                  await updateGameMutation({
                    gameId: gameId as Id<"games">,
                    voterModels: updated,
                  })
                }}
              />
              <Label htmlFor={`voter-${model}`} className="text-sm">
                {lookupModelName(model)}
              </Label>
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium">Weiterschalten</h2>
          <Select
            value={game.advanceMode}
            onValueChange={async (v) =>
              await updateGameMutation({
                gameId: gameId as Id<"games">,
                advanceMode: v as "all_answered" | "timer" | "manual",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_answered">
                Sobald alle KIs geantwortet haben
              </SelectItem>
              <SelectItem value="timer">Nach Zeitlimit</SelectItem>
              <SelectItem value="manual">Manuell (nur Host)</SelectItem>
            </SelectContent>
          </Select>
          {game.advanceMode === "timer" && (
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground">
                Zeitlimit (Sekunden)
              </Label>
              <Input
                type="number"
                value={game.respondTimeLimit ?? 60}
                onChange={async (e) =>
                  await updateGameMutation({
                    gameId: gameId as Id<"games">,
                    respondTimeLimit: Number(e.target.value),
                    voteTimeLimit: Number(e.target.value),
                  })
                }
              />
            </div>
          )}
        </section>

        <Button
          className="w-full"
          disabled={game.playerModels.length === 0}
          onClick={async () => {
            await startGameMutation({ gameId: gameId as Id<"games"> })
          }}
        >
          Spiel starten
        </Button>
      </div>
    )
  }

  // Name input screen
  if (!nameSubmitted) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h1 className="mb-2 text-lg font-semibold">
          {useUniqueNameFromId(gameId)}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Gib deinen Namen ein, um mitzuspielen
        </p>
        <Input
          placeholder="Dein Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mb-4"
        />
        <Button
          className="w-full"
          disabled={!displayName.trim()}
          onClick={() => {
            localStorage.setItem("llmao_player_name", displayName.trim())
            setNameSubmitted(true)
          }}
        >
          Beitreten
        </Button>
      </div>
    )
  }

  // Playing UI — prompt, answer, vote
  return (
    <div className="mx-auto max-w-lg p-4">
      <p className="mb-2 text-xs text-muted-foreground">
        {useUniqueNameFromId(gameId)} — {displayName}
      </p>

      {/* Prompt */}
      <div className="mb-4">
        <BlackCard
          text={prompt?.text}
          model={prompt?.model}
          isLoading={game.status === "prompting"}
          showModel={game.status !== "created"}
        />
      </div>

      {/* Submit answer */}
      {game.status === "responding" && !hasUserSubmittedCard && (
        <AnswerInput
          onSubmit={async (text) => {
            await submitUserAnswerMutation({
              gameId: gameId as Id<"games">,
              text,
              authorId: `user:${playerId}`,
            })
            setHasUserSubmittedCard(true)
          }}
        />
      )}
      {game.status === "responding" && hasUserSubmittedCard && (
        <p className="text-sm text-muted-foreground">Antwort eingereicht!</p>
      )}

      {/* Vote */}
      {game.status === "voting" && !hasUserVoted && (
        <div className="space-y-2">
          {allAnswers.map((answer) => (
            <WhiteCard
              key={answer._id}
              id={answer._id}
              text={answer.text}
              model={answer.model}
              isFlipped={flippedCards[answer._id] || false}
              isSelected={selectedCardId === answer._id}
              isLoading={false}
              hasVoted={false}
              canSelect={allCardsFlipped}
              onFlip={() =>
                setFlippedCards((prev) => ({
                  ...prev,
                  [answer._id]: true,
                }))
              }
              onSelect={() =>
                setSelectedCardId((prev) =>
                  prev === answer._id ? undefined : answer._id
                )
              }
            />
          ))}
          {selectedCardId && (
            <Button
              className="mt-4 w-full"
              onClick={async () => {
                await submitUserVoteMutation({
                  gameId: gameId as Id<"games">,
                  voterId: `user:${playerId}`,
                  answerId: selectedCardId as Id<"answers">,
                })
                setHasUserVoted(true)
              }}
            >
              Abstimmen
            </Button>
          )}
        </div>
      )}
      {game.status === "voting" && hasUserVoted && (
        <p className="text-sm text-muted-foreground">Abgestimmt!</p>
      )}

      {/* Done */}
      {(game.status === "resolved" || game.status === "locked") && (
        <p className="text-sm text-muted-foreground">
          Spiel beendet! Sieh dir die Ergebnisse auf dem Bildschirm an.
        </p>
      )}
    </div>
  )
}

function AnswerInput({
  onSubmit,
}: Readonly<{ onSubmit: (text: string) => Promise<void> }>) {
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!text.trim() || submitting) return
        setSubmitting(true)
        await onSubmit(text.trim())
      }}
      className="flex gap-2"
    >
      <Input
        placeholder="Deine Antwort..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitting}
      />
      <Button type="submit" disabled={!text.trim() || submitting}>
        Senden
      </Button>
    </form>
  )
}
