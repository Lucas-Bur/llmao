import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { Pencil, Users } from "lucide-react"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"

import { BlackCard } from "@/components/cah/black-card"
import { WhiteCard } from "@/components/cah/white-card"
import { AVAILABLE_MODELS, lookupModelName } from "@/constants/models"
import { Badge } from "@/components/ui/badge"
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
import { useUser } from "@/hooks/use-user"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"
import { getPlayerId } from "@/lib/storage"

const STATUS_LABEL: Record<string, string> = {
  prompting: "Prompt wird generiert...",
  responding: "Antworten",
  voting: "Abstimmung",
  resolved: "Spiel beendet",
  locked: "Spiel beendet",
}

export const Route = createFileRoute("/games/$gameId/play")({
  component: RouteWithSuspense,
})

function RouteWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Spiel wird geladen...
        </div>
      }
    >
      <RouteComponent />
    </Suspense>
  )
}

function RouteComponent() {
  const { gameId } = Route.useParams() as { gameId: string }
  const playerId = useMemo(() => getPlayerId(), [])
  const roomName = useUniqueNameFromId(gameId)
  const { name: globalName, setName: setGlobalName } = useUser()

  const [displayName, setDisplayName] = useState(globalName)
  const [nameSubmitted, setNameSubmitted] = useState(() => !!globalName)
  const [isEditingName, setIsEditingName] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [hasUserVoted, setHasUserVoted] = useState(false)
  const [hasUserSubmittedCard, setHasUserSubmittedCard] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>()

  const { data: gameObject } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> })
  )
  const { data: allPlayers } = useSuspenseQuery(
    convexQuery(api.players.listPlayers, { gameId: gameId as Id<"games"> })
  )

  const { mutateAsync: joinGameMutation, isPending: isJoining } = useMutation({
    mutationFn: useConvexMutation(api.players.joinGame),
  })
  const { mutateAsync: setDisplayNameMutation } = useMutation({
    mutationFn: useConvexMutation(api.players.setDisplayName),
  })
  const { mutateAsync: startGameMutation, isPending: isStarting } = useMutation(
    {
      mutationFn: useConvexMutation(api.games.startGame),
    }
  )
  const { mutateAsync: submitUserAnswerMutation, isPending: isSubmitting } =
    useMutation({
      mutationFn: useConvexMutation(api.games.submitUserAnswer),
    })
  const { mutateAsync: submitUserVoteMutation, isPending: isVoting } =
    useMutation({
      mutationFn: useConvexMutation(api.games.submitUserVote),
    })
  const { mutateAsync: updateGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.updateGame),
  })

  if (!gameObject) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Spiel wird geladen...
      </div>
    )
  }
  const game = gameObject.game
  const prompt = gameObject.prompt
  const allAnswers = gameObject.answers ?? []
  const currentPlayer = allPlayers.find((p) => p.playerId === playerId)
  const isHost = currentPlayer?.isHost === true && game.status === "created"

  // Rejoin on mount if already registered
  useEffect(() => {
    if (nameSubmitted && !isEditingName) {
      joinGameMutation({
        gameId: gameId as Id<"games">,
        playerId,
        displayName,
      }).catch(() => {
        // silent — handle on next interaction
      })
    }
  }, [])

  const handleJoin = async () => {
    setJoinError(null)
    try {
      await joinGameMutation({
        gameId: gameId as Id<"games">,
        playerId,
        displayName: displayName.trim(),
      })
      setGlobalName(displayName.trim())
      setNameSubmitted(true)
      setIsEditingName(false)
    } catch (err: unknown) {
      setJoinError(
        err instanceof Error ? err.message : "Unbekannter Fehler"
      )
    }
  }

  const handleNameChange = async () => {
    setJoinError(null)
    try {
      await setDisplayNameMutation({
        gameId: gameId as Id<"games">,
        playerId,
        displayName: displayName.trim(),
      })
      setGlobalName(displayName.trim())
      setIsEditingName(false)
    } catch (err: unknown) {
      setJoinError(
        err instanceof Error ? err.message : "Unbekannter Fehler"
      )
    }
  }

  const allCardsFlipped = useMemo(
    () =>
      allAnswers.length > 0 && allAnswers.every((a) => flippedCards[a._id]),
    [allAnswers, flippedCards]
  )

  const flipAll = useCallback(() => {
    setFlippedCards((prev) => {
      const next = { ...prev }
      for (const answer of allAnswers) {
        next[answer._id] = true
      }
      return next
    })
  }, [allAnswers])

  // ───── Name Input / Edit Screen ─────

  if (!nameSubmitted || isEditingName) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h1 className="mb-2 text-lg font-semibold">{roomName}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {isEditingName
            ? "Ändere deinen Namen"
            : "Gib deinen Namen ein, um mitzuspielen"}
        </p>
        <Input
          placeholder="Dein Name"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
            setJoinError(null)
          }}
          className="mb-4"
        />
        {joinError && (
          <p className="mb-4 text-sm text-destructive">{joinError}</p>
        )}
        <Button
          className="w-full"
          disabled={!displayName.trim() || isJoining}
          onClick={isEditingName ? handleNameChange : handleJoin}
        >
          {isEditingName ? "Speichern" : "Beitreten"}
        </Button>
      </div>
    )
  }

  // ───── Player Info Header ─────

  const playerHeader = (
    <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
      {roomName} —{" "}
      <span className="font-medium text-foreground">{displayName}</span>
      {currentPlayer?.isHost && (
        <Badge variant="outline" className="text-[10px] leading-none px-1.5 py-0">
          Host
        </Badge>
      )}
      <button
        type="button"
        onClick={() => setIsEditingName(true)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Namen ändern"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </p>
  )

  // ───── Player List ─────

  const playerList = (
    <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
      <Users className="h-3 w-3" />
      {allPlayers.length === 0 ? (
        <span>—</span>
      ) : (
        allPlayers.map((p, i) => (
          <span key={p.playerId}>
            {i > 0 && <span className="mx-1">·</span>}
            <span
              className={
                p.playerId === playerId
                  ? "font-medium text-foreground"
                  : undefined
              }
            >
              {p.displayName}
              {p.isHost && " 👑"}
            </span>
          </span>
        ))
      )}
    </div>
  )

  // ───── Non-Host Waiting Screen ─────

  if (game.status === "created" && !isHost) {
    return (
      <div className="mx-auto max-w-lg p-4">
        {playerHeader}
        <div className="flex h-48 flex-col items-center justify-center gap-3 border border-dashed">
          <p className="text-sm text-muted-foreground">
            Warte auf den Host...
          </p>
          <p className="text-xs text-muted-foreground">
            {allPlayers.find((p) => p.isHost)?.displayName ??
              "Der Host"}{" "}
            konfiguriert das Spiel
          </p>
        </div>
        {playerList}
      </div>
    )
  }

  // ───── Host Config Screen ─────

  if (isHost) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{roomName}</h1>
            <p className="text-xs text-muted-foreground">
              {displayName}{" "}
              <Badge
                variant="outline"
                className="text-[10px] leading-none px-1.5 py-0"
              >
                Host
              </Badge>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Namen ändern"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        {playerList}

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
          <h2 className="mb-2 text-sm font-medium">
            KI-Spieler
          </h2>
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
          <p className="mt-1 text-xs text-muted-foreground">
            + Du kannst als Mensch mitspielen
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">KI-Voter</h2>
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
          disabled={game.playerModels.length === 0 || isStarting}
          onClick={async () => {
            await startGameMutation({ gameId: gameId as Id<"games"> })
          }}
        >
          {isStarting ? "Wird gestartet..." : "Spiel starten"}
        </Button>
      </div>
    )
  }

  // ───── Playing Screens ─────

  return (
    <div className="mx-auto max-w-lg p-4">
      {playerHeader}

      {/* Status badge */}
      <div className="mb-4">
        <Badge variant="secondary" className="rounded-none text-xs">
          {STATUS_LABEL[game.status] ?? game.status}
        </Badge>
      </div>

      {playerList}

      {/* Prompt */}
      <div className="mb-4">
        <BlackCard
          text={prompt?.text}
          model={prompt?.model}
          isLoading={game.status === "prompting"}
          showModel
        />
      </div>

      {/* Promting: waiting */}
      {game.status === "prompting" && (
        <p className="text-sm text-muted-foreground">
          Der Prompt wird von einem KI-Modell generiert...
        </p>
      )}

      {/* Responding: answer form */}
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
          isSubmitting={isSubmitting}
        />
      )}
      {game.status === "responding" && hasUserSubmittedCard && (
        <div className="rounded-none border border-border bg-muted p-4 text-center">
          <p className="text-sm font-medium text-foreground">
            Antwort eingereicht!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Warte auf die anderen Spieler...
          </p>
        </div>
      )}

      {/* Voting: cards */}
      {game.status === "voting" && !hasUserVoted && (
        <div className="space-y-2">
          {/* Flip all button */}
          {!allCardsFlipped && allAnswers.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={flipAll}
              className="mb-2 w-full rounded-none text-xs"
            >
              Alle aufdecken
            </Button>
          )}

          {allAnswers.map((answer) => {
            const isOwnCard = answer.model === `user:${playerId}`
            return (
              <WhiteCard
                key={answer._id}
                id={answer._id}
                text={answer.text}
                model={
                  answer.model.startsWith("user:")
                    ? allPlayers.find(
                        (p) => `user:${p.playerId}` === answer.model
                      )?.displayName ?? answer.model
                    : lookupModelName(answer.model)
                }
                isFlipped={
                  isOwnCard ? true : flippedCards[answer._id] || false
                }
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
            )
          })}

          {allCardsFlipped && !selectedCardId && (
            <p className="text-center text-xs text-muted-foreground">
              Wähle die lustigste Antwort aus
            </p>
          )}

          {selectedCardId && (
            <Button
              className="mt-4 w-full rounded-none"
              disabled={isVoting}
              onClick={async () => {
                await submitUserVoteMutation({
                  gameId: gameId as Id<"games">,
                  voterId: `user:${playerId}`,
                  answerId: selectedCardId as Id<"answers">,
                })
                setHasUserVoted(true)
              }}
            >
              {isVoting ? "Wird abgestimmt..." : "Abstimmen"}
            </Button>
          )}
        </div>
      )}
      {game.status === "voting" && hasUserVoted && (
        <div className="rounded-none border border-border bg-muted p-4 text-center">
          <p className="text-sm font-medium text-foreground">
            Abgestimmt!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Warte auf die Ergebnisse...
          </p>
        </div>
      )}

      {/* Done */}
      {(game.status === "resolved" || game.status === "locked") && (
        <div className="rounded-none border border-border bg-muted p-4 text-center">
          <p className="text-sm font-medium text-foreground">
            Spiel beendet!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sieh dir die Ergebnisse auf dem großen Bildschirm an.
          </p>
        </div>
      )}
    </div>
  )
}

// ───── Answer Input Component ─────

function AnswerInput({
  onSubmit,
  isSubmitting,
}: Readonly<{
  onSubmit: (text: string) => Promise<void>
  isSubmitting: boolean
}>) {
  const [text, setText] = useState("")

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!text.trim() || isSubmitting) return
        await onSubmit(text.trim())
      }}
      className="flex gap-2"
    >
      <Input
        placeholder="Deine Antwort..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isSubmitting}
        className="rounded-none"
      />
      <Button
        type="submit"
        disabled={!text.trim() || isSubmitting}
        className="rounded-none"
      >
        {isSubmitting ? "Sende..." : "Senden"}
      </Button>
    </form>
  )
}
