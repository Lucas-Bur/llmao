export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

const PLAYER_ID_KEY = "llmao_player_id"
const PLAYER_NAME_KEY = "llmao_player_name"

export function getPlayerId(): string {
  let id = safeGet(PLAYER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    safeSet(PLAYER_ID_KEY, id)
  }
  return id
}

export function getStoredName(): string {
  return safeGet(PLAYER_NAME_KEY) ?? ""
}

export function setStoredName(name: string): void {
  safeSet(PLAYER_NAME_KEY, name)
}
