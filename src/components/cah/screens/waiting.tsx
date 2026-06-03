import { Users } from "lucide-react"

import type { Doc } from "convex/_generated/dataModel"

type Props = {
  hostName: string | undefined
  players: Doc<"players">[]
  playerId: string
  children?: React.ReactNode
}

export function WaitingScreen({
  hostName,
  players,
  playerId,
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-lg p-4">
      {children}
      <div className="flex h-48 flex-col items-center justify-center gap-3 border border-dashed">
        <p className="text-sm text-muted-foreground">Waiting for host...</p>
        <p className="text-xs text-muted-foreground">
          {hostName ?? "The host"} is configuring the game
        </p>
      </div>
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        {players.length === 0 ? (
          <span>—</span>
        ) : (
          players.map((p, i) => (
            <span key={p.playerId}>
              {i > 0 && <span className="mx-1">·</span>}
              <span
                className={
                  p.playerId === playerId
                    ? "font-medium text-foreground"
                    : undefined
                }
              >
                {p.displayName}
                {p.isHost && " 👑"}
              </span>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
