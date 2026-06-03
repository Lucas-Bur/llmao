import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { Pencil, Users } from "lucide-react"
import { Suspense, useEffect, useMemo, useState } from "react"

import { BlackCard } from "@/components/cah/black-card"
import { PhaseProgress } from "@/components/cah/phase-progress"
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

import { useGameProgress } from "@/hooks/use-game-progress"
import { getPlayerId } from "@/lib/storage"

const STATUS_LABEL: Record<string, string> = {
  created: "Configuration",
  prompting: "Generating prompt...",
  responding: "Responding",
  voting: "Voting",
  resolved: "Result",
  locked: "Finished",
}

export const Route = createFileRoute("/games/$gameId/play")({
  component: RouteWithSuspense,
})

function RouteWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading game...
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
  const { mutateAsync: advanceToVotingMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.advanceToVoting),
  })
  const { mutateAsync: triggerFinalizeGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerFinalizeGame),
  })
  const { mutateAsync: resetGameMutation, isPending: isResettingGame } =
    useMutation({
      mutationFn: useConvexMutation(api.games.resetGame),
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

  const {
    voteCounts,
    voterNames,
    timerDeadline,
    respondParticipants,
    voteParticipants,
  } = useGameProgress({
    game,
    answers: allAnswers,
    votes: gameObject.votes ?? [],
    players: allPlayers,
    llmEvents: gameObject.llmEvents ?? [],
    playerId,
  })

  const currentPlayer = allPlayers.find((p) => p.playerId === playerId)
  const isHost = currentPlayer?.isHost === true

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
        err instanceof Error ? err.message : "Unknown error"
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
        err instanceof Error ? err.message : "Unknown error"
      )
    }
  }

  const otherAnswers = useMemo(
    () => allAnswers.filter((a) => a.model !== `user:${playerId}`),
    [allAnswers, playerId]
  )

  // ───── Name Input / Edit Screen ─────

  if (!nameSubmitted || isEditingName) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h1 className="mb-2 text-lg font-semibold">{roomName}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {isEditingName
          ? "Change your name"
          : "Enter your name to join"}
        </p>
        <Input
          placeholder="Your name"
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
          {isEditingName ? "Save" : "Join"}
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
        aria-label="Change name"
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
            Waiting for host...
          </p>
          <p className="text-xs text-muted-foreground">
            {allPlayers.find((p) => p.isHost)?.displayName ??
              "The host"}{" "}
            is configuring the game
          </p>
        </div>
        {playerList}
      </div>
    )
  }

  // ───── Host Config Screen ─────

  if (game.status === "created" && isHost) {
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
        aria-label="Change name"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        {playerList}

        <p className="mb-6 text-sm text-muted-foreground">
          Configure the game before it starts
        </p>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">Language</h2>
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
          <h2 className="mb-2 text-sm font-medium">Prompt Model</h2>
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
            AI Players
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
            + You can play as a human
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium">AI Voters</h2>
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
          <h2 className="mb-2 text-sm font-medium">Advance Mode</h2>
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
                When all AIs have responded
              </SelectItem>
              <SelectItem value="timer">After time limit</SelectItem>
              <SelectItem value="manual">Manual (host only)</SelectItem>
            </SelectContent>
          </Select>
          {game.advanceMode === "timer" && (
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground">
                Time limit (seconds)
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
          {isStarting ? "Starting..." : "Start Game"}
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
          The prompt is being generated by an AI model...
        </p>
      )}

      {/* ───── Responding ───── */}
      {game.status === "responding" && (
        <div className="space-y-3">
          <PhaseProgress
            label="Answers"
            participants={respondParticipants}
            timerDeadline={timerDeadline}
          />

          {/* Answer input or confirmation */}
          {!hasUserSubmittedCard ? (
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
          ) : (
            <div className="rounded-none border bg-muted p-3 text-center">
              <p className="text-sm font-medium text-foreground">
                Answer submitted!
              </p>
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Skip phase? The game will advance for all players immediately, possibly before all answers are submitted.
              </p>
              <Button
                size="sm"
                className="w-full rounded-none text-xs"
                disabled={allAnswers.length < 2}
                onClick={async () => {
                  try {
                    await advanceToVotingMutation({
                      gameId: gameId as Id<"games">,
                    })
                  } catch {
                    // validation errors shown via toast in future
                  }
                }}
              >
                To Voting →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ───── Voting ───── */}
      {game.status === "voting" && (
        <div className="space-y-3">
          <PhaseProgress
            label="Votes"
            participants={voteParticipants}
            timerDeadline={timerDeadline}
          />

          {/* Card vote UI — all face-up, own card hidden */}
          <div className="space-y-2">
            {otherAnswers.map((answer) => (
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
                isFlipped
                isSelected={selectedCardId === answer._id}
                isLoading={false}
                hasVoted={game.status === "resolved" || game.status === "locked"}
                voteCount={voteCounts[answer._id] ?? 0}
                voterNames={voterNames[answer._id]}
                canSelect={!hasUserVoted}
                onFlip={() => {}}
                onSelect={() => {
                  if (hasUserVoted) return
                  setSelectedCardId((prev) =>
                    prev === answer._id ? undefined : answer._id
                  )
                }}
              />
            ))}

            {!hasUserVoted && !selectedCardId && (
              <p className="text-center text-xs text-muted-foreground">
                Pick the funniest answer
              </p>
            )}

            {!hasUserVoted && selectedCardId && (
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
                {isVoting ? "Voting..." : "Vote"}
              </Button>
            )}
          </div>

          {/* Host controls */}
          {isHost && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Skip phase? The game will be finalized for all players immediately, possibly before everyone has voted.
              </p>
              <Button
                size="sm"
                className="w-full rounded-none text-xs"
                onClick={async () => {
                  await triggerFinalizeGameMutation({
                    gameId: gameId as Id<"games">,
                  })
                }}
              >
                Finalize →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ───── Done ───── */}
      {(game.status === "resolved" || game.status === "locked") && (
        <div className="space-y-3">
          <div className="rounded-none border bg-muted p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              Game over!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              View the results on the big screen.
            </p>
          </div>
          {isHost && (
            <Button
              className="w-full rounded-none"
              disabled={isResettingGame}
              onClick={async () => {
                await resetGameMutation({
                  gameId: gameId as Id<"games">,
                })
              }}
            >
              {isResettingGame ? "Resetting..." : "Next Round →"}
            </Button>
          )}
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
        placeholder="Your answer..."
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
        {isSubmitting ? "Sending..." : "Send"}
      </Button>
    </form>
  )
}
