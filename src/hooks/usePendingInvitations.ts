import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface PendingInvitation {
  id: string
  invitee_email: string
  family_role: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  expires_at: string
}

export function usePendingInvitations(inviterUserId: string | undefined) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])

  useEffect(() => {
    if (!inviterUserId) return

    let mounted = true

    const load = async () => {
      const { data } = await supabase
        .from('family_invitations')
        .select('id, invitee_email, family_role, status, created_at, expires_at')
        .eq('inviter_user_id', inviterUserId)
        .in('status', ['pending', 'expired'])
        .order('created_at', { ascending: false })

      if (mounted) {
        setInvitations((data as PendingInvitation[]) ?? [])
      }
    }

    load()

    const channel = supabase
      .channel('pending_invitations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_invitations', filter: `inviter_user_id=eq.${inviterUserId}` }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [inviterUserId])

  return invitations
}
