import { useState } from "react"

import { PhaseProgress } from "@/components/cah/phase-progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Id } from "convex/_generated/dataModel"
import type { Participant } from "@/hooks/use-game-progress"

type Props = {
  gameId: Id<"games">
  hasSubmitted: boolean
  onSubmit: (gameId: Id<"games">, text: string, authorId: string) => Promise<unknown>
  onSubmittedChange: (v: boolean) => void
  isSubmitting: boolean
  respondParticipants: Participant[]
  timerDeadline: number | undefined
  answerCount: number
  isHost: boolean
  playerId: string
  advanceToVoting: (args: { gameId: Id<"games"> }) => Promise<unknown>
}

export function AnsweringScreen({
  gameId,
  hasSubmitted,
  onSubmit,
  onSubmittedChange,
  isSubmitting,
  respondParticipants,
  timerDeadline,
  answerCount,
  isHost,
  playerId,
  advanceToVoting,
}: Props) {
  return (
    <div className="space-y-3">
      <PhaseProgress
        label="Answers"
        participants={respondParticipants}
        timerDeadline={timerDeadline}
      />

      {!hasSubmitted ? (
        <AnswerInput
          onSubmit={async (text) => {
            await onSubmit(gameId, text, `user:${playerId}`)
            onSubmittedChange(true)
          }}
          isSubmitting={isSubmitting}
        />
      ) : (
        <div className="rounded-none border bg-muted p-3 text-center">
          <p className="text-sm font-medium text-foreground">
            Answer submitted!
          </p>
        </div>
      )}

      {isHost && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Skip phase? The game will advance for all players immediately, possibly before all answers are submitted.
          </p>
          <Button
            size="sm"
            className="w-full rounded-none text-xs"
            disabled={answerCount < 2}
            onClick={async () => {
              try {
                await advanceToVoting({ gameId })
              } catch {
                // validation errors shown via toast in future
              }
            }}
          >
            To Voting →
          </Button>
        </div>
      )}
    </div>
  )
}

function AnswerInput({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (text: string) => Promise<void>
  isSubmitting: boolean
}) {
  const [text, setText] = useState("")

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!text.trim() || isSubmitting) return
        await onSubmit(text.trim())
      }}
      className="flex gap-2"
    >
      <Input
        placeholder="Your answer..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isSubmitting}
        className="rounded-none"
      />
      <Button
        type="submit"
        disabled={!text.trim() || isSubmitting}
        className="rounded-none"
      >
        {isSubmitting ? "Sending..." : "Send"}
      </Button>
    </form>
  )
}
