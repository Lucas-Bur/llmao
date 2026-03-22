import { useMemo } from "react"

import { ADJECTIVES, ATTRIBUTES, NOUNS } from "@/constants/unique-words"

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
    let hash = 0xcb_f2_9c_e4_84_22_23_25n
    for (let i = 0; i < id.length; i++) {
      const codePoint = id.codePointAt(i)
      if (codePoint !== undefined) {
        hash ^= BigInt(codePoint)
        hash = (hash * 0x1_00_00_00_01_b3n) & ((1n << 64n) - 1n)
      }
    }
    index = hash
  }

  // Modulo-Mapping auf die Wortlisten
  // Wir nutzen BigInt für die Berechnung, damit nichts abgeschnitten wird
  const adjIndex = Number(index % BigInt(ADJECTIVES.length))
  const attributeIndex = Number(
    (index / BigInt(ADJECTIVES.length)) % BigInt(ATTRIBUTES.length)
  )
  const nounIndex = Number(
    (index / BigInt(ADJECTIVES.length * ATTRIBUTES.length)) %
      BigInt(NOUNS.length)
  )

  return `${capitalize(ADJECTIVES[adjIndex])}-${capitalize(ATTRIBUTES[attributeIndex])}-${capitalize(NOUNS[nounIndex])}`
}
