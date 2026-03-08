import type { Doc } from "convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"

export function statusLabel(status: Doc<"games">["status"]) {
  switch (status) {
    case "created":
      return "Erstellt"
    case "prompting":
      return "Schwarze Karte wird generiert"
    case "responding":
      return "Weiße Karten werden generiert"
    case "voting":
      return "Voting"
    case "resolved":
      return "Ausgewertet"
    case "locked":
      return "Abgeschlossen"
    default:
      console.info(status satisfies never)
      return "—"
  }
}

interface StatusBadgeProps {
  status: Doc<"games">["status"]
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant="outline">{statusLabel(status)}</Badge>
}
