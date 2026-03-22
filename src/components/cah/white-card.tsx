import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { lookupModelName } from "@/constants/models"
import { cn } from "@/lib/utils"

type WhiteCardProps = {
  id: string
  text: string
  model: string
  isFlipped: boolean
  isSelected: boolean
  isLoading?: boolean
  voteCount?: number
  voterNames?: Array<string>
  hasVoted: boolean
  canSelect: boolean
  onFlip: () => void
  onSelect: () => void
}

export function WhiteCard({
  text,
  model,
  isFlipped,
  isSelected,
  isLoading,
  voteCount,
  voterNames,
  hasVoted,
  canSelect,
  onFlip,
  onSelect,
}: Readonly<WhiteCardProps>) {
  if (isLoading) {
    return (
      <Card className="flex h-56 w-full flex-col rounded-none border-border bg-background">
        <CardContent className="flex flex-1 flex-col justify-center gap-2 p-5">
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-3/4 rounded-none" />
          <Skeleton className="h-4 w-1/2 rounded-none" />
        </CardContent>
        <CardFooter className="p-5 pt-0">
          <span className="text-xs text-muted-foreground">
            Wird generiert...
          </span>
        </CardFooter>
      </Card>
    )
  }

  // 3D Flip card container
  return (
    <div
      className="perspective-1000 h-56 w-full"
      style={{ perspective: "1000px" }}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500",
          isFlipped && "transform-[rotateY(180deg)]"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Card Back (not flipped) */}
        <button
          type="button"
          onClick={onFlip}
          disabled={isFlipped}
          className={cn(
            "absolute inset-0 h-full w-full text-left backface-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isFlipped && "pointer-events-none"
          )}
        >
          <Card className="flex h-full w-full flex-col rounded-none border-border bg-muted transition-colors hover:border-foreground/50">
            <CardContent className="flex flex-1 flex-col items-center justify-center p-5">
              <span className="text-sm font-medium text-foreground">
                Klicken zum Aufdecken
              </span>
            </CardContent>
          </Card>
        </button>

        {/* Card Front (flipped) */}
        <button
          type="button"
          onClick={canSelect ? onSelect : undefined}
          disabled={!canSelect || !isFlipped}
          className={cn(
            "absolute inset-0 h-full w-full transform-[rotateY(180deg)] text-left backface-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !isFlipped && "pointer-events-none",
            !canSelect && "cursor-default"
          )}
        >
          <Card
            className={cn(
              "flex h-full w-full flex-col rounded-none border-2 bg-background transition-colors",
              isSelected && "border-foreground",
              !isSelected &&
                canSelect &&
                "border-border hover:border-foreground/50",
              !isSelected && !canSelect && "border-border"
            )}
          >
            <CardContent className="flex flex-1 p-5">
              <p className="text-sm leading-relaxed font-medium text-foreground">
                {text}
              </p>
            </CardContent>
            {hasVoted && (
              <CardFooter className="flex items-center justify-between gap-8 border-border p-4 py-2">
                <span className="text-xs text-muted-foreground">
                  {lookupModelName(model)}
                </span>
                {typeof voteCount === "number" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-xs font-medium text-muted-foreground">
                          {voteCount}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-none">
                        <p className="text-xs">
                          {voterNames && voterNames.length > 0
                            ? voterNames
                                .map((voter) =>
                                  voter.startsWith("user")
                                    ? voter
                                    : lookupModelName(voter)
                                )
                                .join(", ")
                            : "Keine Votes"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardFooter>
            )}
          </Card>
        </button>
      </div>
    </div>
  )
}
