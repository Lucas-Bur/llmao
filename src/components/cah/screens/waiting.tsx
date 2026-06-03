import type { Doc } from "convex/_generated/dataModel"

import { PlayerBadgeList } from "@/components/cah/player-badge-list"

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
      <PlayerBadgeList players={players} playerId={playerId} />
    </div>
  )
}
