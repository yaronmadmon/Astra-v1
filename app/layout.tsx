import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ASTRA - AI-First App Builder',
  description: 'Build apps and websites with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

