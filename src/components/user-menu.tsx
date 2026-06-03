import { User } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useUser } from "@/hooks/use-user"

export function UserMenu() {
  const { name, setName } = useUser()
  const [open, setOpen] = useState(false)
  const [editName, setEditName] = useState(name)

  const handleSave = () => {
    if (editName.trim()) {
      setName(editName.trim())
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <User className="h-3.5 w-3.5" />
          <span>{name || "Guest"}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Your Name</DialogTitle>
          <DialogDescription>
            The name will be used for all games.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Your name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="rounded-none"
          maxLength={30}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editName.trim()}
            className="rounded-none"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
