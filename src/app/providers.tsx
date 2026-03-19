'use client'

import { SocketProvider } from '@/contexts/SocketContext'
import QueryProvider from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <SocketProvider>{children}</SocketProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
