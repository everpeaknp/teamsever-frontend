import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'Teamsever',
  description: 'Manage tasks with unrivaled precision.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} ${inter.variable} bg-background text-foreground font-display`}>
        <Providers>
          <ErrorBoundary>
            <CurrencyProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </CurrencyProvider>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
