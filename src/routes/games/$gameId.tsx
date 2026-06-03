import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"

import CardsAgainstLLMs from "@/components/cards-against-llms"

export const Route = createFileRoute("/games/$gameId")({
  loader: async ({ context, params }) => {
    return await Promise.allSettled([
      context.queryClient.ensureQueryData(
        convexQuery(api.games.getGame, {
          gameId: params.gameId as Id<"games">,
        })
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.games.listRecentGames, {})
      ),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { gameId } = Route.useParams()

  return <CardsAgainstLLMs gameId={gameId as Id<"games">} />
}
