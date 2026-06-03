import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useMemo } from "react"

import { getPlayerId } from "@/lib/storage"
import { useUniqueNameFromId } from "@/hooks/use-unique-names"
import { useGameProgress } from "@/hooks/use-game-progress"
import { useUser } from "@/hooks/use-user"

export function usePlayGame(gameId: string) {
  const playerId = useMemo(() => getPlayerId(), [])
  const roomName = useUniqueNameFromId(gameId)
  const { name: globalName, setName: setGlobalName } = useUser()

  const { data: gameObject } = useSuspenseQuery(
    convexQuery(api.games.getGame, { gameId: gameId as Id<"games"> }),
  )
  const { data: allPlayers } = useSuspenseQuery(
    convexQuery(api.players.listPlayers, { gameId: gameId as Id<"games"> }),
  )

  const joinGame = useMutation({
    mutationFn: useConvexMutation(api.players.joinGame),
  })
  const setDisplayNameMutation = useMutation({
    mutationFn: useConvexMutation(api.players.setDisplayName),
  })
  const startGame = useMutation({
    mutationFn: useConvexMutation(api.games.startGame),
  })
  const submitAnswer = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserAnswer),
  })
  const submitVote = useMutation({
    mutationFn: useConvexMutation(api.games.submitUserVote),
  })
  const updateGame = useMutation({
    mutationFn: useConvexMutation(api.games.updateGame),
  })
  const advanceToVoting = useMutation({
    mutationFn: useConvexMutation(api.games.advanceToVoting),
  })
  const finalizeGame = useMutation({
    mutationFn: useConvexMutation(api.games.triggerFinalizeGame),
  })
  const resetGame = useMutation({
    mutationFn: useConvexMutation(api.games.resetGame),
  })

  const game = gameObject!.game
  const prompt = gameObject!.prompt
  const allAnswers = gameObject!.answers ?? []

  const currentPlayer = allPlayers!.find((p) => p.playerId === playerId)
  const isHost = currentPlayer?.isHost === true

  const otherAnswers = useMemo(
    () => allAnswers.filter((a) => a.model !== `user:${playerId}`),
    [allAnswers, playerId],
  )

  const progress = useGameProgress({
    game,
    answers: allAnswers,
    votes: gameObject!.votes ?? [],
    players: allPlayers,
    llmEvents: gameObject!.llmEvents ?? [],
    playerId,
  })

  return {
    gameId: gameId as Id<"games">,
    playerId,
    roomName,
    globalName,
    setGlobalName,
    game,
    prompt,
    allAnswers,
    otherAnswers,
    allPlayers,
    currentPlayer,
    isHost,
    ...progress,
    joinGame: joinGame.mutateAsync,
    setDisplayName: setDisplayNameMutation.mutateAsync,
    startGame: startGame.mutateAsync,
    submitAnswer: submitAnswer.mutateAsync,
    submitVote: submitVote.mutateAsync,
    updateGame: updateGame.mutateAsync,
    advanceToVoting: advanceToVoting.mutateAsync,
    finalizeGame: finalizeGame.mutateAsync,
    resetGame: resetGame.mutateAsync,
    isJoining: joinGame.isPending,
    isStarting: startGame.isPending,
    isSubmitting: submitAnswer.isPending,
    isVoting: submitVote.isPending,
    isResetting: resetGame.isPending,
  }
}
