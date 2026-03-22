import { Check } from "lucide-react"

import type { GameStatus } from "./types"

import { cn } from "@/lib/utils"

type GameStepperProps = {
  status: GameStatus
}

const STEPS: Array<{ key: GameStatus; label: string }> = [
  { key: "created", label: "Start" },
  { key: "prompting", label: "Prompt" },
  { key: "responding", label: "Antworten" },
  { key: "voting", label: "Voting" },
  { key: "resolved", label: "Ergebnis" },
]

const STATUS_ORDER: Array<GameStatus> = [
  "created",
  "prompting",
  "responding",
  "voting",
  "resolved",
  "locked",
]

function getStepIndex(status: GameStatus): number {
  if (status === "locked") return STATUS_ORDER.indexOf("resolved")
  return STATUS_ORDER.indexOf(status)
}

export function GameStepper({ status }: Readonly<GameStepperProps>) {
  const currentIndex = getStepIndex(status)

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const stepIndex = getStepIndex(step.key)
        const isCompleted = stepIndex < currentIndex
        const isCurrent = stepIndex === currentIndex
        const isPending = stepIndex > currentIndex

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center border text-xs font-medium transition-colors",
                  isCompleted &&
                    "border-foreground bg-foreground text-background",
                  isCurrent &&
                    "border-foreground bg-background text-foreground",
                  isPending &&
                    "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-4",
                  stepIndex < currentIndex
                    ? "bg-foreground"
                    : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
