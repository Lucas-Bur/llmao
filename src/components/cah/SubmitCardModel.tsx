import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface SubmitCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => void
  promptText: string
}

export function SubmitCardModal({
  isOpen,
  onClose,
  onSubmit,
  promptText,
}: SubmitCardModalProps) {
  const [cardText, setCardText] = useState("")

  const handleSubmit = () => {
    if (cardText.trim()) {
      onSubmit(cardText.trim())
      setCardText("")
      onClose()
    }
  }

  const handleClose = () => {
    setCardText("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="*:rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Eigene Karte einreichen</DialogTitle>
          <DialogDescription>
            Schreibe deine Antwort auf die schwarze Karte. Du kannst nur eine
            Karte pro Spiel einreichen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Black card preview */}
          <Card className="rounded-none border-zinc-800 bg-zinc-950">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-white">{promptText}</p>
            </CardContent>
          </Card>

          {/* User input */}
          <Textarea
            placeholder="Deine Antwort..."
            value={cardText}
            onChange={(e) => setCardText(e.target.value)}
            className="min-h-24 resize-none rounded-none"
            maxLength={280}
          />
          <p className="text-right text-xs text-muted-foreground">
            {cardText.length}/280
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-none"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!cardText.trim()}
            className="rounded-none"
          >
            Einreichen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
