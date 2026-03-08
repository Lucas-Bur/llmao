import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { api } from "convex/_generated/api"
import { useRouter } from "@tanstack/react-router"
import { StatusBadge, statusLabel } from "./StatusBadge"
import type { Doc, Id } from "convex/_generated/dataModel"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MODEL_OPTIONS } from "@/lib/constants"

import { useLocalStorageState } from "@/hooks/useLocalStorage"

export function AppSidebar({ gameId }: { gameId: Id<"games"> }) {
  const router = useRouter()

  const { data: gameData } = useSuspenseQuery(
    convexQuery(api.games.getGame, {
      gameId: gameId,
    })
  )
  const { data: recentGames } = useSuspenseQuery(
    convexQuery(api.games.listRecentGames, {})
  )

  const [config, setConfig] = useLocalStorageState("game-config", {
    mode: "auto" as Doc<"games">["mode"],
    promptModel: "openai/gpt-5-nano",
    answerModelA: "google/gemini-2.5-flash",
    answerModelB: "anthropic/claude-3.5-haiku",
    voterModels: [
      "openai/gpt-5-nano",
      "xiaomi/mimo-v2-flash",
      "google/gemini-2.5-flash-lite-preview-09-2025",
    ],
  })

  function toggleVoterModel(model: string) {
    setConfig((prev) => {
      const exists = prev.voterModels.includes(model)
      return {
        ...prev,
        voterModels: exists
          ? prev.voterModels.filter((m) => m !== model)
          : [...prev.voterModels, model],
      }
    })
  }

  const { mutateAsync: createGame } = useMutation({
    mutationFn: useConvexMutation(api.games.createGame),
  })
  const { mutateAsync: triggerGeneratePrompt } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerGeneratePrompt),
  })
  const { mutateAsync: triggerGenerateAnswers } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerGenerateAnswers),
  })
  const { mutateAsync: triggerGenerateModelVotes } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerGenerateModelVotes),
  })
  const { mutateAsync: triggerFinalizeGame } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerFinalizeGame),
  })

  async function handleCreateNewGame() {
    const newGameId = await createGame({
      promptModel: config.promptModel,
      answerModelA: config.answerModelA,
      answerModelB: config.answerModelB,
      mode: config.mode,
      voterModels: config.voterModels,
    })

    router.navigate({ to: "/games/$gameId", params: { gameId: newGameId } })
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <h1 className="text-lg font-bold">LLMAO</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Globale Konfiguration</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-4">
            {/* Mode Select */}
            <div className="flex flex-col gap-2">
              <Label>Modus</Label>
              <Select
                value={config.mode}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    mode: value as Doc<"games">["mode"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatisch</SelectItem>
                  <SelectItem value="manual">Manuell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selects */}
            <div className="flex flex-col gap-2">
              <Label>Schwarze Karte</Label>
              <Select
                value={config.promptModel}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, promptModel: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Weiße Karte A</Label>
              <Select
                value={config.answerModelA}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, answerModelA: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Weiße Karte B</Label>
              <Select
                value={config.answerModelB}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, answerModelB: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voter Models */}
            <div className="flex flex-col gap-2">
              <Label>Voter-Modelle</Label>
              <div className="space-y-2">
                {MODEL_OPTIONS.map((model) => (
                  <label
                    key={model}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Checkbox
                      checked={config.voterModels.includes(model)}
                      onCheckedChange={() => toggleVoterModel(model)}
                    />
                    <span className="truncate">{model}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleCreateNewGame} className="w-full">
              Neues Spiel starten
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Current Game */}
        {gameData ? (
          <SidebarGroup>
            <SidebarGroupLabel>Aktuelles Spiel</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">Status</span>
                <StatusBadge status={gameData.game.status} />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Prompt: {gameData.game.promptModel}</div>
                <div>A: {gameData.game.answerModelA}</div>
                <div>B: {gameData.game.answerModelB}</div>
                <div>
                  Votes A/B: {gameData.game.scoreA} / {gameData.game.scoreB}
                </div>
                {gameData.game.winner ? (
                  <div>Gewinner: {gameData.game.winner}</div>
                ) : null}
              </div>

              {config.mode === "manual" ? (
                <div className="mt-4 grid gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerGeneratePrompt({ gameId })}
                  >
                    Prompt generieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerGenerateAnswers({ gameId })}
                  >
                    Antworten generieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerGenerateModelVotes({ gameId })}
                  >
                    Modell-Votes holen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => triggerFinalizeGame({ gameId })}
                  >
                    Spiel finalisieren
                  </Button>
                </div>
              ) : null}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarFooter>
          {/* Recent Games */}
          <SidebarGroup>
            <SidebarGroupLabel>Letzte Spiele</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2">
                {recentGames.slice(0, 5).map((game) => (
                  <Button
                    key={game._id}
                    variant={gameId === game._id ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      router.navigate({
                        to: "/games/$gameId",
                        params: { gameId: game._id },
                      })
                    }
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {statusLabel(game.status)}
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(game.createdAt).toLocaleString("de-DE")}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
