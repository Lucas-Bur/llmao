export function shuffle<T>(array: Array<T>): Array<T> {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    // eslint-disable-next-line sonarjs/pseudo-random
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
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

async function executeAttempt<T>(
  function_: () => Promise<T>,
  validate: (result: T) => boolean,
  attempt: number,
  retries: number,
  label: string
): Promise<
  | { success: true; result: T; error?: never }
  | { success: false; result?: never; error: unknown }
> {
  try {
    const result = await function_()
    if (validate(result)) {
      console.log("INFO", label, `Success on attempt ${attempt}`, {
        result: typeof result === "string" ? result : String(result),
      })
      return { success: true, result }
    }
    const message = `Validation failed (attempt ${attempt}/${retries})`
    console.log("WARN", label, message, {
      result: typeof result === "string" ? result : String(result),
    })
    return {
      success: false,
      error: new Error(`${message}: ${JSON.stringify(result).slice(0, 100)}`),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(
      "WARN",
      label,
      `Error on attempt ${attempt}/${retries}: ${errorMessage}`,
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }
    )
    return { success: false, error }
  }
}

export async function withRetry<T>(
  function_: () => Promise<T>,
  validate: (result: T) => boolean,
  retries = 3,
  label = "unknown"
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= retries; attempt++) {
    const outcome = await executeAttempt(
      function_,
      validate,
      attempt,
      retries,
      label
    )

    if (outcome.success) return outcome.result

    lastError = outcome.error

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }

  console.log("ERROR", label, `All ${retries} attempts failed`, {
    lastError:
      lastError instanceof Error ? lastError.message : String(lastError),
  })
  throw lastError
}
