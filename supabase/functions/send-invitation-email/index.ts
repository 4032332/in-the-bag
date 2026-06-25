import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY environment variable is required')
const resend = new Resend(RESEND_API_KEY)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // C1: Verify caller identity from JWT — prevent impersonation
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user: callerUser }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !callerUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { inviter_user_id, invitee_email, family_role } = await req.json()

  // Verify the caller is who they claim to be
  if (callerUser.id !== inviter_user_id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

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

  // I2: URL-encode token in deep link
  const deepLink = `inthebag://invite?token=${encodeURIComponent(token)}`
  const appStoreLink = 'https://apps.apple.com/app/in-the-bag/id1234567890'
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
