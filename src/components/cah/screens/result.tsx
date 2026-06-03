import { Button } from "@/components/ui/button"

type Props = {
  isHost: boolean
  isResetting: boolean
  onReset: () => void
}

export function ResultScreen({ isHost, isResetting, onReset }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-none border bg-muted p-4 text-center">
        <p className="text-sm font-medium text-foreground">Game over!</p>
        <p className="mt-1 text-xs text-muted-foreground">
          View the results on the big screen.
        </p>
      </div>
      {isHost && (
        <Button
          className="w-full rounded-none"
          disabled={isResetting}
          onClick={onReset}
        >
          {isResetting ? "Resetting..." : "Next Round →"}
        </Button>
      )}
    </div>
  )
}
