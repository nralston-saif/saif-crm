'use client'

import { ToastProvider } from './Toast'
import ErrorBoundary from './ErrorBoundary'
import { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  )
}
