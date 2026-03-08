import { api } from "convex/_generated/api"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useLocalStorageState } from "@/hooks/useLocalStorage"
import { MODEL_LOOKUP_NAMES, MODEL_OPTIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"

import { StatusBadge, statusLabel } from "./StatusBadge"

import type { Doc, Id } from "convex/_generated/dataModel"

import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  RiArrowRightSLine,
  RiEmotionLaughLine,
  RiEqualizerLine,
  RiLightbulbLine,
  RiPlayLine,
  RiTimeLine,
} from "@remixicon/react"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"

export function AppSidebar({ gameId }: { gameId: Id<"games"> }) {
  const router = useRouter()

  const { data: gameData } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId })
  )
  const { data: recentGames } = useSuspenseQuery(
    convexQuery(api.games.listRecentGames, {})
  )

  const [config, setConfig] = useLocalStorageState("game-config", {
    mode: "auto" as Doc<"games">["mode"],
    promptModel: "openai/gpt-5-nano" as (typeof MODEL_OPTIONS)[number],
    answerModelA: "google/gemini-2.5-flash" as (typeof MODEL_OPTIONS)[number],
    answerModelB:
      "anthropic/claude-3.5-haiku" as (typeof MODEL_OPTIONS)[number],
    voterModels: [
      "openai/gpt-5-nano",
      "xiaomi/mimo-v2-flash",
      "google/gemini-2.5-flash-lite-preview-09-2025",
    ] as Array<(typeof MODEL_OPTIONS)[number]>,
  })

  function toggleVoterModel(model: (typeof MODEL_OPTIONS)[number]) {
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
    router.navigate({
      to: "/games/$gameId",
      params: { gameId: newGameId },
    })
  }

  const game = gameData?.game

  return (
    <Sidebar collapsible="offcanvas">
      {/* ── Header ── */}
      <SidebarHeader className="p-2">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <RiEmotionLaughLine className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">LLMAO</span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent className="gap-0">
        {/* ── 1. Aktuelles Spiel ── */}
        {game && (
          <>
            <SidebarGroup className="">
              <SidebarGroupLabel className="mb-3 flex items-center gap-2 px-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <RiLightbulbLine className="size-4" />
                Aktuelles Spiel
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-2">
                  {/* Status */}
                  <div className="flex items-center justify-between border bg-muted/40 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Status
                    </span>
                    <StatusBadge status={game.status} />
                  </div>

                  {/* Model Overview */}
                  <div className="space-y-1.5 text-xs">
                    <ModelInfoRow label="Prompt" value={game.promptModel} />
                    <ModelInfoRow label="Antwort A" value={game.answerModelA} />
                    <ModelInfoRow label="Antwort B" value={game.answerModelB} />
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-3 border px-3 py-2">
                    <div className="flex flex-1 flex-col items-center">
                      <span className="text-lg font-bold tabular-nums">
                        {game.scoreA}
                      </span>
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Modell A
                      </span>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      vs
                    </div>
                    <div className="flex flex-1 flex-col items-center">
                      <span className="text-lg font-bold tabular-nums">
                        {game.scoreB}
                      </span>
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Modell B
                      </span>
                    </div>
                  </div>

                  {game.winner && (
                    <div className="bg-primary/10 px-3 py-1.5 text-center text-xs font-semibold text-primary">
                      Gewinner: {game.winner}
                    </div>
                  )}

                  {/* Manual Controls */}
                  {config.mode === "manual" && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => triggerGeneratePrompt({ gameId })}
                      >
                        Prompt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => triggerGenerateAnswers({ gameId })}
                      >
                        Antworten
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => triggerGenerateModelVotes({ gameId })}
                      >
                        Votes
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => triggerFinalizeGame({ gameId })}
                      >
                        Finalisieren
                      </Button>
                    </div>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="mx-0" />
          </>
        )}

        {/* ── 2. Konfiguration ── */}
        <Collapsible defaultOpen>
          <SidebarGroup className="">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="group mb-3 flex cursor-pointer items-center justify-between px-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground">
                <span className="flex items-center gap-2">
                  <RiEqualizerLine className="size-4" />
                  Konfiguration
                </span>
                <RiArrowRightSLine className="size-4 transition-transform group-data-[state=open]:rotate-90" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <div className="space-y-2">
                  {/* Mode */}
                  <ConfigSelect
                    label="Modus"
                    value={config.mode}
                    onChange={(v) =>
                      setConfig((p) => ({
                        ...p,
                        mode: v as Doc<"games">["mode"],
                      }))
                    }
                    options={[
                      { value: "auto", label: "Automatisch" },
                      { value: "manual", label: "Manuell" },
                    ]}
                  />

                  {/* Models */}
                  <ModelSelect
                    label="Schwarze Karte"
                    value={config.promptModel}
                    onChange={(v) =>
                      setConfig((p) => ({
                        ...p,
                        promptModel: v as (typeof MODEL_OPTIONS)[number],
                      }))
                    }
                  />
                  <ModelSelect
                    label="Weiße Karte A"
                    value={config.answerModelA}
                    onChange={(v) =>
                      setConfig((p) => ({
                        ...p,
                        answerModelA: v as (typeof MODEL_OPTIONS)[number],
                      }))
                    }
                  />
                  <ModelSelect
                    label="Weiße Karte B"
                    value={config.answerModelB}
                    onChange={(v) =>
                      setConfig((p) => ({
                        ...p,
                        answerModelB: v as (typeof MODEL_OPTIONS)[number],
                      }))
                    }
                  />

                  {/* Voter Models */}
                  <Collapsible>
                    <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-accent">
                      <span>
                        Voter-Modelle
                        <span className="sbg-muted ml-1.5 inline-flex size-5 items-center justify-center text-[10px] font-semibold tabular-nums">
                          {config.voterModels.length}
                        </span>
                      </span>
                      <RiArrowRightSLine className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 space-y-0.5 pl-1">
                        {MODEL_OPTIONS.map((model) => (
                          <label
                            key={model}
                            className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                          >
                            <Checkbox
                              checked={config.voterModels.includes(model)}
                              onCheckedChange={() => toggleVoterModel(model)}
                              className="size-4"
                            />
                            <span className="truncate text-muted-foreground">
                              {MODEL_LOOKUP_NAMES[model]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* New Game */}
                  <Button
                    onClick={handleCreateNewGame}
                    className="w-full"
                    size="sm"
                  >
                    <RiPlayLine className="mr-2 size-4" />
                    Neues Spiel starten
                  </Button>
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* ── 3. Letzte Spiele (Footer) ── */}
      <SidebarFooter className="p-0">
        <SidebarSeparator className="mx-0" />
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground">
            <span className="flex items-center gap-2">
              <RiTimeLine className="size-4" />
              Letzte Spiele
            </span>
            <RiArrowRightSLine className="size-4 transition-transform group-data-[state=open]:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-2 pb-3">
              {recentGames.slice(0, 5).map((recentGame) => {
                const isActive = gameId === recentGame._id
                return (
                  <SidebarMenuItem key={recentGame._id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-auto py-2"
                    >
                      <Link
                        to="/games/$gameId"
                        params={{ gameId: recentGame._id }}
                      >
                        <div className="flex w-full items-center gap-3">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              recentGame.status === "resolved" &&
                                "bg-emerald-500",
                              recentGame.status === "voting" && "bg-blue-500",
                              recentGame.status === "responding" &&
                                "bg-indigo-500",
                              recentGame.status === "prompting" &&
                                "bg-amber-500",
                              recentGame.status === "created" && "bg-slate-400",
                              recentGame.status === "locked" && "bg-red-500"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm leading-tight font-medium">
                              {statusLabel(recentGame.status)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(recentGame.createdAt).toLocaleString(
                                "de-DE",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                              Aktiv
                            </span>
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
      </SidebarFooter>
    </Sidebar>
  )
}

/* ── Helper: Model info row (read-only) ── */
function ModelInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">
        {MODEL_LOOKUP_NAMES[value as (typeof MODEL_OPTIONS)[number]]}
      </span>
    </div>
  )
}

/* ── Helper: Config select (mode) ── */
function ConfigSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex items-center">
      <Label className="max-w-26 min-w-26 shrink-0 text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="col-span-2 h-8 flex-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ── Helper: Model select ── */
function ModelSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center">
      <Label className="max-w-26 min-w-26 shrink-0 text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODEL_OPTIONS.map((model) => (
            <SelectItem key={model} value={model} className="text-xs">
              {MODEL_LOOKUP_NAMES[model]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
