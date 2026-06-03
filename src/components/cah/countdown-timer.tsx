import { Timer } from "lucide-react"
import { useEffect, useState } from "react"

export function CountdownTimer({ deadline }: Readonly<{ deadline: number }>) {
  const [remaining, setRemaining] = useState(
    () => Math.max(0, Math.floor((deadline - Date.now()) / 1000))
  )

  useEffect(() => {
    if (remaining <= 0) return
    const interval = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline, remaining])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <span className="flex items-center gap-1 font-medium text-foreground">
      <Timer className="h-3 w-3" />
      {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`}
    </span>
  )
}
