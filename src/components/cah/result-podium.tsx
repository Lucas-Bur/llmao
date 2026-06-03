import { useEffect, useRef, useState } from "react"
import type { Doc } from "convex/_generated/dataModel"

import { WhiteCard } from "./white-card"
import { resolveDisplayName } from "@/constants/models"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

export type RankedAnswer = Doc<"answers"> & {
  rank: number
  voteCount: number
  voterNames: string[]
  displayName: string
}

export function sortByVotes(
  answers: Doc<"answers">[],
  voteCounts: Record<string, number>,
  voterNames: Record<string, string[]>,
  players: Doc<"players">[],
): RankedAnswer[] {
  return answers
    .map((a) => ({
      ...a,
      voteCount: voteCounts[a._id] ?? 0,
      voterNames: voterNames[a._id] ?? [],
      displayName: resolveDisplayName(a.model, players),
    }))
    .sort((a, b) => b.voteCount - a.voteCount || a._id.localeCompare(b._id))
    .map((a, i) => ({ ...a, rank: i + 1 }))
}

function podiumRevealOrder(count: number): number[] {
  if (count === 0) return []
  const top3 = [2, 1, 0].filter((i) => i < count)
  const rest = Array.from({ length: Math.max(0, count - 3) }, (_, i) => i + 3)
  return [...top3, ...rest]
}

export function usePodiumReveal(
  status: string,
  sortedAnswers: RankedAnswer[],
) {
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set())
  const prevRef = useRef(status)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = status

    const isNowResolved = status === "resolved" || status === "locked"
    const wasVoting = prev === "voting"

    if (wasVoting && isNowResolved && sortedAnswers.length > 0) {
      setRevealedSet(new Set())
      const order = podiumRevealOrder(sortedAnswers.length)
      order.forEach((idx, i) => {
        setTimeout(() => {
          setRevealedSet((curr) => new Set([...curr, sortedAnswers[idx]._id]))
        }, i * 800)
      })
    } else if (isNowResolved && revealedSet.size === 0) {
      setRevealedSet(new Set(sortedAnswers.map((a) => a._id)))
    } else if (status === "voting") {
      setRevealedSet(new Set())
    }
  }, [status, sortedAnswers])

  return revealedSet
}

// ---------------------------------------------------------------------------
// PodiumCards — top 3
// ---------------------------------------------------------------------------

export function PodiumCards({
  sorted,
  revealed,
}: {
  sorted: RankedAnswer[]
  revealed: Set<string>
}) {
  const [first, second, third] = sorted

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 1st — center stage */}
      <div
        className={cn(
          "w-full max-w-lg transition-all duration-1000",
          first && revealed.has(first._id)
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-12 scale-95 opacity-0",
        )}
      >
        {first && (
          <div className="relative">
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-yellow-500 px-4 py-1 text-xs font-bold text-white">
              #1 — {first.voteCount} Stimme{first.voteCount !== 1 ? "n" : ""}
            </div>
            <div className="ring-2 ring-yellow-400/50">
              <WhiteCard
                id={first._id}
                text={first.text}
                model={first.displayName}
                isFlipped
                isSelected={false}
                voteCount={first.voteCount}
                voterNames={first.voterNames}
                hasVoted
                canSelect={false}
                onFlip={() => {}}
                onSelect={() => {}}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2nd & 3rd — flanking */}
      <div className="flex w-full max-w-lg gap-4">
        {[second, third].map((a, i) => {
          const rank = i === 0 ? 2 : 3
          return (
            <div key={a?._id ?? rank} className="flex-1">
              {a && (
                <div
                  className={cn(
                    "transition-all duration-700",
                    revealed.has(a._id)
                      ? "translate-y-0 opacity-100"
                      : "translate-y-8 opacity-0",
                  )}
                  style={{ transitionDelay: "200ms" }}
                >
                  <div className="mb-1 text-center text-xs font-semibold text-muted-foreground">
                    #{rank}
                  </div>
                  <WhiteCard
                    id={a._id}
                    text={a.text}
                    model={a.displayName}
                    isFlipped
                    isSelected={false}
                    voteCount={a.voteCount}
                    voterNames={a.voterNames}
                    hasVoted
                    canSelect={false}
                    onFlip={() => {}}
                    onSelect={() => {}}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ResultBanner — auto-scrolling rest cards
// ---------------------------------------------------------------------------

export function ResultBanner({
  sorted,
  revealed,
}: {
  sorted: RankedAnswer[]
  revealed: Set<string>
}) {
  const rest = sorted.slice(3)
  if (rest.length === 0) return null

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex w-max gap-4"
        style={{ animation: "marquee 60s linear infinite" }}
      >
        {[...rest, ...rest].map((a, i) => (
          <div
            key={`${a._id}-${i}`}
            className={cn(
              "min-w-64 w-72 shrink-0 transition-all duration-500",
              revealed.has(a._id)
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0",
            )}
            style={{
              transitionDelay:
                i < rest.length ? `${(i + 3) * 150}ms` : "0ms",
            }}
          >
            <div className="mb-1 text-center text-xs font-semibold text-muted-foreground">
              #{a.rank}
            </div>
            <WhiteCard
              id={a._id}
              text={a.text}
              model={a.displayName}
              isFlipped
              isSelected={false}
              voteCount={a.voteCount}
              voterNames={a.voterNames}
              hasVoted
              canSelect={false}
              onFlip={() => {}}
              onSelect={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
