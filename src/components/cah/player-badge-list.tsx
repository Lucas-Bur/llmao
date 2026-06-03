import { Users } from "lucide-react"

type Player = {
  playerId: string
  displayName: string
  isHost: boolean
}

type Props = {
  players: Player[]
  playerId: string
}

export function PlayerBadgeList({ players, playerId }: Props) {
  return (
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
  )
}
