import { supabase } from '@/lib/supabase'

export interface InvitationSendParams {
  invitee_email: string
  family_role: string
}

/** Send a new invitation. Calls the Edge Function which enforces the primary group rule. */
export async function sendInvitation(params: InvitationSendParams): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-invitation-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: JSON.stringify({ inviter_user_id: user.id, ...params }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Failed to send invitation')
  }
}

/**
 * Resend an existing pending/expired invitation by id.
 *
 * RACE CONDITION NOTE: The naive approach of (1) send new invitation, then (2) delete old one
 * creates a window where two valid pending invitations exist for the same email+group. If the
 * invitee clicks the original link during that window, both could be accepted.
 *
 * Chosen approach: cancel (delete) the old row FIRST, then create the new one. This ensures
 * only one valid invitation exists at any point. The small window where no invitation exists
 * (between delete and insert) is acceptable — the invitee simply cannot accept during that
 * ~100 ms gap, which is harmless.
 */
export async function resendInvitation(invitationId: string): Promise<void> {
  const { data: inv, error } = await supabase
    .from('family_invitations')
    .select('invitee_email, family_role')
    .eq('id', invitationId)
    .single()

  if (error || !inv) throw new Error('Invitation not found')
  // Cancel old row FIRST to avoid duplicate-invitation race condition
  await cancelInvitation(invitationId)
  // Then create the new invitation (fresh token + expiry)
  await sendInvitation({ invitee_email: inv.invitee_email, family_role: inv.family_role })
}

/**
 * Cancel a pending invitation (inviter cancelling their own sent invite).
 * Deletes the row entirely — does NOT set status to 'declined'.
 * 'declined' is reserved for the invitee refusing; the inviter cancelling should leave no trace.
 * RLS enforces ownership server-side; we also assert a row was actually deleted client-side
 * so misuse (wrong id, already deleted) surfaces as an explicit error rather than silent success.
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error, count } = await supabase
    .from('family_invitations')
    .delete({ count: 'exact' })
    .eq('id', invitationId)

  if (error) throw new Error(error.message)
  if (count === 0) throw new Error('Invitation not found or already cancelled')
}

/**
 * Accept an invitation by token (called from deep link handler).
 * Delegates all validation and writes to the accept_family_invitation security-definer RPC,
 * which bypasses the RLS restriction that would otherwise block a non-owner from inserting
 * into family_group_members.
 */
export async function acceptInvitationByToken(token: string): Promise<{ groupId: string }> {
  if (!token || token.length < 10) throw new Error('Invalid invitation token')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to accept invitation')

  const { data, error } = await supabase.rpc('accept_family_invitation', { p_token: token })

  if (error) throw new Error(error.message)

  // TODO (Plan 9): fire push notification to inviter after acceptance
  return { groupId: (data as { group_id: string }).group_id }
}
