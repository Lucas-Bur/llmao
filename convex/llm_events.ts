import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

export type LogEvent = {
  gameId: Id<"games">
  stage: "prompt" | "answer" | "vote"
  role: "writer" | "player" | "judge"
  model: string
  promptText: string
  responseText?: string
  errorMessage?: string
}

export async function logLLMEvent(ctx: MutationCtx, event: LogEvent) {
  await ctx.db.insert("llmEvents", {
    gameId: event.gameId,
    stage: event.stage,
    role: event.role,
    model: event.model,
    promptText: event.promptText,
    responseText: event.responseText ?? "",
    success: !event.errorMessage,
    ...(event.errorMessage !== undefined && {
      errorMessage: event.errorMessage,
    }),
    locked: true,
    createdAt: Date.now(),
  })
}
