import React, { createContext, useContext, ReactNode } from 'react'
import { useSubscription } from '@/hooks/useSubscription'

export interface SubscriptionContextValue {
  isPremium: boolean
  isLoading: boolean
  refetch: () => Promise<void>
}

export const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscription()

  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function usePremium(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('usePremium must be used within a SubscriptionProvider')
  }
  return context
}
