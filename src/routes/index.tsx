import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useConvexMutation } from "@convex-dev/react-query"
import { api } from "convex/_generated/api"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const startGame = useConvexMutation(api.games.createGame)
  const router = useRouter()

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We've already added the button component for you.</p>

          {/* <Button
            className="mt-2"
            onClick={async () => {
              const gameId = await startGame({
                answerModelA: "mistralai/mistral-nemo",
                answerModelB: "arcee-ai/trinity-large-preview:free",
                promptModel: "qwen/qwen3-235b-a22b-2507",
              })
              router.navigate({ to: "/game/$gameId", params: { gameId } })
            }}
          >
            Create Game
          </Button> */}
        </div>
      </div>
    </div>
  )
}
