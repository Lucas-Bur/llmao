import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "../ui/sidebar"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AVAILABLE_MODELS, lookupModelName } from "@/constants/models"
import { cn } from "@/lib/utils"

interface SidePanelProps {
  // gameStatus: GameStatus
  // answers: Answer[]
  // votes: Vote[]
  // ratings: Rating[]
  // eloChanges?: Record<string, { before: number; after: number; delta: number }>
  // promptModel: string
  // selectedPlayerModels: string[]
  // selectedVoterModels: string[]

  gameId: string
}

export function SidePanel({
  // gameStatus,
  // answers,
  // votes,
  // promptModel,
  // selectedPlayerModels,
  // selectedVoterModels,
  gameId,
}: SidePanelProps) {
  const [whiteCardsToBeGenerated, setWhiteCardsToBeGenerated] = useState(3)

  const { data: gameObject } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> })
  )
  const { mutateAsync: updateGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.updateGame),
  })

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const game = gameObject!.game
  const gameStatus = game.status
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const answers = gameObject!.answers
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const votes = gameObject!.votes
  const promptModel = game.promptModel
  const selectedPlayerModels = game.playerModels
  const selectedVoterModels = game.voterModels

  const isPromptGenerated = [
    "responding",
    "voting",
    "resolved",
    "locked",
  ].includes(gameStatus)
  const areAnswersGenerated = ["voting", "resolved", "locked"].includes(
    gameStatus
  )
  const isGameFinished = ["resolved", "locked"].includes(gameStatus)

  // Get answer status for each player model
  const answerStatus = selectedPlayerModels.map((model) => {
    const answer = answers.find((a) => a.model === model)
    return {
      model,
      hasAnswer: !!answer,
    }
  })

  // Get vote status for each voter model
  const voteStatus = selectedVoterModels.map((model) => {
    const vote = votes.find((v) => v.voterId === `model:${model}`)
    const votedAnswer = vote
      ? answers.find((a) => a._id === vote.answerId)
      : null
    return {
      model,
      hasVoted: !!vote,
      votedFor: votedAnswer?.model,
    }
  })

  // Get player models participating in current game (for ELO display)
  // const participatingModels = answers
  //   .map((a) => a.model)
  //   .filter((m) => !m.startsWith("user:"))

  return (
    <Sidebar
      side="right"
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
    >
      <Tabs defaultValue="config" className="flex h-full flex-col">
        <SidebarHeader className="border-b border-sidebar-border">
          <TabsList className="w-full">
            <TabsTrigger value="config" className="flex-1">
              Config
            </TabsTrigger>
            <TabsTrigger value="live" className="flex-1">
              Live
            </TabsTrigger>
          </TabsList>
        </SidebarHeader>

        <SidebarContent>
          <div className="flex-1 overflow-y-auto p-3">
            {/* LIVE TAB */}
            <TabsContent value="live" className="m-0 space-y-3">
              {/* Answer Status */}
              <section className="border-b pb-3">
                <h3 className="mb-2 text-xs font-medium">Karten-Status</h3>
                <div className="space-y-1.5">
                  {answerStatus.map(({ model, hasAnswer }) => (
                    <div
                      key={model}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {lookupModelName(model)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0",
                          hasAnswer
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        )}
                      >
                        {hasAnswer ? "bereit" : "ausstehend"}
                      </span>
                    </div>
                  ))}
                  {/* User slot */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Du</span>
                    <span className="text-muted-foreground/50">optional</span>
                  </div>
                </div>
              </section>

              {/* Voter Status */}
              <section className="border-b pb-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium">Voter-Status</h3>
                </div>
                <div className="space-y-1.5">
                  {voteStatus.map(({ model, hasVoted, votedFor }) => (
                    <div
                      key={model}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {lookupModelName(model)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0",
                          hasVoted
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        )}
                      >
                        {
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          hasVoted ? lookupModelName(votedFor!) : "ausstehend"
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ELO Section */}
              {/* <section>
              <h3 className="mb-2 text-xs font-medium">Spieler-ELO</h3>
              <div className="space-y-1.5">
                {participatingModels.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Noch keine Spieler.
                  </p>
                ) : (
                  participatingModels.map((model) => {
                    const rating = ratings.find((r) => r.model === model)
                    const change = eloChanges?.[model]
                    const currentElo = rating?.elo ?? 1500

                    return (
                      <div
                        key={model}
                        className="flex items-center justify-between border-b pb-1.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{model}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {currentElo}
                          </p>
                        </div>
                        {isGameFinished && change && (
                          <div
                            className={cn(
                              "flex items-center gap-0.5 font-medium",
                              change.delta > 0 && "text-green-600",
                              change.delta < 0 && "text-red-600",
                              change.delta === 0 && "text-muted-foreground"
                            )}
                          >
                            {change.delta > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : change.delta < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {change.delta > 0 && "+"}
                            {change.delta}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section> */}
            </TabsContent>

            {/* CONFIG TAB */}
            <TabsContent value="config" className="m-0 space-y-3">
              {/* Black Card Model */}
              <section className="border-b pb-3">
                <h3 className="mb-2 text-xs font-medium">Schwarze Karte</h3>
                <Select
                  value={promptModel}
                  onValueChange={async (v) =>
                    await updateGameMutation({
                      gameId: gameId as Id<"games">,
                      promptModel: v,
                    })
                  }
                  disabled={isPromptGenerated}
                >
                  <SelectTrigger
                    className={cn("", isPromptGenerated && "opacity-50")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="">
                    {AVAILABLE_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {lookupModelName(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPromptGenerated && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Gesperrt
                  </p>
                )}
              </section>

              {/* White Card Count */}
              <section className="border-b pb-3">
                <h3 className="mb-2 text-xs font-medium">Anzahl Karten</h3>
                <Select
                  value={whiteCardsToBeGenerated.toString()}
                  onValueChange={(v) =>
                    setWhiteCardsToBeGenerated(() => parseInt(v))
                  }
                  disabled={areAnswersGenerated}
                >
                  <SelectTrigger
                    className={cn("", areAnswersGenerated && "opacity-50")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {areAnswersGenerated && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Gesperrt
                  </p>
                )}
              </section>

              {/* Player Models */}
              <section className="border-b pb-3">
                <h3 className="mb-2 text-xs font-medium">Spieler</h3>
                <div className="space-y-1.5">
                  {AVAILABLE_MODELS.map((model) => (
                    <div key={model} className="flex items-center gap-2">
                      <Checkbox
                        id={`player-${model}`}
                        checked={selectedPlayerModels.includes(model)}
                        disabled={areAnswersGenerated}
                        onCheckedChange={async (checked) => {
                          const updated = checked
                            ? [...selectedPlayerModels, model]
                            : selectedPlayerModels.filter((m) => m !== model)
                          await updateGameMutation({
                            gameId: gameId as Id<"games">,
                            playerModels: updated,
                          })
                        }}
                        className=""
                      />
                      <Label
                        htmlFor={`player-${model}`}
                        className={cn(
                          "text-xs",
                          areAnswersGenerated && "opacity-50"
                        )}
                      >
                        {lookupModelName(model)}
                      </Label>
                    </div>
                  ))}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    + Du kannst eine Karte einreichen
                  </p>
                </div>
              </section>

              {/* Voter Models */}
              <section>
                <h3 className="mb-2 text-xs font-medium">Voter</h3>
                <div className="space-y-1.5">
                  {AVAILABLE_MODELS.map((model) => (
                    <div key={model} className="flex items-center gap-2">
                      <Checkbox
                        id={`voter-${model}`}
                        checked={selectedVoterModels.includes(model)}
                        disabled={isGameFinished}
                        onCheckedChange={async (checked) => {
                          const updated = checked
                            ? [...selectedVoterModels, model]
                            : selectedVoterModels.filter((m) => m !== model)
                          await updateGameMutation({
                            gameId: gameId as Id<"games">,
                            voterModels: updated,
                          })
                        }}
                        className=""
                      />
                      <Label
                        htmlFor={`voter-${model}`}
                        className={cn(
                          "text-xs",
                          isGameFinished && "opacity-50"
                        )}
                      >
                        {lookupModelName(model)}
                      </Label>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>
          </div>
        </SidebarContent>
      </Tabs>
      <SidebarRail />
    </Sidebar>
  )
}
