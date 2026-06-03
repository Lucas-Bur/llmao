import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "convex/_generated/api"
import type { Doc, Id } from "convex/_generated/dataModel"
import { Smartphone } from "lucide-react"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, type ReactNode } from "react"

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
import {
  sortByVotes,
  usePodiumReveal,
  PodiumCards,
  ResultBanner,
} from "./cah/result-podium"
import type { Participant } from "@/hooks/use-game-progress"

type ProgressData = {
  participants: Participant[]
  timerDeadline: number | undefined
}

function MainLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-6">
      {children}
    </div>
  )
}

function Sidebar({
  origin,
  gameId,
  progress,
}: {
  origin: string
  gameId: string
  progress?: {
    label: string
  } & ProgressData
}) {
  const navigate = useNavigate()

  return (
    <div className="flex w-56 flex-col gap-4 border-l p-4">
      {progress && (
        <PhaseProgress
          label={progress.label}
          variant="sidebar"
          participants={progress.participants}
          timerDeadline={progress.timerDeadline}
        />
      )}
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
  )
}

function VotingCardGrid({
  allAnswers,
  players,
}: {
  allAnswers: Doc<"answers">[]
  players: Doc<"players">[]
}) {
  if (allAnswers.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allAnswers.map((answer) => (
        <WhiteCard
          key={answer._id}
          id={answer._id}
          text={answer.text}
          model={resolveDisplayName(answer.model, players)}
          isFlipped
          isSelected={false}
          isLoading={false}
          hasVoted={false}
          canSelect={false}
          onFlip={() => {}}
          onSelect={() => {}}
        />
      ))}
    </div>
  )
}

function PodiumView({
  sorted,
  revealed,
  prompt,
}: {
  sorted: ReturnType<typeof sortByVotes>
  revealed: ReturnType<typeof usePodiumReveal>
  prompt: Doc<"prompts"> | null | undefined
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="flex w-full max-w-5xl items-stretch justify-center gap-10">
          <div className="flex w-64 shrink-0 self-stretch">
            <div className="flex w-full flex-col [&>div]:min-h-full [&>div]:h-full">
              <BlackCard
                text={prompt?.text}
                model={prompt?.model}
                isLoading={false}
                showModel
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <PodiumCards sorted={sorted} revealed={revealed} />
          </div>
        </div>
      </div>
      <ResultBanner sorted={sorted} revealed={revealed} />
    </div>
  )
}

export default function TVDisplay({
  gameId,
}: Readonly<{ gameId: string }>) {
  const navigate = useNavigate()
  const { setBreadcrumb } = useBreadcrumb()
  const roomName = useUniqueNameFromId(gameId)
  const { origin } = useRouter()

  const { data: gameObject, isLoading } = useQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> }),
  )

  useEffect(() => {
    setBreadcrumb(
      <Link
        to="/games"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        All Games
        <span className="ml-1 text-muted-foreground/50">/ {roomName}</span>
      </Link>,
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
  const isResolved = game.status === "resolved" || game.status === "locked"

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

  const sorted = isResolved
    ? sortByVotes(allAnswers, voteCounts, voterNames, players)
    : []
  const revealed = usePodiumReveal(game.status, sorted)

  const sidebarProgress = (() => {
    if (game.status === "responding") {
      return {
        label: "Answers" as const,
        participants: respondParticipants,
        timerDeadline,
      }
    }
    if (game.status === "voting") {
      return {
        label: "Voting" as const,
        participants: voteParticipants,
        timerDeadline,
      }
    }
    return undefined
  })()

  return (
    <div className="flex min-h-[calc(100svh-var(--header-height))] w-full overflow-x-hidden bg-background">
      <div className="flex min-w-0 flex-1">
        <MainLayout>
          <div className="mb-4 flex justify-center">
            <GameStepper status={game.status} />
          </div>

          {isResolved ? (
            <PodiumView sorted={sorted} revealed={revealed} prompt={prompt} />
          ) : (
            <>
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

              {game.status === "voting" && (
                <VotingCardGrid allAnswers={allAnswers} players={players} />
              )}
            </>
          )}
        </MainLayout>

        <Sidebar
          origin={origin ?? window.location.origin}
          gameId={gameId}
          progress={sidebarProgress}
        />
      </div>
    </div>
  )
}
