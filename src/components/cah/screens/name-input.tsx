import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  roomName: string
  displayName: string
  isEditing: boolean
  isJoining: boolean
  joinError: string | null
  onChange: (value: string) => void
  onSubmit: () => void
}

export function NameInputScreen({
  roomName,
  displayName,
  isEditing,
  isJoining,
  joinError,
  onChange,
  onSubmit,
}: Props) {
  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-lg font-semibold">{roomName}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {isEditing ? "Change your name" : "Enter your name to join"}
      </p>
      <Input
        placeholder="Your name"
        value={displayName}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        className="mb-4"
      />
      {joinError && (
        <p className="mb-4 text-sm text-destructive">{joinError}</p>
      )}
      <Button
        className="w-full"
        disabled={!displayName.trim() || isJoining}
        onClick={onSubmit}
      >
        {isEditing ? "Save" : "Join"}
      </Button>
    </div>
  )
}
