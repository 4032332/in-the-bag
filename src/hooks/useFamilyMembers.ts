import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface FamilyMember {
  user_id: string | null
  guest_profile_id: string | null
  full_name: string
  profile_photo_url: string | null
  family_role: string | null
  is_guest: boolean
  group_ids: string[]
}

export function useFamilyMembers(currentUserId: string | undefined) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId) return

    let mounted = true

    const load = async () => {
      // Step 1: get all groups current user belongs to
      const { data: memberships } = await supabase
        .from('family_group_members')
        .select('family_group_id')
        .eq('user_id', currentUserId)

      const groupIds = (memberships ?? []).map((m) => m.family_group_id)

      if (groupIds.length === 0) {
        if (mounted) {
          setMembers([])
          setLoading(false)
        }
        return
      }

      // Step 2: get all members of those groups (linked accounts)
      const { data: allMembers } = await supabase
        .from('family_group_members')
        .select('family_group_id, user_id, role, users(id, full_name, profile_photo_url, family_role)')
        .in('family_group_id', groupIds)
        .neq('user_id', currentUserId)

      // Step 3: get guest profiles managed by current user
      const { data: guests } = await supabase
        .from('guest_profiles')
        .select('id, full_name, profile_photo_url, family_role')
        .eq('managed_by_user_id', currentUserId)

      if (!mounted) return

      // Deduplicate by user_id
      const seen = new Map<string, FamilyMember>()
      for (const m of allMembers ?? []) {
        if (!m.user_id) continue
        if (seen.has(m.user_id)) {
          seen.get(m.user_id)!.group_ids.push(m.family_group_id)
        } else {
          const u = m.users as unknown as { id: string; full_name: string | null; profile_photo_url: string | null; family_role: string | null } | null
          seen.set(m.user_id, {
            user_id: m.user_id,
            guest_profile_id: null,
            full_name: u?.full_name ?? 'Unknown',
            profile_photo_url: u?.profile_photo_url ?? null,
            family_role: u?.family_role ?? null,
            is_guest: false,
            group_ids: [m.family_group_id],
          })
        }
      }
      const linked: FamilyMember[] = Array.from(seen.values())

      const guestMembers: FamilyMember[] = (guests ?? []).map((g) => ({
        user_id: null,
        guest_profile_id: g.id,
        full_name: g.full_name,
        profile_photo_url: g.profile_photo_url,
        family_role: g.family_role,
        is_guest: true,
        group_ids: [],
      }))

      setMembers([...linked, ...guestMembers])
      setLoading(false)
    }

    load()

    // Since this pulls from multiple tables, setting up realtime for all is complex.
    // For MVP, we'll re-fetch on focus or rely on manual refresh, or we can add a basic 
    // channel on `family_group_members` and `guest_profiles`.
    const channel1 = supabase.channel('family_group_members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_group_members' }, load)
      .subscribe()
    const channel2 = supabase.channel('guest_profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_profiles' }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [currentUserId])

  return { members, loading }
}
