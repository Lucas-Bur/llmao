import { LoadingCard } from "./LoadingCard"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface BlackCardProps {
  text?: string | null
  loading: boolean
}

export function BlackCard({ text, loading }: BlackCardProps) {
  if (loading) {
    return (
      <LoadingCard
        tone="black"
        title="Prompt wird generiert"
        subtitle="Die schwarze Karte ist noch nicht bereit."
      />
    )
  }

  return (
    <Card className="h-88 w-full border-zinc-800 bg-zinc-950 text-white shadow-lg">
      <CardHeader className="text-xs tracking-[0.2em] text-zinc-400 uppercase">
        Black Card
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        <p className="text-xl leading-snug font-semibold whitespace-pre-wrap">
          {text || "Noch kein Prompt vorhanden."}
        </p>
      </CardContent>
      <CardContent className="mt-auto pt-0">
        <div className="text-xs text-zinc-500">Prompt / Frage</div>
      </CardContent>
    </Card>
  )
}
