import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://teamsever.everacy.com'),
  title: 'Tasko | Work and people operations in one workspace',
  description: 'Tasko gives owners, managers, and HR teams one workspace for tasks, attendance, leave, communication, and team visibility.',
  openGraph: {
    title: 'Tasko | Work and people operations in one workspace',
    description: 'One workspace for tasks, attendance, leave, communication, and team visibility.',
    images: ['/product-showcase.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/tasko_logo.png',
  },
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
      <body className={`${manrope.className} ${manrope.variable} bg-background text-foreground font-display`}>
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
