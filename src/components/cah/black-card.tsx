import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { lookupModelName } from "@/constants/models"

type BlackCardProps = {
  text?: string | null
  model?: string
  isLoading?: boolean
  showModel?: boolean
}

export function BlackCard({
  text,
  model,
  isLoading,
  showModel = true,
}: Readonly<BlackCardProps>) {
  if (isLoading) {
    return (
      <Card className="flex h-64 w-full flex-col rounded-none border-zinc-800 bg-zinc-950">
        <CardContent className="flex flex-1 flex-col justify-center gap-3 p-6">
          <Skeleton className="h-5 w-full rounded-none bg-zinc-800" />
          <Skeleton className="h-5 w-3/4 rounded-none bg-zinc-800" />
          <Skeleton className="h-5 w-1/2 rounded-none bg-zinc-800" />
        </CardContent>
        <CardFooter className="border-muted-foreground p-4 py-2">
          <span className="text-xs text-muted-foreground">
            Prompt wird generiert...
          </span>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="flex h-64 w-full flex-col rounded-none border-zinc-800 bg-zinc-950">
      <CardContent className="flex flex-1 items-center p-6">
        <p className="text-lg leading-relaxed font-semibold text-white">
          {text ?? "Noch kein Prompt vorhanden."}
        </p>
      </CardContent>
      {showModel && model && (
        <CardFooter className="border-muted-foreground p-4 py-2">
          <span className="text-xs text-muted-foreground">
            {lookupModelName(model)}
          </span>
        </CardFooter>
      )}
    </Card>
  )
}
