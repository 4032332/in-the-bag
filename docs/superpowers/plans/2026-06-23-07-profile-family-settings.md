# Profile, Family & Settings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Profile tab (My Details, Family Members, Trip History) and Settings screen (Preferences + Account management) including the complete family invitation flow with deep link handling.

**Architecture:** Profile is a tab-level feature with four sub-screens; all user and family data lives in Supabase with RLS enforced. The family invitation flow spans a Resend email, a deep link token handled by Expo Linking, and database writes across `family_invitations` and `family_group_members`. Settings preferences are written directly to the `users` table and reflected app-wide via a React Context.

**Tech Stack:** Expo Router (file-based routing), Supabase JS client (direct CRUD + RLS), Expo Image Picker (camera + library), Supabase Storage (profile photos), Resend API via Supabase Edge Function (invitation emails), Expo Linking (deep link handling), RevenueCat SDK (subscription display stubs), MMKV (local preference cache).

---

## File Structure

```
app/
  (tabs)/
    profile/
      index.tsx                     # Profile tab root — sub-tab picker (My Details | Family | Trip History | Stats)
      my-details.tsx                # User profile edit screen
      family-members.tsx            # Family Members screen
      trip-history.tsx              # Read-only past trips list
  settings/
    index.tsx                       # Settings root (Preferences + Account sections)
  _layout.tsx                       # (existing) — deep link route registered here

components/
  profile/
    ProfilePhotoUploader.tsx        # Camera / library picker + Supabase Storage upload
    CitizenshipCountryPicker.tsx    # Multi-select country picker
    FamilyRolePicker.tsx            # Segmented or list picker for family_role enum
    FamilyMemberCard.tsx            # Card for linked account or guest profile
    GuestProfileSheet.tsx           # Bottom sheet — add/edit guest profile
    InvitationSheet.tsx             # Bottom sheet — enter email + select role + send
    PendingInvitationRow.tsx        # Row with status pill + resend/cancel actions
  settings/
    PreferencesSection.tsx          # Date/time format, colour scheme, display style
    AccountSection.tsx              # Subscription info, change email/password, sign out, delete

hooks/
  useCurrentUser.ts                 # Reads + subscribes to users row for current auth user
  useFamilyMembers.ts               # Merges all family groups the user belongs to
  usePendingInvitations.ts          # Live query of family_invitations for current user
  useSubscriptionStatus.ts          # Reads subscriptions table + RevenueCat status

lib/
  invitations.ts                    # send/resend/cancel invitation helpers + deep link acceptance
  profilePhoto.ts                   # pick image → compress → upload to storage → return URL
  deleteAccount.ts                  # Supabase + RevenueCat customer deletion

supabase/
  functions/
    send-invitation-email/
      index.ts                      # Edge Function — calls Resend, creates family_invitations row
    expire-invitations/
      index.ts                      # Scheduled Edge Function — sets status=expired for stale rows

constants/
  countries.ts                      # ISO country list for residency + citizenship pickers
```

---

## Tasks

### Task 1 — family_groups auto-creation hook (account creation)

> Prerequisite for all invitation flows. Implements the rule: every user must own a family_group at account creation.

- [ ] 1.1 In `supabase/functions/` (or as a Postgres trigger), create an `on_auth_user_created` trigger function that:
  - Inserts a row into `family_groups` (`name = full_name + "'s Family"`, `created_by_user_id = new.id`)
  - Inserts a row into `family_group_members` (`family_group_id = <new group id>`, `user_id = new.id`, `role = 'owner'`)
  - Uses a Postgres `AFTER INSERT ON auth.users` trigger so it fires atomically at account creation

  ```sql
  -- supabase/migrations/YYYYMMDDHHMMSS_family_group_auto_create.sql

  CREATE OR REPLACE FUNCTION public.handle_new_user_family_group()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    v_group_id uuid;
  BEGIN
    INSERT INTO public.family_groups (name, created_by_user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Family',
      NEW.id
    )
    RETURNING id INTO v_group_id;

    INSERT INTO public.family_group_members (family_group_id, user_id, role)
    VALUES (v_group_id, NEW.id, 'owner');

    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER on_auth_user_created_family_group
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_family_group();
  ```

- [ ] 1.2 Write a migration test (in `supabase/tests/` using pgTAP or a Jest Supabase test client):
  - Create a test auth user → assert `family_groups` row exists with `created_by_user_id` matching the user
  - Assert `family_group_members` row exists with `role = 'owner'`

- [ ] 1.3 Verify the trigger fires in the local Supabase dev environment (`supabase start` + manual sign-up)

- [ ] 1.4 Commit: `feat: add postgres trigger to auto-create family_group on user sign-up`

---

### Task 2 — Invitation Edge Function (send-invitation-email)

- [ ] 2.1 Create `supabase/functions/send-invitation-email/index.ts`:

  ```typescript
  // supabase/functions/send-invitation-email/index.ts
  import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
  import { Resend } from 'https://esm.sh/resend@2'

  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  serve(async (req) => {
    const { inviter_user_id, invitee_email, family_role } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Resolve the inviter's owned family group (primary group rule)
    const { data: ownedGroup, error: groupErr } = await supabase
      .from('family_groups')
      .select('id')
      .eq('created_by_user_id', inviter_user_id)
      .single()

    if (groupErr || !ownedGroup) {
      return new Response(JSON.stringify({ error: 'No owned family group found' }), { status: 400 })
    }

    // Get inviter's display name
    const { data: inviter } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', inviter_user_id)
      .single()

    // Generate token + expiry
    const token = crypto.randomUUID()
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // Insert invitation row
    const { data: invitation, error: invErr } = await supabase
      .from('family_invitations')
      .insert({
        inviter_user_id,
        invitee_email,
        family_role,
        family_group_id: ownedGroup.id,
        status: 'pending',
        token,
        expires_at,
      })
      .select()
      .single()

    if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), { status: 500 })
    }

    // Deep link: inthebag://invite?token=<token>
    const deepLink = `inthebag://invite?token=${token}`
    const appStoreLink = 'https://apps.apple.com/app/in-the-bag/idXXXXXXXXXX' // replace with real ID
    const inviterName = inviter?.full_name ?? 'Someone'

    // Send branded email via Resend
    await resend.emails.send({
      from: 'In the Bag <hello@inthebag.app>',
      to: invitee_email,
      subject: `${inviterName} has invited you to join their family on In the Bag`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Family Invitation</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F6F0; margin: 0; padding: 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08);">
            <tr>
              <td style="background: #2C3E50; padding: 32px 40px; text-align: center;">
                <h1 style="color: #FFFFFF; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">In the Bag</h1>
                <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 8px 0 0;">Holiday planning, together</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 40px 32px;">
                <h2 style="font-size: 22px; font-weight: 600; color: #1A1A2E; margin: 0 0 16px;">You have been invited</h2>
                <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px;">
                  <strong>${inviterName}</strong> has invited you to join their family on In the Bag
                  as <strong>${family_role}</strong>.
                </p>
                <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 32px;">
                  Once you join, you can plan holidays together, share packing lists, and keep track of every trip detail — all in one place.
                </p>
                <table cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                  <tr>
                    <td style="background: #2C3E50; border-radius: 12px; padding: 16px 32px; text-align: center;">
                      <a href="${deepLink}" style="color: #FFFFFF; text-decoration: none; font-size: 17px; font-weight: 600;">Accept Invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="font-size: 13px; color: #999; text-align: center; margin: 0 0 8px;">
                  If the button does not open the app, download In the Bag first:
                </p>
                <p style="font-size: 13px; text-align: center; margin: 0 0 32px;">
                  <a href="${appStoreLink}" style="color: #2C3E50;">Download on the App Store</a>
                </p>
                <hr style="border: none; border-top: 1px solid #EFEFEF; margin: 0 0 24px;">
                <p style="font-size: 12px; color: #BBB; margin: 0;">
                  This invitation expires in 14 days. If you did not expect this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    return new Response(JSON.stringify({ invitation_id: invitation.id }), { status: 200 })
  })
  ```

- [ ] 2.2 Add `RESEND_API_KEY` to Supabase Edge Function secrets (document in `.env.example`)

- [ ] 2.3 Write integration test for the Edge Function:
  - Mock Resend (inject a stub transport)
  - Call function with a valid `inviter_user_id`
  - Assert `family_invitations` row created with `status = 'pending'` and correct `family_group_id` matching the inviter's owned group (primary group rule)
  - Assert token is a valid UUID and `expires_at` is ~14 days ahead

- [ ] 2.4 Commit: `feat: add send-invitation-email edge function with Resend + primary group rule`

---

### Task 3 — Invitation expiry Edge Function (scheduled)

- [ ] 3.1 Create `supabase/functions/expire-invitations/index.ts`:

  ```typescript
  // supabase/functions/expire-invitations/index.ts
  import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

  serve(async () => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error } = await supabase
      .from('family_invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('expire-invitations error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  })
  ```

- [ ] 3.2 Register the function as a scheduled cron job in `supabase/config.toml` (or Supabase dashboard):
  - Schedule: `0 * * * *` (hourly)
  - Function: `expire-invitations`

- [ ] 3.3 Commit: `feat: add expire-invitations scheduled edge function`

---

### Task 4 — Deep link handling (accept invitation)

- [ ] 4.1 Register the `inthebag://invite` deep link scheme in `app.json` / `app.config.ts`:

  ```json
  "scheme": "inthebag",
  "intentFilters": [
    {
      "action": "VIEW",
      "data": [{ "scheme": "inthebag", "host": "invite" }],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
  ```

- [ ] 4.2 Create `lib/invitations.ts` with the full acceptance flow:

  ```typescript
  // lib/invitations.ts
  import { supabase } from './supabaseClient'

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
   */
  export async function cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('family_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) throw new Error(error.message)
  }

  /**
   * Accept an invitation by token (called from deep link handler).
   * Validates: token exists, status = pending, not expired.
   * On success: updates status → accepted, inserts family_group_members row.
   */
  export async function acceptInvitationByToken(token: string): Promise<{ groupId: string }> {
    if (!token || token.length < 10) throw new Error('Invalid invitation token')

    const { data: invitation, error: fetchErr } = await supabase
      .from('family_invitations')
      .select('id, family_group_id, status, expires_at, family_role')
      .eq('token', token)
      .single()

    if (fetchErr || !invitation) throw new Error('Invitation not found')
    if (invitation.status !== 'pending') throw new Error(`Invitation is ${invitation.status}`)
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark expired in case cron hasn't run yet
      await supabase.from('family_invitations').update({ status: 'expired' }).eq('id', invitation.id)
      throw new Error('Invitation has expired')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be logged in to accept invitation')

    // Add to family group — ignore if already a member
    await supabase.from('family_group_members').upsert(
      { family_group_id: invitation.family_group_id, user_id: user.id, role: invitation.family_role },
      { onConflict: 'family_group_id,user_id', ignoreDuplicates: true },
    )

    // Mark invitation accepted
    await supabase
      .from('family_invitations')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Notify the inviter that their invitation was accepted.
    // Fetch the invitee's display name for the notification payload, then call
    // sendFamilyAcceptedNotification(inviteeName) — defined in Plan 9 — which
    // delivers a push notification to the inviter via Supabase Realtime or direct
    // push. Reference Plan 9 for the full implementation of that function.
    const { data: inviteUser } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const inviteeName = inviteUser?.full_name ?? invitee_email
    // TODO (Plan 9): await sendFamilyAcceptedNotification({ inviterUserId: invitation.inviter_user_id, inviteeName })

    return { groupId: invitation.family_group_id }
  }
  ```

- [ ] 4.3 Register a deep link listener in `app/_layout.tsx` using `expo-linking`:

  ```typescript
  // Inside the root layout's useEffect
  import * as Linking from 'expo-linking'
  import { acceptInvitationByToken } from '@/lib/invitations'
  import { router } from 'expo-router'

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url)
      if (parsed.hostname === 'invite' && parsed.queryParams?.token) {
        const token = parsed.queryParams.token as string
        try {
          await acceptInvitationByToken(token)
          // Navigate to Family Members tab so user sees the new member
          router.replace('/(tabs)/profile/family-members')
        } catch (err: any) {
          // Show an alert with the error message
          Alert.alert('Invitation Error', err.message)
        }
      }
    }

    // Handle URL that launched the app
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url) })

    // Handle URL while app is foregrounded
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    return () => sub.remove()
  }, [])
  ```

- [ ] 4.4 Write unit tests for `acceptInvitationByToken` (using a Supabase test client or mocked Supabase):
  - Scenario A: valid token, status=pending, not expired → expect `family_group_members` row inserted, `status` set to `accepted`
  - Scenario B: token not found → expect thrown error "Invitation not found"
  - Scenario C: status=accepted (already used) → expect thrown error "Invitation is accepted"
  - Scenario D: status=pending but `expires_at` in the past → expect thrown error "Invitation has expired" and status updated to `expired`
  - Scenario E: primary group rule — assert `family_group_id` on the invitation matches the inviter's owned group (query `family_groups.created_by_user_id`)

- [ ] 4.5 Commit: `feat: deep link handler for invitation acceptance with token validation`

---

### Task 5 — Profile photo upload

- [ ] 5.1 Create `lib/profilePhoto.ts`:

  ```typescript
  // lib/profilePhoto.ts
  import * as ImagePicker from 'expo-image-picker'
  import * as ImageManipulator from 'expo-image-manipulator'
  import { supabase } from './supabaseClient'

  export type PhotoSource = 'library' | 'camera'

  export async function pickAndUploadProfilePhoto(
    userId: string,
    source: PhotoSource,
  ): Promise<string> {
    // Request permissions
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') throw new Error('Camera permission denied')
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') throw new Error('Photo library permission denied')
    }

    // Launch picker
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })

    if (result.canceled || !result.assets?.[0]) throw new Error('No image selected')

    const asset = result.assets[0]

    // Compress and resize to max 400x400
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    )

    // Upload to Supabase Storage
    const path = `profile-photos/${userId}/${Date.now()}.jpg`
    const response = await fetch(manipulated.uri)
    const blob = await response.blob()

    const { error: uploadErr } = await supabase.storage
      .from('user-assets')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

    if (uploadErr) throw new Error(uploadErr.message)

    const { data: { publicUrl } } = supabase.storage.from('user-assets').getPublicUrl(path)

    // Update users row
    const { error: updateErr } = await supabase
      .from('users')
      .update({ profile_photo_url: publicUrl })
      .eq('id', userId)

    if (updateErr) throw new Error(updateErr.message)

    return publicUrl
  }
  ```

- [ ] 5.2 Create `components/profile/ProfilePhotoUploader.tsx`:

  ```typescript
  // components/profile/ProfilePhotoUploader.tsx
  import React from 'react'
  import { View, TouchableOpacity, Image, Text, ActionSheetIOS, StyleSheet, Alert } from 'react-native'
  import { pickAndUploadProfilePhoto } from '@/lib/profilePhoto'

  interface Props {
    userId: string
    currentUrl: string | null
    onUploadComplete: (url: string) => void
  }

  export function ProfilePhotoUploader({ userId, currentUrl, onUploadComplete }: Props) {
    const [uploading, setUploading] = React.useState(false)

    const handlePress = () => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          if (buttonIndex === 2) return
          const source = buttonIndex === 0 ? 'camera' : 'library'
          try {
            setUploading(true)
            const url = await pickAndUploadProfilePhoto(userId, source)
            onUploadComplete(url)
          } catch (err: any) {
            Alert.alert('Upload Error', err.message)
          } finally {
            setUploading(false)
          }
        },
      )
    }

    return (
      <TouchableOpacity onPress={handlePress} style={styles.container} disabled={uploading}>
        {currentUrl ? (
          <Image source={{ uri: currentUrl }} style={styles.photo} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Add Photo</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Uploading...</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const styles = StyleSheet.create({
    container: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', alignSelf: 'center' },
    photo: { width: 96, height: 96 },
    placeholder: { width: 96, height: 96, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
    placeholderText: { fontSize: 12, color: '#888' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    overlayText: { color: '#FFF', fontSize: 12 },
  })
  ```

- [ ] 5.3 Write a unit test for `pickAndUploadProfilePhoto`:
  - Mock `ImagePicker.launchCameraAsync` and `ImagePicker.launchImageLibraryAsync` to return a fake asset URI
  - Mock `ImageManipulator.manipulateAsync` to return the same URI
  - Mock `supabase.storage.upload` to return `{ error: null }`
  - Assert `users.update` called with a URL containing `profile-photos/${userId}/`
  - Test permission-denied path: mock returns `status: 'denied'`, assert throws "Camera permission denied"

- [ ] 5.4 Commit: `feat: profile photo upload (camera + library) to Supabase Storage`

---

### Task 6 — My Details screen

- [ ] 6.1 Create `hooks/useCurrentUser.ts`:

  ```typescript
  // hooks/useCurrentUser.ts
  import { useEffect, useState } from 'react'
  import { supabase } from '@/lib/supabaseClient'

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

      // Realtime subscription for profile updates
      const channel = supabase
        .channel('user_profile')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
          if (mounted) setUser(payload.new as UserProfile)
        })
        .subscribe()

      return () => {
        mounted = false
        supabase.removeChannel(channel)
      }
    }, [])

    return { user, loading }
  }
  ```

- [ ] 6.2 Create `app/(tabs)/profile/my-details.tsx` with all user fields:
  - Sections: Personal (name, DOB, profile photo, family role), Contact (phone, address), Location (country of residency, citizenship countries), Travel (passport expiry), Medical (conditions, medications, food allergies, dietary requirements, disability/accessibility needs)
  - All sections rendered as a `<ScrollView>` with grouped `<TextInput>` / picker fields
  - Edit mode toggled by a top-right Edit / Save button
  - In view mode: fields are read-only `<Text>` cells
  - In edit mode: fields are editable `<TextInput>` or pickers
  - Profile photo uses `ProfilePhotoUploader` component
  - Citizenship countries uses `CitizenshipCountryPicker` (multi-select modal from `constants/countries.ts`)
  - Family role uses `FamilyRolePicker` (picker: mother/father/grandmother/grandfather/other)
  - Passport expiry: date-only input (no time; use `@react-native-community/datetimepicker` in date mode)
  - Save calls `supabase.from('users').update({...fields}).eq('id', user.id)`
  - On save success: show brief toast and exit edit mode

  Key field list in the save payload:
  ```typescript
  const updates = {
    full_name, date_of_birth, phone, address,
    country_of_residency, citizenship_countries,
    passport_expiry, family_role,
    disability_accessibility_needs, medical_conditions,
    medications, food_allergies, dietary_requirements,
  }
  ```

- [ ] 6.3 Create `components/profile/CitizenshipCountryPicker.tsx`:
  - Props: `selected: string[]`, `onchange: (countries: string[]) => void`
  - Renders a tappable field showing selected countries (comma-separated)
  - Tapping opens a `Modal` with a `FlatList` of countries from `constants/countries.ts`
  - Each country row has a checkbox; multi-select allowed
  - "Done" button closes modal and calls `onChange`

- [ ] 6.4 Commit: `feat: My Details screen with all user fields, edit/save flow, and photo uploader`

---

### Task 7 — Family Members screen

- [ ] 7.1 Create `hooks/useFamilyMembers.ts`:

  ```typescript
  // hooks/useFamilyMembers.ts
  import { useEffect, useState } from 'react'
  import { supabase } from '@/lib/supabaseClient'

  export interface FamilyMember {
    user_id: string | null
    guest_profile_id: string | null
    full_name: string
    profile_photo_url: string | null
    family_role: string | null
    is_guest: boolean
    group_ids: string[]
  }

  export function useFamilyMembers(currentUserId: string) {
    const [members, setMembers] = useState<FamilyMember[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const load = async () => {
        // Step 1: get all groups current user belongs to
        const { data: memberships } = await supabase
          .from('family_group_members')
          .select('family_group_id')
          .eq('user_id', currentUserId)

        const groupIds = (memberships ?? []).map((m) => m.family_group_id)

        if (groupIds.length === 0) { setLoading(false); return }

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

        // Deduplicate by user_id — accumulate ALL group_ids the user belongs to.
        // This is critical for the remove-member flow so we know which groups to target.
        const seen = new Map<string, FamilyMember>()
        for (const m of allMembers ?? []) {
          if (!m.user_id) continue
          if (seen.has(m.user_id)) {
            // User already recorded — accumulate the additional group_id
            seen.get(m.user_id)!.group_ids.push(m.family_group_id)
          } else {
            const u = m.users as any
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
    }, [currentUserId])

    return { members, loading }
  }
  ```

- [ ] 7.2 Create `hooks/usePendingInvitations.ts`:

  ```typescript
  // hooks/usePendingInvitations.ts
  import { useEffect, useState } from 'react'
  import { supabase } from '@/lib/supabaseClient'

  export interface PendingInvitation {
    id: string
    invitee_email: string
    family_role: string
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    created_at: string
    expires_at: string
  }

  export function usePendingInvitations(inviterUserId: string) {
    const [invitations, setInvitations] = useState<PendingInvitation[]>([])

    useEffect(() => {
      const load = async () => {
        const { data } = await supabase
          .from('family_invitations')
          .select('id, invitee_email, family_role, status, created_at, expires_at')
          .eq('inviter_user_id', inviterUserId)
          .in('status', ['pending', 'expired'])
          .order('created_at', { ascending: false })

        setInvitations((data as PendingInvitation[]) ?? [])
      }

      load()

      const channel = supabase
        .channel('pending_invitations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_invitations', filter: `inviter_user_id=eq.${inviterUserId}` }, load)
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }, [inviterUserId])

    return invitations
  }
  ```

- [ ] 7.3 Create `app/(tabs)/profile/family-members.tsx`:
  - Three sections rendered in a `<SectionList>`:
    1. **Linked Accounts** — accepted members from `useFamilyMembers` (non-guest only). Each row: `FamilyMemberCard` with profile photo, name, role. Tap → view/edit details. Long-press or swipe → "Remove from family" action sheet (removes from all groups the current user owns, does not delete account).
    2. **Guest Profiles** — guest members from `useFamilyMembers`. Each row: `FamilyMemberCard`. Tap → `GuestProfileSheet` in edit mode. Swipe → delete guest profile.
    3. **Pending Invitations** — from `usePendingInvitations`. Each row: `PendingInvitationRow` with email, role, status pill (Pending / Expired), resend button, cancel button.
  - FAB (tab-bar + button): action sheet with "Send Invitation" and "Add Guest Profile"

- [ ] 7.4 Create `components/profile/InvitationSheet.tsx` (bottom sheet):
  - Fields: email `<TextInput>`, family role `FamilyRolePicker`
  - Validate email format before send
  - "Send Invitation" button calls `sendInvitation()` from `lib/invitations.ts`
  - Shows loading state during API call; dismisses sheet on success; shows error alert on failure

- [ ] 7.5 Create `components/profile/PendingInvitationRow.tsx`:
  - Props: `invitation: PendingInvitation`, `onResend: (id) => void`, `onCancel: (id) => void`
  - Shows: email, role, status pill (`Pending` = amber, `Expired` = grey)
  - Resend button (calls `resendInvitation(id)`); Cancel button (calls `cancelInvitation(id)`)
  - Resend is available for both `pending` and `expired` status rows

- [ ] 7.6 Create `components/profile/GuestProfileSheet.tsx` (bottom sheet):
  - Fields must match **only** the columns that exist in the `guest_profiles` table (spec Section 6):
    `full_name`, `date_of_birth`, `profile_photo_url`, `family_role`, `disability_accessibility_needs`,
    `medical_conditions`, `medications`, `food_allergies`, `dietary_requirements`.
  - Do NOT include address, country_of_residency, citizenship_countries, or passport_expiry — these
    columns do not exist on `guest_profiles` and must not be saved or displayed here.
  - On save: upsert `guest_profiles` row with `managed_by_user_id = currentUserId` using only the fields above.
  - Profile photo upload uses `ProfilePhotoUploader` with `userId` set to `managed_by_user_id` but stored under `guest-photos/` prefix.

- [ ] 7.7 Write tests:
  - `useFamilyMembers`: mock Supabase, assert deduplication — user who appears in two groups appears once
  - `InvitationSheet`: enter valid email + role → submit → assert `sendInvitation` called with correct params
  - `InvitationSheet`: enter invalid email → assert validation error shown, `sendInvitation` not called
  - `PendingInvitationRow`: resend button visible for both `pending` and `expired` rows

- [ ] 7.8 Commit: `feat: Family Members screen with linked accounts, guest profiles, and pending invitations`

---

### Task 8 — Trip History screen

- [ ] 8.1 Create `app/(tabs)/profile/trip-history.tsx`:

  ```typescript
  // app/(tabs)/profile/trip-history.tsx
  import React, { useEffect, useState } from 'react'
  import { FlatList, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
  import { supabase } from '@/lib/supabaseClient'
  import { router } from 'expo-router'

  interface PastTrip {
    id: string
    name: string
    cover_photo_url: string | null
    created_at: string
    trip_destinations: { city: string; country: string; start_date: string; end_date: string }[]
  }

  export default function TripHistoryScreen() {
    const [trips, setTrips] = useState<PastTrip[]>([])

    useEffect(() => {
      const load = async () => {
        const today = new Date().toISOString().split('T')[0]
        // Past trips: all destination end_dates are before today
        const { data } = await supabase
          .from('trips')
          .select('id, name, cover_photo_url, created_at, trip_destinations(city, country, start_date, end_date)')
          .order('created_at', { ascending: false })

        // Filter to trips where all destinations have ended
        const past = (data ?? []).filter((trip: any) =>
          trip.trip_destinations.length > 0 &&
          trip.trip_destinations.every((d: any) => d.end_date < today),
        )
        setTrips(past)
      }
      load()
    }, [])

    return (
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={styles.empty}>No past trips yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id, readOnly: 'true' } })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.dest}>
              {item.trip_destinations.map((d) => `${d.city}, ${d.country}`).join(' — ')}
            </Text>
          </TouchableOpacity>
        )}
      />
    )
  }

  const styles = StyleSheet.create({
    empty: { textAlign: 'center', color: '#999', marginTop: 48 },
    row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
    name: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
    dest: { fontSize: 13, color: '#777', marginTop: 4 },
  })
  ```

- [ ] 8.2 Ensure the Trip Screen accepts a `readOnly` param and disables all edit actions when `readOnly === 'true'` (this wires into the existing Trip Screen from Plan 2; verify the param is passed and respected)

- [ ] 8.3 Commit: `feat: Trip History screen — read-only list of past trips`

---

### Task 9 — Profile tab root

- [ ] 9.1 Create `app/(tabs)/profile/index.tsx`:
  - Renders a segmented control or top-tab navigator: My Details | Family | Trip History | Stats
  - Profile photo + name in a header above the tabs (sourced from `useCurrentUser`)
  - Gold ring around profile photo when subscription is active (reads from `useSubscriptionStatus`)
  - If no profile photo, shows initials avatar (from `full_name`) or silhouette
  - The Stats sub-tab renders the same `StatsScreen` component used by the Stats bottom tab (imported, not duplicated)

- [ ] 9.2 Commit: `feat: Profile tab root with sub-tab navigator and profile header`

---

### Task 10 — Settings screen

- [ ] 10.1 Create `hooks/useSubscriptionStatus.ts`:

  ```typescript
  // hooks/useSubscriptionStatus.ts
  import { useEffect, useState } from 'react'
  import { supabase } from '@/lib/supabaseClient'

  export interface SubscriptionStatus {
    type: 'monthly' | 'lifetime' | null
    status: 'active' | 'expired' | 'cancelled' | null
    expires_at: string | null
    isPremium: boolean
  }

  export function useSubscriptionStatus(userId: string): SubscriptionStatus {
    const [sub, setSub] = useState<SubscriptionStatus>({ type: null, status: null, expires_at: null, isPremium: false })

    useEffect(() => {
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
  ```

- [ ] 10.2 Create `lib/deleteAccount.ts`:

  ```typescript
  // lib/deleteAccount.ts
  import { supabase } from './supabaseClient'

  /**
   * Permanently deletes the current user's account.
   * This is irreversible. Caller must confirm typed confirmation before calling.
   */
  export async function deleteAccount(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // RevenueCat: delete customer record via Edge Function (stub — replace with real RevenueCat API call)
    await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-revenuecat-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ user_id: user.id }),
    })

    // Delete Supabase auth user (cascades to all user data via ON DELETE CASCADE).
    // IMPORTANT — CASCADE dependency: this RPC relies on ON DELETE CASCADE foreign keys
    // being correctly defined in the Plan 1 schema migration. Before implementing, verify
    // that the Plan 1 migration includes CASCADE on ALL FK relationships from users.id:
    //   • trip_participants (via user_id → users.id)
    //   • family_group_members (user_id → users.id)
    //   • guest_profiles (managed_by_user_id → users.id)
    //   • subscriptions (user_id → users.id)
    //   • async_jobs (user_id → users.id)
    // If any CASCADE definitions are missing from Plan 1, add a migration patch here
    // in Task 10 before this RPC is called.
    const { error } = await supabase.rpc('delete_current_user')
    if (error) throw new Error(error.message)

    await supabase.auth.signOut()
  }
  ```

  Note: `delete_current_user` is a Postgres security-definer RPC that calls `auth.users` deletion. Add migration:

  ```sql
  -- supabase/migrations/YYYYMMDDHHMMSS_delete_current_user_rpc.sql
  CREATE OR REPLACE FUNCTION public.delete_current_user()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    DELETE FROM auth.users WHERE id = auth.uid();
  END;
  $$;
  ```

- [ ] 10.3 Create `app/settings/index.tsx` with two sections:

  **Preferences section** (`components/settings/PreferencesSection.tsx`):
  - Date format: picker with options `DD-MM-YYYY` (default) / `YYYY-MM-DD` / `MM-DD-YYYY` / `DD-Month`
  - Time format: segmented control `12hr` / `24hr`
  - Colour scheme: segmented control `Light` / `Dark` / `Auto`
  - Display style: `Tiles` / `Stacked` / `Treasure Map` — Treasure Map option is rendered greyed out with a "Premium" badge for free users; tapping it shows the standard upgrade prompt sheet rather than selecting it
  - On any preference change: call `supabase.from('users').update({ pref_X: value }).eq('id', userId)` and update local MMKV cache for immediate UI application

  **Account section** (`components/settings/AccountSection.tsx`):
  - Subscription row: shows plan type + expiry if monthly, or "Lifetime" if lifetime, or "Free" if no active sub
  - Upgrade button (free users only): opens RevenueCat paywall (stub: `Purchases.presentPaywallIfNeeded()`)
  - Manage Subscription: `Linking.openURL('https://apps.apple.com/account/subscriptions')` — links to App Store
  - Restore Purchase: calls `Purchases.restorePurchases()` (RevenueCat)
  - Change Email: taps → shows a `Modal` with a `TextInput` for new email + "Send Verification" button → calls `supabase.auth.updateUser({ email: newEmail })` → shows "Check your inbox to confirm the new email address"
  - Change Password: before rendering this option, check `session.user.app_metadata.providers` (or the `identities` array on the user object). If the user signed in exclusively via Apple or Google (i.e., no `email` provider present), replace the "Change Password" row with a read-only label "Password managed by Apple / Google" and do NOT render the password modal or call `supabase.auth.updateUser({ password })`. Only show the full Change Password modal when an email/password identity exists.
  - Sign Out: calls `supabase.auth.signOut()` → navigates to auth root
  - Delete Account: taps → shows an `Alert` with a `TextInput` prompt requiring the user to type `DELETE` (exact, case-sensitive); if confirmation does not match, "Delete Account" button stays disabled; once confirmed, calls `deleteAccount()` from `lib/deleteAccount.ts`; navigates to auth root on success

- [ ] 10.4 Write tests:
  - Delete account confirmation guard: render the delete confirmation UI in isolation; assert "Delete Account" button is disabled when input is empty; assert it remains disabled when input is `delete` (lowercase); assert it becomes enabled only when input is `DELETE`; simulate tap → assert `deleteAccount()` called
  - Change email: mock `supabase.auth.updateUser` → assert called with `{ email: newEmail }` when form submitted
  - Preference save: change date format → assert `supabase.from('users').update` called with correct key

- [ ] 10.5 Commit: `feat: Settings screen with preferences, account management, and delete-account guard`

---

### Task 11 — Integration smoke tests and polish

- [ ] 11.1 End-to-end invitation flow smoke test (manual or with Detox):
  - User A sends invitation to User B's email
  - Assert `family_invitations` row created with `status = pending` and `family_group_id` = User A's owned group
  - Simulate User B tapping deep link (`inthebag://invite?token=<token>`)
  - Assert `family_group_members` row created for User B in User A's group
  - Assert `family_invitations.status` = `accepted`
  - Assert User B appears in User A's Family Members screen under Linked Accounts
  - Assert User B does NOT appear in Pending Invitations section

- [ ] 11.2 Verify profile photo tab bar icon:
  - Set profile photo → confirm tab bar Profile icon updates to circular crop of photo
  - Set active premium subscription → confirm gold ring appears on tab bar icon
  - Remove subscription → confirm gold ring disappears

- [ ] 11.3 Verify Treasure Map display style gating in Settings:
  - Free user: Treasure Map option greyed out, tapping shows upgrade prompt, preference not saved
  - Premium user: Treasure Map option selectable, saving updates `pref_trip_display_style`

- [ ] 11.4 Commit: `test: integration smoke tests for invitation flow, profile photo, and settings gating`

---

## Dependencies and Assumptions

- **Plan 1 (Foundation) complete:** Supabase client configured, auth flow working, RLS policies in place, `users` table exists with all columns listed in Section 6 of the spec.
- `family_groups`, `family_group_members`, `guest_profiles`, `family_invitations` tables exist (migrations from Plan 1 or added here in Task 1).
- Supabase Storage bucket `user-assets` exists with public read policy for profile photos.
- `expo-image-picker`, `expo-image-manipulator`, `@react-native-community/datetimepicker` installed.
- `resend` npm package available in Deno Edge Function context (via esm.sh).
- RevenueCat SDK installed (`react-native-purchases`); paywall integration is a stub in this plan — full paywall UI is out of scope here.
- The Trip Screen (Plan 2) accepts a `readOnly` URL param; if not yet implemented, add a minimal read-only guard.
- Deep link scheme `inthebag` registered in `app.json` and associated domain configured for Universal Links if targeting iOS 13+ (out of scope for this plan — custom scheme sufficient for MVP).

---

## Review Fixes Applied

The following targeted fixes were applied to this plan on 2026-06-24:

| ID | Location | Fix summary |
|----|----------|-------------|
| **C1** | `cancelInvitation` in `lib/invitations.ts` | Changed from `.update({ status: 'declined' })` to `.delete()`. The inviter cancelling their sent invite should remove the row entirely; 'declined' is reserved for the invitee refusing. |
| **C2** | `useFamilyMembers` deduplication loop | Replaced `Set`-based skip with a `Map` that accumulates all `group_ids` for a user seen in multiple groups. Required for the remove-member flow to target the correct group. |
| **C4** | `GuestProfileSheet` step (Task 7.6) | Restricted the field list to only those columns that exist in the `guest_profiles` table per spec Section 6. Removed address, country_of_residency, citizenship_countries, and passport_expiry. |
| **C5** | `acceptInvitationByToken` in `lib/invitations.ts` | Added a push notification trigger step after marking the invitation accepted, referencing Plan 9's `sendFamilyAcceptedNotification(inviteeName)` function. |
| **C6** | `deleteAccount` / `delete_current_user` RPC (Task 10.2) | Added an explicit note documenting the CASCADE dependency on Plan 1 FK definitions, listing all five tables that must CASCADE from `users.id`. |
| **M6** | Change Password in `AccountSection` (Task 10.3) | Added a provider guard: check `app_metadata.providers` / `identities`; replace the Change Password button with a static label for Apple/Google-only users. |
| **M3** | `resendInvitation` in `lib/invitations.ts` | Reordered to cancel (delete) the old invitation row FIRST, then create the new one, eliminating the window where two valid invitations could coexist. Added a race-condition explanation comment. |
