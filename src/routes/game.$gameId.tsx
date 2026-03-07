// app/routes/game.$gameId.tsx
import { createFileRoute } from "@tanstack/react-router"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useSuspenseQuery, useMutation } from "@tanstack/react-query"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/game/$gameId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.games.getGame, {
        gameId: params.gameId as any,
      })
    )
  },
  component: GamePage,
})

function GamePage() {
  const { gameId } = Route.useParams()

  const { data: game } = useSuspenseQuery(
    convexQuery(api.games.getGame, {
      gameId: gameId as any,
    })
  )

  const { mutate: submitVote } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserVote),
  })

  return (
    <div>
      <h1>Game Status: {game?.game.status}</h1>

      {/* Prompt-Phase */}
      {game?.prompt && <div className="black-card">{game.prompt.text}</div>}

      {/* Responses */}
      {game?.game.status === "voting" && (
        <div>
          <div key={1}>
            <p>{game.answerA?.text}</p>
            <button
              onClick={() =>
                submitVote({
                  gameId: gameId as any,
                  voterId: "user",
                  choice: "A",
                })
              }
            >
              Vote
            </button>
          </div>
          <div key={2}>
            <p>{game.answerB?.text}</p>
            <button
              onClick={() =>
                submitVote({
                  gameId: gameId as any,
                  voterId: "user",
                  choice: "B",
                })
              }
            >
              Vote
            </button>
          </div>
        </div>
      )}

      {/* Resolve */}
      {game?.game.status === "voting" && (
        <button
        // onClick={() => resolveGame({ gameId: gameId as any })}
        >
          Auswerten
        </button>
      )}

      {/* Ergebnis */}
      {game?.game.status === "resolved" && (
        <div>
          <p>Gewinner: {game.game.winner}</p>
          {/* <p>
            Elo Δ: A={game.eloChangeA}, B={game.eloChangeB}
          </p> */}
          {/* <button onClick={() => lockGame({ gameId: gameId as any })}>
            Spiel abschließen
          </button> */}
        </div>
      )}
    </div>
  )
}
