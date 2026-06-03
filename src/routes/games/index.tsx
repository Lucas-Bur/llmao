import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import { Suspense } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { lookupModelName } from "@/constants/models"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"
import { ONGOING_STATUSES, PAST_STATUSES, type SpielStatus } from "convex/spiel-lifecycle"

const STATUS_LABELS: Record<string, string> = {
  created: "Erstellt",
  prompting: "Prompt läuft",
  responding: "Antworten",
  voting: "Abstimmung",
  resolved: "Abgeschlossen",
  locked: "Final",
}

const STATUS_VARIANTS: Record<string, string> = {
  created: "outline",
  prompting: "secondary",
  responding: "secondary",
  voting: "outline",
  resolved: "default",
  locked: "default",
}

function relativeTime(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return "vor einer Minute"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} Minuten`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Stunden`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tagen`
}

export const Route = createFileRoute("/games/")({
  component: RouteWithSuspense,
})

function RouteWithSuspense() {
  return (
    <Suspense fallback={<GamesLoading />}>
      <RouteComponent />
    </Suspense>
  )
}

function GamesLoading() {
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">Lade Spiele...</p>
    </div>
  )
}

function RouteComponent() {
  const router = useRouter()

  const { mutateAsync: createGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.createGame),
  })

  const { data: ongoingGames } = useSuspenseQuery(
    convexQuery(api.games.listGamesByStatus, { statuses: [...ONGOING_STATUSES] })
  )

  const { data: pastGames } = useSuspenseQuery(
    convexQuery(api.games.listGamesByStatus, { statuses: [...PAST_STATUSES] })
  )

  const handleCreateGame = async () => {
    const newGameId = await createGameMutation({
      hostId: "user:current",
      playerModels: [
        "openai/gpt-4.1-mini",
        "google/gemini-2.5-flash",
      ],
      promptModel: "openai/gpt-4.1-mini",
      voterModels: [
        "google/gemini-2.5-flash-lite-preview-09-2025",
      ],
      language: "de",
      advanceMode: "all_answered",
    })
    await router.navigate({
      to: "/games/$gameId",
      params: { gameId: newGameId },
    })
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Spielübersicht</h1>
        <Button onClick={handleCreateGame}>Neues Spiel</Button>
      </div>

      {/* Ongoing Games */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Laufende Spiele
        </h2>
        {ongoingGames.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine laufenden Spiele
          </p>
        ) : (
          <div className="space-y-2">
            {ongoingGames.map((game) => (
              <GameCard key={game._id} game={game} />
            ))}
          </div>
        )}
      </section>

      {/* Past Games */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Vergangene Spiele
        </h2>
        {pastGames.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine vergangenen Spiele
          </p>
        ) : (
          <div className="space-y-2">
            {pastGames.map((game) => (
              <GameCard key={game._id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function GameCard({
  game,
}: Readonly<{
  game: {
    _id: string
    status: SpielStatus
    promptModel: string
    playerModels: Array<string>
    voterModels: Array<string>
    createdAt: number
  }
}>) {
  const router = useRouter()
  const name = useUniqueNameFromId(game._id)
  const variant = STATUS_VARIANTS[game.status] ?? "outline"
  const isOngoing = ONGOING_STATUSES.includes(game.status)

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          <Badge variant={variant as "default" | "secondary" | "outline"}>
            {STATUS_LABELS[game.status] ?? game.status}
          </Badge>
        </div>
        <CardDescription>
          Prompt: {lookupModelName(game.promptModel)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{game.playerModels.length} KI-Spieler</span>
          <span>{game.voterModels.length} Voter</span>
          <span>{relativeTime(game.createdAt)}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-none text-xs"
          onClick={() =>
            router.navigate({
              to: "/games/$gameId",
              params: { gameId: game._id },
            })
          }
        >
          📺 TV
        </Button>
        {isOngoing && (
          <Button
            size="sm"
            className="rounded-none text-xs"
            onClick={() =>
              router.navigate({
                to: "/games/$gameId/play",
                params: { gameId: game._id },
              })
            }
          >
            🎮 Spielen
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
