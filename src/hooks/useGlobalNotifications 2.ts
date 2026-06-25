import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import {
  sendFamilyInvitationNotification,
  sendFamilyAcceptedNotification,
  sendTreasureMapReadyNotification,
} from '../notifications/NotificationService'

export function useGlobalNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // 1. Listen for incoming family invitations
    const invitationsReceivedChannel = supabase
      .channel('global-invitations-received')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'family_invitations',
          filter: `invitee_email=eq.${user.email}`,
        },
        (payload) => {
          if ((payload.new as any).status === 'pending') {
            // We ideally need the inviter's name, but we don't have it in the payload.
            // For now, we just pass a generic or "Someone" or fetch it.
            // Given the plan spec, we'll pass 'Someone' if we can't get it immediately, 
            // but let's fetch it for better UX.
            supabase
              .from('users')
              .select('full_name')
              .eq('id', (payload.new as any).inviter_user_id)
              .single()
              .then(({ data }) => {
                const name = (data as any)?.full_name || 'Someone'
                sendFamilyInvitationNotification(name)
              })
          }
        }
      )
      .subscribe()

    // 2. Listen for accepted family invitations
    const invitationsAcceptedChannel = supabase
      .channel('global-invitations-accepted')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'family_invitations',
          filter: `inviter_user_id=eq.${user.id}`,
        },
        (payload) => {
          if ((payload.old as any).status === 'pending' && (payload.new as any).status === 'accepted') {
            // Invitee's name is not in the row, only email.
            const name = (payload.new as any).invitee_email
            sendFamilyAcceptedNotification(name)
          }
        }
      )
      .subscribe()

    // 3. Listen for async jobs (Treasure Map ready)
    const asyncJobsChannel = supabase
      .channel('global-async-jobs')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'async_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (
            (payload.new as any).type === 'treasure_map_generate' &&
            (payload.old as any).status !== 'completed' &&
            (payload.new as any).status === 'completed'
          ) {
            const tripId = (payload.new as any).trip_id
            if (tripId) {
              supabase
                .from('trips')
                .select('name')
                .eq('id', tripId)
                .single()
                .then(({ data }) => {
                  const tripName = (data as any)?.name || 'your trip'
                  sendTreasureMapReadyNotification(tripName, tripId)
                })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(invitationsReceivedChannel)
      supabase.removeChannel(invitationsAcceptedChannel)
      supabase.removeChannel(asyncJobsChannel)
    }
  }, [user])
}
