import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingCardProps {
  tone: "black" | "white"
  title: string
  subtitle?: string
}

export function LoadingCard({ tone, title, subtitle }: LoadingCardProps) {
  const isBlack = tone === "black"

  return (
    <Card
      className={cn(
        "h-88 w-full",
        isBlack
          ? "border-zinc-800 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-900"
      )}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-xs tracking-[0.2em] uppercase opacity-70">
          {isBlack ? "Black Card" : "White Card"}
        </span>
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center gap-4">
        <Skeleton
          className={cn("h-4", isBlack ? "bg-zinc-800" : "bg-zinc-200")}
        />
        <Skeleton
          className={cn("h-4 w-5/6", isBlack ? "bg-zinc-800" : "bg-zinc-200")}
        />
        <Skeleton
          className={cn("h-4 w-3/4", isBlack ? "bg-zinc-800" : "bg-zinc-200")}
        />
      </CardContent>
      <CardContent className="mt-auto pt-0">
        <div className="text-sm font-medium">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-xs opacity-70">{subtitle}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
