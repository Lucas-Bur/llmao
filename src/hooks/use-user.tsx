import { createContext, useCallback, useContext, useEffect, useState } from "react"

import { getStoredName, setStoredName } from "@/lib/storage"

type UserContext = {
  name: string
  setName: (name: string) => void
}

const Ctx = createContext<UserContext>({
  name: "",
  setName: () => {},
})

export function UserProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [name, setNameState] = useState("")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setNameState(getStoredName())
    setHydrated(true)
  }, [])

  const setName = useCallback((n: string) => {
    setStoredName(n)
    setNameState(n)
  }, [])

  // Don't render children until hydrated to avoid SSR mismatch
  if (!hydrated) {
    return <>{children}</>
  }

  return <Ctx value={{ name, setName }}>{children}</Ctx>
}

export function useUser() {
  return useContext(Ctx)
}
