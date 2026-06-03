import type { Doc, Id } from "convex/_generated/dataModel"
import { Pencil } from "lucide-react"

import { AVAILABLE_MODELS, lookupModelName } from "@/constants/models"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlayerBadgeList } from "@/components/cah/player-badge-list"
import { ModelCheckboxList } from "@/components/cah/model-checkbox-list"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  gameId: Id<"games">
  game: Doc<"games">
  roomName: string
  displayName: string
  allPlayers: Doc<"players">[]
  playerId: string
  onEditName: () => void
  updateGame: (args: { gameId: Id<"games"> } & Record<string, unknown>) => Promise<unknown>
  startGame: (args: { gameId: Id<"games"> }) => Promise<unknown>
  isStarting: boolean
}

export function HostConfigScreen({
  gameId,
  game,
  roomName,
  displayName,
  allPlayers,
  playerId,
  onEditName,
  updateGame,
  startGame,
  isStarting,
}: Props) {
  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{roomName}</h1>
          <p className="text-xs text-muted-foreground">
            {displayName}{" "}
            <Badge variant="outline" className="text-[10px] leading-none px-1.5 py-0">
              Host
            </Badge>
          </p>
        </div>
        <button
          type="button"
          onClick={onEditName}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Change name"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>

      <PlayerBadgeList players={allPlayers} playerId={playerId} />

      <p className="mb-6 text-sm text-muted-foreground">
        Configure the game before it starts
      </p>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-medium">Language</h2>
        <Select
          value={game.language}
          onValueChange={async (v) =>
            await updateGame({ gameId, language: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-medium">Prompt Model</h2>
        <Select
          value={game.promptModel}
          onValueChange={async (v) =>
            await updateGame({ gameId, promptModel: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {lookupModelName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-medium">AI Players</h2>
        <ModelCheckboxList
          idPrefix="player"
          selectedModels={game.playerModels}
          onChange={async (updated) =>
            await updateGame({ gameId, playerModels: updated })
          }
          footer="+ You can play as a human"
        />
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-medium">AI Voters</h2>
        <ModelCheckboxList
          idPrefix="voter"
          selectedModels={game.voterModels}
          onChange={async (updated) =>
            await updateGame({ gameId, voterModels: updated })
          }
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium">Advance Mode</h2>
        <Select
          value={game.advanceMode}
          onValueChange={async (v) =>
            await updateGame({
              gameId,
              advanceMode: v as "all_answered" | "timer" | "manual",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_answered">
              When all AIs have responded
            </SelectItem>
            <SelectItem value="timer">After time limit</SelectItem>
            <SelectItem value="manual">Manual (host only)</SelectItem>
          </SelectContent>
        </Select>
        {game.advanceMode === "timer" && (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">
              Time limit (seconds)
            </Label>
            <Input
              type="number"
              defaultValue={game.respondTimeLimit ?? 60}
              onBlur={async (e) =>
                await updateGame({
                  gameId,
                  respondTimeLimit: Number(e.target.value),
                  voteTimeLimit: Number(e.target.value),
                })
              }
            />
          </div>
        )}
      </section>

      <Button
        className="w-full"
        disabled={game.playerModels.length === 0 || isStarting}
        onClick={async () => {
          await startGame({ gameId })
        }}
      >
        {isStarting ? "Starting..." : "Start Game"}
      </Button>
    </div>
  )
}
