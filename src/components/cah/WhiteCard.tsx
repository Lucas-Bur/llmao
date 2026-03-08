import { LoadingCard } from "./LoadingCard"
import type { Side } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface WhiteCardProps {
  side: Side
  text?: string | null
  model?: string | null
  loading: boolean
  flipped: boolean
  selected: boolean
  disabled?: boolean
  score?: number
  onFlip: () => void
  onVote?: () => void
}

export function WhiteCard({
  side,
  text,
  model,
  loading,
  flipped,
  selected,
  disabled,
  score,
  onFlip,
  onVote,
}: WhiteCardProps) {
  if (loading) {
    return (
      <LoadingCard
        tone="white"
        title={`Antwort ${side} wird generiert`}
        subtitle="Die weiße Karte ist noch verdeckt."
      />
    )
  }

  return (
    <div className="w-full">
      <div className="h-88 perspective-distant">
        <button
          type="button"
          onClick={onFlip}
          className={cn(
            "relative h-full w-full rounded-3xl text-left transition-transform duration-500 transform-3d",
            flipped && "transform-[rotateY(180deg)]"
          )}
        >
          {/* Front - Hidden */}
          <Card className="absolute inset-0 flex flex-col border-zinc-200 bg-white shadow-lg backface-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xs tracking-[0.2em] text-zinc-500 uppercase">
                White Card {side}
              </span>
              {typeof score === "number" ? (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                  {score} Votes
                </span>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-semibold text-zinc-900">
                  Tippen zum Umdrehen
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  Karte {side} ansehen
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back - Visible when flipped */}
          <Card className="absolute inset-0 flex transform-[rotateY(180deg)] flex-col border-zinc-200 bg-white shadow-lg backface-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xs tracking-[0.2em] text-zinc-500 uppercase">
                White Card {side}
              </span>
              {typeof score === "number" ? (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                  {score} Votes
                </span>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1">
              <p className="text-lg leading-snug font-semibold whitespace-pre-wrap text-zinc-900">
                {text || "Keine Antwort"}
              </p>
            </CardContent>
            <CardContent className="mt-auto pt-0">
              <div className="text-xs text-zinc-500">{model || "—"}</div>
            </CardContent>
          </Card>
        </button>
      </div>

      {onVote ? (
        <Button
          onClick={onVote}
          disabled={disabled}
          variant={selected ? "default" : "secondary"}
          className={cn(
            "mt-3 w-full rounded-2xl py-3",
            selected && "bg-emerald-600 text-white hover:bg-emerald-500",
            !selected && "bg-zinc-900 text-white hover:bg-zinc-800",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {selected ? `Für ${side} gestimmt` : `Für Karte ${side} stimmen`}
        </Button>
      ) : null}
    </div>
  )
}
