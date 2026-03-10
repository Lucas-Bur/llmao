import { Button } from "@/components/ui/button"
import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { api } from "convex/_generated/api"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const { mutateAsync: createGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.createGame),
  })
  const router = useRouter()

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Los gehts!</h1>
          <p>You may now add components and start building.</p>

          <Button
            className="mt-2"
            onClick={async () => {
              const newGameId = await createGameMutation({
                playerModels: [],
                promptModel: "openai/gpt-4.1-mini",
                voterModels: [],
              })
              await router.navigate({
                to: "/games/$gameId",
                params: { gameId: newGameId },
              })
            }}
          >
            Create Game
          </Button>
        </div>
      </div>
    </div>
  )
}
