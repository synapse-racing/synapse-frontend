import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { AuthProvider } from '../features/auth/context/AuthProvider.tsx'
import { AppearanceProvider } from '../features/garage/context/AppearanceProvider.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppearanceProvider>{children}</AppearanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
