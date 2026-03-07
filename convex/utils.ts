export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function cleanResponse(text: string): string {
  const trimmed = text.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  validate: (result: T) => boolean,
  retries = 3,
  label = "unknown"
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn()
      if (validate(result)) {
        console.log("INFO", label, `Success on attempt ${attempt}`, {
          result: typeof result === "string" ? result : String(result),
        })
        return result
      }
      const msg = `Validation failed (attempt ${attempt}/${retries})`
      console.log("WARN", label, msg, {
        result: typeof result === "string" ? result : String(result),
      })
      lastErr = new Error(`${msg}: ${JSON.stringify(result).slice(0, 100)}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.log(
        "WARN",
        label,
        `Error on attempt ${attempt}/${retries}: ${errMsg}`,
        {
          error: errMsg,
          stack: err instanceof Error ? err.stack : undefined,
        }
      )
      lastErr = err
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  console.log("ERROR", label, `All ${retries} attempts failed`, {
    lastError: lastErr instanceof Error ? lastErr.message : String(lastErr),
  })
  throw lastErr
}
