import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import { Suspense } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { lookupLeaderboardName } from "@/constants/models"

export const Route = createFileRoute("/leaderboard")({
  component: RouteWithSuspense,
})

function RouteWithSuspense() {
  return (
    <Suspense fallback={<Loading />}>
      <RouteComponent />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
    </div>
  )
}

function RouteComponent() {
  const { data: ratings } = useSuspenseQuery(
    convexQuery(api.games.leaderboard, {})
  )

  if (ratings.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-8 text-lg font-semibold">Leaderboard</h1>
        <p className="py-16 text-center text-sm text-muted-foreground">
          No ratings yet. Play some games to see the leaderboard!
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-lg font-semibold">Leaderboard</h1>
      <Card>
        <CardHeader className="border-b px-6 py-3">
          <div className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-4 text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>Model</span>
            <span className="text-right">Elo</span>
            <span className="text-right">W/L/D</span>
            <span className="text-right">Games</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ratings.map((r, i) => (
            <div
              key={r._id}
              className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-4 px-6 py-3 text-sm even:bg-muted/30"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="truncate">{r.displayName ?? lookupLeaderboardName(r.model)}</span>
              <span className="text-right font-medium tabular-nums">
                {Math.round(r.elo)}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {r.wins}/{r.losses}/{r.draws}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {r.gamesPlayed}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
