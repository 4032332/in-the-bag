import { supabase } from './supabase'

/**
 * Permanently deletes the current user's account.
 * This is irreversible. Caller must confirm typed confirmation before calling.
 */
export async function deleteAccount(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Delete Storage files before auth user deletion — Storage objects are not FK-linked
  // to auth.users and therefore do not cascade when the auth user is deleted.
  const { data: storageFiles } = await supabase.storage
    .from('user-assets')
    .list(`profile-photos/${user.id}`)

  if (storageFiles && storageFiles.length > 0) {
    const paths = storageFiles.map((f) => `profile-photos/${user.id}/${f.name}`)
    await supabase.storage.from('user-assets').remove(paths)
  }

  // RevenueCat: delete customer record via Edge Function (stub)
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-revenuecat-customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: JSON.stringify({ user_id: user.id }),
  }).catch(() => { /* ignore stub errors */ })

  // Delete Supabase auth user (cascades to all relational user data)
  const { error } = await supabase.rpc('delete_current_user')
  if (error) throw new Error(error.message)

  await supabase.auth.signOut()
}
