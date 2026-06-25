import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { scheduleTripNotifications } from './scheduleNotifications'
import { storage } from '@/lib/mmkv'

export function useAppLaunchNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    async function syncUpcomingTrips() {
      const now = new Date().toISOString()
      
      // Query upcoming trips
      const { data, error } = await supabase
        .from('trips')
        .select('id, name, departure_date')
        .gte('departure_date', now)
      
      if (error || !data) return

      for (const trip of (data as any[])) {
        const key = `trip_notif_ids_${(trip as any).id}`
        const cached = storage.getString(key)
        
        // If not scheduled yet, schedule them
        if (!cached) {
          await scheduleTripNotifications({
            id: (trip as any).id,
            name: (trip as any).name,
            departureDateISO: (trip as any).departure_date,
          })
        }
      }
    }

    syncUpcomingTrips()
  }, [user])
}
