import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SAIF CRM',
  description: 'VC Fund CRM for SAIF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
