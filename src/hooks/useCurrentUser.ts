import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  date_of_birth: string | null
  profile_photo_url: string | null
  phone: string | null
  address: string | null
  country_of_residency: string | null
  citizenship_countries: string[]
  passport_expiry: string | null
  family_role: string | null
  disability_accessibility_needs: string | null
  medical_conditions: string | null
  medications: string | null
  food_allergies: string | null
  dietary_requirements: string | null
  pref_date_format: string
  pref_time_format: string
  pref_colour_scheme: string
  pref_trip_display_style: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser || !mounted) return

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (mounted) {
        setUser(data as UserProfile)
        setLoading(false)
      }
    }

    fetchUser()

    // Realtime subscription scoped to this user's row only — without the filter
    // every UPDATE on any user row would overwrite local state with another user's data.
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser || !mounted) return
      channel = supabase
        .channel(`user_profile_${authUser.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${authUser.id}` },
          (payload) => { if (mounted) setUser(payload.new as UserProfile) },
        )
        .subscribe()
    })

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return { user, loading }
}
