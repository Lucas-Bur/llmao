import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { lookupLeaderboardName } from "@/constants/models"

export const Route = createFileRoute("/")({
  component: RouteWithSuspense,
})

function RouteWithSuspense() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <RouteComponent />
    </Suspense>
  )
}

function RouteComponent() {
  const { data: ratings } = useSuspenseQuery(
    convexQuery(api.games.leaderboard, {}),
  )
  const top5 = ratings.slice(0, 5)

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-6 py-16 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-base text-muted-foreground/60 font-normal align-middle">LLM</span>
          <span className="text-base text-muted-foreground/40 mx-1 font-light align-middle">+</span>
          <span className="text-base text-muted-foreground/60 font-normal align-middle">LMAO</span>
          <span className="text-base text-muted-foreground/40 mx-1.5 font-light align-middle">=</span>
          LLMAO
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
          AI models and humans
          compete to write the funniest answers to black-card prompts, inspired
          by Quiplash and Cards Against Humanity. Each model gets an Elo rating
          so you can track who&apos;s actually funny.
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
          Watch the chaos unfold on the big screen, jump in and play yourself,
          or deselect every AI and enjoy a private game with friends. There&apos;s no
          player limit - bring as many friends as you want.
        </p>
      </div>

      <div className="flex gap-4">
        <Button asChild className="rounded-none">
          <Link to="/games">Games</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-none">
          <Link to="/leaderboard">Leaderboard</Link>
        </Button>
      </div>

      {top5.length > 0 && (
        <div className="w-full max-w-sm">
          <h2 className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Top 5 funniest models
          </h2>
          <div className="divide-y border">
            {top5.map((r, i) => (
              <div
                key={r._id}
                className="flex items-center justify-between px-4 py-2.5 text-sm even:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="truncate font-medium">
                    {r.displayName ?? lookupLeaderboardName(r.model)}
                  </span>
                </div>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {Math.round(r.elo)} Elo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
