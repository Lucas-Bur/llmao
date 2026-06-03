import { CountdownTimer } from "./countdown-timer"

type ParticipantStatus = "done" | "pending" | "failed"

type Participant = {
  id: string
  label: string
  status: ParticipantStatus
  subtitle?: string
}

type PhaseProgressProps = {
  label: string
  participants: Participant[]
  timerDeadline?: number | null
  variant?: "card" | "sidebar"
  className?: string
}

const STATUS_ICON: Record<ParticipantStatus, string> = {
  done: "✓",
  pending: "⟳",
  failed: "✗",
}

const STATUS_COLOR: Record<ParticipantStatus, string> = {
  done: "text-green-600",
  pending: "text-muted-foreground",
  failed: "text-destructive",
}

export function PhaseProgress({
  label,
  participants,
  timerDeadline,
  variant = "card",
  className,
}: PhaseProgressProps) {
  const current = participants.filter(
    (p) => p.status === "done" || p.status === "failed"
  ).length

  if (variant === "sidebar") {
    return (
      <div className={className}>
        <p className="mb-2 font-medium text-foreground text-xs">{label}</p>
        <div className="space-y-1 text-muted-foreground">
          {participants.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span className={STATUS_COLOR[p.status]}>{p.label}</span>
              <span>{STATUS_ICON[p.status]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-muted-foreground">
          <span className="text-xs">
            {current}/{participants.length}
          </span>
          {timerDeadline != null && <CountdownTimer deadline={timerDeadline} />}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-none border bg-muted p-3 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {label}: {current}/{participants.length}
        </p>
        {timerDeadline != null && <CountdownTimer deadline={timerDeadline} />}
      </div>
      <ul className="space-y-1 text-xs">
        {participants.map((p) => (
          <li
            key={p.id}
            className={STATUS_COLOR[p.status]}
          >
            {STATUS_ICON[p.status]} {p.label}
            {p.subtitle && (
              <span className="ml-1">— {p.subtitle}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
