import { useEffect, useState } from "react"

const PARTS = ["LLM", " + ", "LMAO", " = ", "LLMAO"]

export function BrandEquation() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(1), 400)
    const t2 = setTimeout(() => setVisible(2), 900)
    const t3 = setTimeout(() => setVisible(3), 1200)
    const t4 = setTimeout(() => setVisible(4), 1500)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

  return (
    <span className="inline-flex items-center gap-[1px] text-[10px] tracking-tight text-muted-foreground/60">
      {PARTS.map((part, i) => (
        <span
          key={part}
          className={
            i === 4
              ? "font-semibold text-foreground/80"
              : i === 1 || i === 3
                ? "text-muted-foreground/40"
                : ""
          }
          style={{
            opacity: visible > i ? 1 : 0,
            transition: "opacity 400ms ease-out",
          }}
        >
          {part}
        </span>
      ))}
    </span>
  )
}
