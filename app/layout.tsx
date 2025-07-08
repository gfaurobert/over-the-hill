import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { StagewiseToolbar } from "@stagewise/toolbar-next"
import ReactPlugin from "@stagewise-plugins/react"

export const metadata: Metadata = {
  title: "Over The Hill",
  description: "A web and desktop application designed to visualize project progress using Hill Charts",
  generator: "v0.dev",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
