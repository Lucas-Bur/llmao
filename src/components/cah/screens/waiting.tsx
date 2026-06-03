import type { Doc } from "convex/_generated/dataModel"

import { PlayerBadgeList } from "@/components/cah/player-badge-list"
import { lookupModelName } from "@/constants/models"

type Props = {
  hostName: string | undefined
  players: Doc<"players">[]
  playerId: string
  playerModels?: string[]
  voterModels?: string[]
  children?: React.ReactNode
}

export function WaitingScreen({
  hostName,
  players,
  playerId,
  playerModels = [],
  voterModels = [],
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-lg p-4">
      {children}
      <div className="flex flex-col gap-4">
        <div className="flex h-32 flex-col items-center justify-center gap-2 border border-dashed">
          <p className="text-sm text-muted-foreground">Waiting for host...</p>
          <p className="text-xs text-muted-foreground">
            {hostName ?? "The host"} is configuring the game
          </p>
        </div>

        {(playerModels.length > 0 || voterModels.length > 0) && (
          <div className="border p-3 text-xs">
            <p className="mb-2 font-medium text-muted-foreground">
              Current configuration
            </p>
            {playerModels.length > 0 && (
              <div className="mb-1">
                <span className="text-muted-foreground">AI Players: </span>
                {playerModels.map((m, i) => (
                  <span key={m}>
                    {i > 0 && ", "}
                    {lookupModelName(m)}
                  </span>
                ))}
              </div>
            )}
            {voterModels.length > 0 && (
              <div>
                <span className="text-muted-foreground">AI Voters: </span>
                {voterModels.map((m, i) => (
                  <span key={m}>
                    {i > 0 && ", "}
                    {lookupModelName(m)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <PlayerBadgeList players={players} playerId={playerId} />
    </div>
  )
}
