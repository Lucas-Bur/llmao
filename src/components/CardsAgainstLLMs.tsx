import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { ChevronRight, Smile } from "lucide-react"
import { useMemo, useState } from "react"

import { ActionFooter } from "./cah/ActionFooter"
import { BlackCard } from "./cah/BlackCard"
import { SidePanel } from "./cah/SidePanel"
import { SubmitCardModal } from "./cah/SubmitCardModel"
import type { Game } from "./cah/types"
import { WhiteCard } from "./cah/WhiteCard"

import { lookupModelName } from "@/constants/models"
import { useUniqueNameFromId } from "@/hooks/useUniqueName"

const userId = "user:current"

export default function FusionPrototype({ gameId }: { gameId: Game["_id"] }) {
  const router = useRouter()

  // Queries
  const { data: gameObject } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId })
  )

  // Mutations
  const { mutateAsync: submitUserAnswerMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserAnswer),
  })
  const { mutateAsync: submitUserVoteMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserVote),
  })
  const { mutateAsync: advanceToVotingMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.advanceToVoting),
  })
  const { mutateAsync: triggerGeneratePromptMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerGeneratePrompt),
  })
  const { mutateAsync: triggerGenerateModelVotesMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerGenerateModelVotes),
  })
  const { mutateAsync: triggerFinalizeGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.triggerFinalizeGame),
  })
  const { mutateAsync: createGameMutation } = useMutation({
    mutationFn: useConvexMutation(api.games.createGame),
  })

  // Game state
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const game = gameObject!.game
  const gameStatus = game.status
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const prompt = gameObject!.prompt
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const allAnswers = gameObject!.answers
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const votes = gameObject!.votes

  // const userAnswer = allAnswers.find((a) => a.model === userId)

  const whiteCardCount = allAnswers.length

  const [hasUserVoted, setHasUserVoted] = useState(false)
  const [hasUserSubmittedCard, setHasUserSubmittedCard] = useState(false)

  // UI state
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)

  // Computed values
  const allCardsFlipped = useMemo(() => {
    return allAnswers.length > 0 && allAnswers.every((a) => flippedCards[a._id])
  }, [allAnswers, flippedCards])

  // Get vote counts per answer
  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const voterNames: Record<string, Array<string>> = {}

    for (const answer of allAnswers) {
      counts[answer._id] = 0
      voterNames[answer._id] = []
    }

    for (const vote of votes) {
      counts[vote.answerId] = (counts[vote.answerId] || 0) + 1
      const voterModel = vote.voterId.replace("model:", "")
      voterNames[vote.answerId].push(voterModel)
    }

    return { counts, voterNames }
  }, [allAnswers, votes])

  // Handlers
  const handleFlipCard = (answerId: string) => {
    setFlippedCards((prev) => ({ ...prev, [answerId]: true }))
  }

  const handleSelectCard = (answerId: string) => {
    if (!allCardsFlipped || hasUserVoted || gameStatus !== "voting") return
    setSelectedCardId((prev) => (prev === answerId ? null : answerId))
  }

  const handleVote = async () => {
    if (!selectedCardId || !allCardsFlipped) return
    await submitUserVoteMutation({
      answerId: selectedCardId as Id<"answers">,
      gameId,
      voterId: userId,
    })
    setHasUserVoted(true)
  }

  const handleSubmitCard = async (text: string) => {
    await submitUserAnswerMutation({
      gameId,
      text,
      authorId: userId,
    })
    setHasUserSubmittedCard(true)
  }

  const handleAdvanceState = async () => {
    switch (gameStatus) {
      case "created":
        // Start prompting
        await triggerGeneratePromptMutation({ gameId })
        break

      case "responding":
        // Move to voting
        // await triggerGenerateAnswersMutation({ gameId }) // wurde ausgelagert
        await advanceToVotingMutation({ gameId })
        break

      case "voting":
        // Resolve game

        await triggerGenerateModelVotesMutation({ gameId }) // das ist nocht ganz sauber, weil eigentlich der use nicht voten muss und man warten muss, bis alle modelle gevoted haben
        await triggerFinalizeGameMutation({ gameId })
        break

      case "resolved":
        // Lock game
        // await triggerFinalizeGameMutation({ gameId })
        break
    }
  }

  const handleNewGame = async () => {
    const newGameId = await createGameMutation({
      playerModels: [],
      promptModel: "google/gemini-2.5-flash-lite-preview-09-2025",
      voterModels: [],
    })
    await router.navigate({
      to: "/games/$gameId",
      params: { gameId: newGameId },
    })
  }

  // Can submit card only during responding phase
  const canSubmitCard = gameStatus === "responding" && !hasUserSubmittedCard

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center border">
                <Smile className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">LLMAO</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Alle Spiele
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{useUniqueNameFromId(gameId)}</span>
          </div>
        </div>
      </header>

      {/* Main Content - with space for sidebar and footer */}
      <main className="pr-72 pb-20">
        <div className="p-6">
          {/* Black Card */}
          <div className="mb-6">
            <BlackCard
              text={prompt?.text}
              model={prompt?.model}
              isLoading={gameStatus === "prompting"}
              showModel={gameStatus !== "created"}
            />
          </div>

          {/* Status message when no cards yet */}
          {gameStatus === "created" && (
            <div className="flex h-56 items-center justify-center border border-dashed">
              <p className="text-sm text-muted-foreground">
                Klicke auf Prompt generieren um zu starten
              </p>
            </div>
          )}

          {gameStatus === "prompting" && (
            <div className="flex h-56 items-center justify-center border border-dashed">
              <p className="text-sm text-muted-foreground">
                Prompt wird generiert...
              </p>
            </div>
          )}

          {/* White Cards Grid */}
          {(gameStatus === "responding" ||
            gameStatus === "voting" ||
            gameStatus === "resolved" ||
            gameStatus === "locked") && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allAnswers.length === 0
                ? // Loading placeholders
                  Array.from({ length: whiteCardCount }).map((_, i) => (
                    <WhiteCard
                      key={`loading-${i}`}
                      id={`loading-${i}`}
                      text=""
                      model=""
                      isFlipped={false}
                      isSelected={false}
                      isLoading
                      hasVoted={false}
                      canSelect={false}
                      onFlip={() => {}}
                      onSelect={() => {}}
                    />
                  ))
                : allAnswers.map((answer) => (
                    <WhiteCard
                      key={answer._id}
                      id={answer._id}
                      text={answer.text}
                      model={
                        answer.model === userId
                          ? "Du"
                          : lookupModelName(answer.model)
                      }
                      isFlipped={flippedCards[answer._id] || false}
                      isSelected={selectedCardId === answer._id}
                      isLoading={false}
                      voteCount={voteCounts.counts[answer._id]}
                      voterNames={voteCounts.voterNames[answer._id]}
                      hasVoted={hasUserVoted}
                      canSelect={
                        allCardsFlipped &&
                        gameStatus === "voting" &&
                        !hasUserVoted
                      }
                      onFlip={() => handleFlipCard(answer._id)}
                      onSelect={() => handleSelectCard(answer._id)}
                    />
                  ))}
            </div>
          )}

          {/* Voting hint */}
          {gameStatus === "voting" && !hasUserVoted && (
            <div className="mt-6 text-center">
              {!allCardsFlipped ? (
                <p className="text-sm text-muted-foreground">
                  Decke alle Karten auf, um abstimmen zu können
                </p>
              ) : !selectedCardId ? (
                <p className="text-sm text-muted-foreground">
                  Wähle eine Karte aus, um abzustimmen
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  Karte ausgewählt - klicke auf Abstimmen
                </p>
              )}
            </div>
          )}

          {/* Results message */}
          {(gameStatus === "resolved" || gameStatus === "locked") && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Spiel beendet - ELO-Änderungen wurden berechnet
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Side Panel */}
      <SidePanel
        // gameStatus={gameStatus}
        // answers={allAnswers}
        // votes={votes}
        // ratings={mockRatings}
        // eloChanges={
        //   gameStatus === "resolved" || gameStatus === "locked"
        //     ? mockEloChanges
        //     : undefined
        // }
        // config={config}
        // onConfigChange={setConfig}
        gameId={gameId as Id<"games">}
      />

      {/* Submit Card Modal */}
      <SubmitCardModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitCard}
        promptText={prompt?.text ?? ""}
      />

      {/* Action Footer */}
      <ActionFooter
        gameId={gameId}
        gameStatus={gameStatus}
        selectedCardId={selectedCardId}
        allCardsFlipped={allCardsFlipped}
        hasUserVoted={hasUserVoted}
        hasUserSubmittedCard={hasUserSubmittedCard}
        canSubmitCard={canSubmitCard}
        onSubmitCard={() => setIsSubmitModalOpen(true)}
        onVote={handleVote}
        onAdvanceState={handleAdvanceState}
        onNewGame={handleNewGame}
      />
    </div>
  )
}
