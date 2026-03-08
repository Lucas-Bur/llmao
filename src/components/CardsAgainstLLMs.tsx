import { useMemo, useState } from "react"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { Link } from "@tanstack/react-router"
import { api } from "../../convex/_generated/api"
import { AppSidebar, BlackCard, WhiteCard } from "./cah"
import type { Id } from "../../convex/_generated/dataModel"
import type { Side } from "@/lib/constants"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getPersistentId } from "@/hooks/useLocalStorage"

export function CardsAgainstLLMs({ gameId }: { gameId: string }) {
  const [flipped, setFlipped] = useState<Record<Side, boolean>>({
    A: false,
    B: false,
  })
  const [userCardText, setUserCardText] = useState("")
  const [userCardSide, setUserCardSide] = useState<Side>("A")

  const voterId = useMemo(() => getPersistentId("cah-voter-id"), [])
  const authorId = useMemo(() => getPersistentId("cah-author-id"), [])

  const { data: gameData } = useSuspenseQuery(
    convexQuery(api.games.getGame, {
      gameId: gameId as Id<"games">,
    })
  )

  const { mutateAsync: submitUserVote } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserVote),
  })
  const { mutateAsync: submitUserAnswer } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserAnswer),
  })

  const votes = gameData?.votes ?? []
  const myVote = votes.find(
    (vote) => vote.voterKind === "user" && vote.voterId === voterId
  )

  const scoreA =
    gameData?.game.scoreA ??
    votes.filter((vote) => vote.choice === "A").length ??
    0
  const scoreB =
    gameData?.game.scoreB ??
    votes.filter((vote) => vote.choice === "B").length ??
    0

  const canVote = gameData?.game.status === "voting" && !myVote
  const canSubmitUserCard =
    gameData?.game.status === "responding" &&
    !!userCardText.trim() &&
    !(
      (userCardSide === "A" && gameData.answerA) ||
      (userCardSide === "B" && gameData.answerB)
    )

  const promptLoading =
    !gameData?.prompt &&
    (gameData?.game.status === "created" ||
      gameData?.game.status === "prompting")

  const answerALoading =
    !gameData?.answerA &&
    (gameData?.game.status === "created" ||
      gameData?.game.status === "prompting" ||
      gameData?.game.status === "responding")

  const answerBLoading =
    !gameData?.answerB &&
    (gameData?.game.status === "created" ||
      gameData?.game.status === "prompting" ||
      gameData?.game.status === "responding")

  async function handleVote(choice: Side) {
    if (!gameId || !canVote) return
    await submitUserVote({
      gameId: gameId as Id<"games">,
      voterId,
      choice,
    })
  }

  async function handleSubmitUserCard() {
    if (!gameId || !canSubmitUserCard) return
    await submitUserAnswer({
      gameId: gameId as Id<"games">,
      authorId,
      side: userCardSide,
      text: userCardText.trim(),
    })
    setUserCardText("")
  }

  return (
    <SidebarProvider>
      <AppSidebar gameId={gameId as Id<"games">} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink>
                    <Link to="/">Alle Spiele</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>aktuelles Spiel</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {!gameData ? (
            <Card className="border-dashed border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-10 text-center text-muted-foreground">
                Starte in der Sidebar ein neues Spiel oder wähle ein bestehendes
                aus.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-3 lg:items-center">
                <WhiteCard
                  side="A"
                  text={gameData.answerA?.text}
                  model={gameData.answerA?.model}
                  loading={answerALoading}
                  flipped={flipped.A}
                  selected={myVote?.choice === "A"}
                  disabled={!canVote}
                  score={
                    gameData.game.status === "resolved" ||
                    gameData.game.status === "locked"
                      ? scoreA
                      : undefined
                  }
                  onFlip={() =>
                    setFlipped((prev) => ({
                      ...prev,
                      A: !prev.A,
                    }))
                  }
                  onVote={
                    gameData.game.status === "voting"
                      ? () => handleVote("A")
                      : undefined
                  }
                />

                <BlackCard
                  text={gameData.prompt?.text}
                  loading={promptLoading}
                />

                <WhiteCard
                  side="B"
                  text={gameData.answerB?.text}
                  model={gameData.answerB?.model}
                  loading={answerBLoading}
                  flipped={flipped.B}
                  selected={myVote?.choice === "B"}
                  disabled={!canVote}
                  score={
                    gameData.game.status === "resolved" ||
                    gameData.game.status === "locked"
                      ? scoreB
                      : undefined
                  }
                  onFlip={() =>
                    setFlipped((prev) => ({
                      ...prev,
                      B: !prev.B,
                    }))
                  }
                  onVote={
                    gameData.game.status === "voting"
                      ? () => handleVote("B")
                      : undefined
                  }
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="bg-muted">
                  <CardHeader className="text-sm font-semibold">
                    Eigene weiße Karte hinzufügen
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)_10rem]">
                    <Select
                      value={userCardSide}
                      onValueChange={(value) => setUserCardSide(value as Side)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Links / A</SelectItem>
                        <SelectItem value="B">Rechts / B</SelectItem>
                      </SelectContent>
                    </Select>

                    <Textarea
                      value={userCardText}
                      onChange={(e) => setUserCardText(e.target.value)}
                      rows={3}
                      placeholder="Deine eigene weiße Karte ..."
                    />

                    <Button
                      onClick={handleSubmitUserCard}
                      disabled={!canSubmitUserCard}
                      variant={canSubmitUserCard ? "default" : "outline"}
                    >
                      Einfügen
                    </Button>
                  </CardContent>
                  <CardContent className="pt-0 text-xs text-muted-foreground">
                    Aktiv während „responding". Die Karte wird auf Slot A oder B
                    gesetzt, sofern dort noch nichts liegt.
                  </CardContent>
                </Card>

                <Card className="bg-muted">
                  <CardHeader className="text-sm font-semibold">
                    Live-Zustand
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      Schwarze Karte:{" "}
                      {promptLoading
                        ? "lädt"
                        : gameData.prompt
                          ? "bereit"
                          : "leer"}
                    </div>
                    <div>
                      Weiße Karte A:{" "}
                      {answerALoading
                        ? "lädt"
                        : gameData.answerA
                          ? "bereit"
                          : "leer"}
                    </div>
                    <div>
                      Weiße Karte B:{" "}
                      {answerBLoading
                        ? "lädt"
                        : gameData.answerB
                          ? "bereit"
                          : "leer"}
                    </div>
                    <div>User-Vote: {myVote?.choice ?? "noch keiner"}</div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
