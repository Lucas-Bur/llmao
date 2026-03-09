import { useMemo } from "react"
import { ADJECTIVES, ATTRIBUTES, NOUNS } from "@/constants/uniqueWords"

export function useUniqueNameFromId(id: string | number): string {
  return useMemo(() => getUniqueNameFromId(id), [id])
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getUniqueNameFromId(id: string | number) {
  let index: bigint

  if (typeof id === "number") {
    index = BigInt(id)
  } else {
    // FNV-1a 64-bit Hash, um aus einem String einen stabilen Index zu machen
    let hash = 0xcbf29ce484222325n
    for (let i = 0; i < id.length; i++) {
      hash ^= BigInt(id.charCodeAt(i))
      hash = (hash * 0x100000001b3n) & ((1n << 64n) - 1n)
    }
    index = hash
  }

  // Modulo-Mapping auf die Wortlisten
  // Wir nutzen BigInt für die Berechnung, damit nichts abgeschnitten wird
  const adjIdx = Number(index % BigInt(ADJECTIVES.length))
  const attrIdx = Number(
    (index / BigInt(ADJECTIVES.length)) % BigInt(ATTRIBUTES.length)
  )
  const nounIdx = Number(
    (index / BigInt(ADJECTIVES.length * ATTRIBUTES.length)) %
      BigInt(NOUNS.length)
  )

  return `${capitalize(ADJECTIVES[adjIdx])}-${capitalize(ATTRIBUTES[attrIdx])}-${capitalize(NOUNS[nounIdx])}`
}
