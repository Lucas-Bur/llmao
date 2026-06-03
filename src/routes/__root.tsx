import { TanStackDevtools } from "@tanstack/react-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Link,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { Smile } from "lucide-react"

import appCss from "../styles.css?url"

import { UserMenu } from "@/components/user-menu"
import { UserProvider } from "@/hooks/use-user"
import AiDevtools from "@/lib/ai-devtools"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        // eslint-disable-next-line unicorn/text-encoding-identifier-case
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "LLMAO",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
    </div>
  )
}

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <UserProvider>
          {/* Global top bar */}
          <header className="sticky top-0 z-50 flex h-(--header-height) items-center justify-between border-b bg-background px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center border">
                <Smile className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">LLMAO</span>
            </Link>
            <UserMenu />
          </header>

          <main>{children}</main>

          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              AiDevtools,
              {
                name: "TanStack Query",
                render: <ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        </UserProvider>
        <Scripts />
      </body>
    </html>
  )
}
