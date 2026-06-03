import { createFileRoute } from "@tanstack/react-router"
import { Pencil, Users } from "lucide-react"
import { Suspense, useState } from "react"

import { BlackCard } from "@/components/cah/black-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { usePlayGame } from "@/hooks/use-play-game"
import { AnsweringScreen } from "@/components/cah/screens/answering"
import { HostConfigScreen } from "@/components/cah/screens/host-config"
import { VotingScreen } from "@/components/cah/screens/voting"

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
  const game = usePlayGame(gameId)

  const [displayName, setDisplayName] = useState(game.globalName)
  const [nameSubmitted, setNameSubmitted] = useState(() => !!game.globalName)
  const [isEditingName, setIsEditingName] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [hasUserVoted, setHasUserVoted] = useState(false)
  const [hasUserSubmittedCard, setHasUserSubmittedCard] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>()

  const handleJoin = async () => {
    setJoinError(null)
    try {
      await game.joinGame({
        gameId: game.gameId,
        playerId: game.playerId,
        displayName: displayName.trim(),
      })
      game.setGlobalName(displayName.trim())
      setNameSubmitted(true)
      setIsEditingName(false)
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const handleNameChange = async () => {
    setJoinError(null)
    try {
      await game.setDisplayName({
        gameId: game.gameId,
        playerId: game.playerId,
        displayName: displayName.trim(),
      })
      game.setGlobalName(displayName.trim())
      setIsEditingName(false)
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const playerHeader = (
    <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
      {game.roomName} —{" "}
      <span className="font-medium text-foreground">{displayName}</span>
      {game.isHost && (
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

  const playerList = (
    <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
      <Users className="h-3 w-3" />
      {game.allPlayers.length === 0 ? (
        <span>—</span>
      ) : (
        game.allPlayers.map((p, i) => (
          <span key={p.playerId}>
            {i > 0 && <span className="mx-1">·</span>}
            <span
              className={
                p.playerId === game.playerId
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

  // ───── Name Input / Edit Screen ─────

  if (!nameSubmitted || isEditingName) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h1 className="mb-2 text-lg font-semibold">{game.roomName}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {isEditingName ? "Change your name" : "Enter your name to join"}
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
          disabled={!displayName.trim() || game.isJoining}
          onClick={isEditingName ? handleNameChange : handleJoin}
        >
          {isEditingName ? "Save" : "Join"}
        </Button>
      </div>
    )
  }

  // ───── Non-Host Waiting Screen ─────

  if (game.game.status === "created" && !game.isHost) {
    return (
      <div className="mx-auto max-w-lg p-4">
        {playerHeader}
        <div className="flex h-48 flex-col items-center justify-center gap-3 border border-dashed">
          <p className="text-sm text-muted-foreground">
            Waiting for host...
          </p>
          <p className="text-xs text-muted-foreground">
            {game.allPlayers.find((p) => p.isHost)?.displayName ??
              "The host"}{" "}
            is configuring the game
          </p>
        </div>
        {playerList}
      </div>
    )
  }

  // ───── Host Config Screen ─────

  if (game.game.status === "created" && game.isHost) {
    return (
      <HostConfigScreen
        gameId={game.gameId}
        game={game.game}
        roomName={game.roomName}
        displayName={displayName}
        allPlayers={game.allPlayers}
        playerId={game.playerId}
        onEditName={() => setIsEditingName(true)}
        updateGame={game.updateGame}
        startGame={game.startGame}
        isStarting={game.isStarting}
      />
    )
  }

  // ───── Playing Screens ─────

  return (
    <div className="mx-auto max-w-lg p-4">
      {playerHeader}

      <div className="mb-4">
        <Badge variant="secondary" className="rounded-none text-xs">
          {STATUS_LABEL[game.game.status] ?? game.game.status}
        </Badge>
      </div>

      {playerList}

      <div className="mb-4">
        <BlackCard
          text={game.prompt?.text}
          model={game.prompt?.model}
          isLoading={game.game.status === "prompting"}
          showModel
        />
      </div>

      {game.game.status === "prompting" && (
        <p className="text-sm text-muted-foreground">
          The prompt is being generated by an AI model...
        </p>
      )}

      {game.game.status === "responding" && (
        <AnsweringScreen
          gameId={game.gameId}
          hasSubmitted={hasUserSubmittedCard}
          onSubmit={(_, text, authorId) => game.submitAnswer({ gameId: game.gameId, text, authorId })}
          onSubmittedChange={setHasUserSubmittedCard}
          isSubmitting={game.isSubmitting}
          respondParticipants={game.respondParticipants}
          timerDeadline={game.timerDeadline}
          answerCount={game.allAnswers.length}
          isHost={game.isHost}
          playerId={game.playerId}
          advanceToVoting={game.advanceToVoting}
        />
      )}

      {game.game.status === "voting" && (
        <VotingScreen
          gameId={game.gameId}
          hasVoted={hasUserVoted}
          onVotedChange={setHasUserVoted}
          selectedCardId={selectedCardId}
          onSelectedCardChange={setSelectedCardId}
          isVoting={game.isVoting}
          voteParticipants={game.voteParticipants}
          timerDeadline={game.timerDeadline}
          otherAnswers={game.otherAnswers}
          allPlayers={game.allPlayers}
          voteCounts={game.voteCounts}
          voterNames={game.voterNames}
          isHost={game.isHost}
          playerId={game.playerId}
          submitVote={game.submitVote}
          finalizeGame={game.finalizeGame}
        />
      )}

      {(game.game.status === "resolved" || game.game.status === "locked") && (
        <div className="space-y-3">
          <div className="rounded-none border bg-muted p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              Game over!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              View the results on the big screen.
            </p>
          </div>
          {game.isHost && (
            <Button
              className="w-full rounded-none"
              disabled={game.isResetting}
              onClick={async () => {
                await game.resetGame({ gameId: game.gameId })
              }}
            >
              {game.isResetting ? "Resetting..." : "Next Round →"}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
