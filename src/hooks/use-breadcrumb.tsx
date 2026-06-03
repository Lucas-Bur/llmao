import { createContext, useContext, useState, type ReactNode } from "react"

type BreadcrumbContextType = {
  breadcrumb: ReactNode
  setBreadcrumb: (node: ReactNode) => void
}

export const BreadcrumbContext = createContext<BreadcrumbContextType>({
  breadcrumb: null,
  setBreadcrumb: () => {},
})

export function useBreadcrumb() {
  return useContext(BreadcrumbContext)
}

export function BreadcrumbProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [breadcrumb, setBreadcrumb] = useState<ReactNode>(null)
  return (
    <BreadcrumbContext value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext>
  )
}
