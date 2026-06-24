import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SubscriptionStatus {
  type: 'monthly' | 'lifetime' | null
  status: 'active' | 'expired' | 'cancelled' | null
  expires_at: string | null
  isPremium: boolean
}

export function useSubscriptionStatus(userId: string): SubscriptionStatus {
  const [sub, setSub] = useState<SubscriptionStatus>({ type: null, status: null, expires_at: null, isPremium: false })

  useEffect(() => {
    if (!userId) return
    
    supabase
      .from('subscriptions')
      .select('type, status, expires_at')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const isPremium =
          data.status === 'active' &&
          (data.type === 'lifetime' || (data.expires_at && new Date(data.expires_at) > new Date()))
        setSub({ ...data, isPremium })
      })
  }, [userId])

  return sub
}
