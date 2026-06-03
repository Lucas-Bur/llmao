import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import { ChevronRight, Smile } from "lucide-react"
import { Suspense } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { lookupModelName } from "@/constants/models"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"

const ONGOING_STATUSES = ["created", "prompting", "responding", "voting"]
const PAST_STATUSES = ["resolved", "locked"]

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
    <div className="min-h-screen bg-background p-6">
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
    convexQuery(api.games.listGamesByStatus, { statuses: ONGOING_STATUSES })
  )

  const { data: pastGames } = useSuspenseQuery(
    convexQuery(api.games.listGamesByStatus, { statuses: PAST_STATUSES })
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
    <div className="min-h-screen bg-background">
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
            <span className="text-sm text-muted-foreground">Alle Spiele</span>
          </div>
        </div>
      </header>

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
    </div>
  )
}

function GameCard({ game }: Readonly<{ game: { _id: string; status: string; promptModel: string; playerModels: Array<string>; voterModels: Array<string>; createdAt: number } }>) {
  const router = useRouter()
  const name = useUniqueNameFromId(game._id)
  const variant = STATUS_VARIANTS[game.status] ?? "outline"

  const handleClick = () => {
    router.navigate({ to: "/games/$gameId", params: { gameId: game._id } })
  }

  return (
    <Card
      size="sm"
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") handleClick()
      }}
      role="button"
      tabIndex={0}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          <Badge
            variant={variant as "default" | "secondary" | "outline"}
          >
            {STATUS_LABELS[game.status] ?? game.status}
          </Badge>
        </div>
        <CardDescription>
          Prompt: {lookupModelName(game.promptModel)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{game.playerModels.length} Spieler</span>
          <span>{game.voterModels.length} Voter</span>
          <span>{relativeTime(game.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
