import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') || ''

// Note: Register this URL as the webhook endpoint in RevenueCat dashboard:
// https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook

serve(async (req: Request) => {
  // Reject startup-misconfigured deployments immediately — an empty secret would
  // allow any request with an empty Authorization header to pass validation.
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.error('REVENUECAT_WEBHOOK_SECRET is not set')
    return new Response('Service misconfigured', { status: 500 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== REVENUECAT_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const payload = await req.json()
    const { event } = payload

    if (!event || !event.type) {
      return new Response('Bad Request: Missing event type', { status: 400 })
    }

    const app_user_id = event.app_user_id
    const product_identifier = event.product_id || event.product_identifier
    const type = (product_identifier && product_identifier.includes('lifetime')) ? 'lifetime' : 'monthly'
    let status: 'active' | 'cancelled' | 'expired' = 'active'

    let expires_at = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null
    
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        status = 'active'
        break
      case 'CANCELLATION':
        status = 'cancelled'
        break
      case 'EXPIRATION':
        status = 'expired'
        expires_at = new Date().toISOString()
        break
      default:
        // Unhandled event type, just return 200 to acknowledge
        return new Response('OK', { status: 200 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Upsert the subscription record
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: app_user_id,
      type,
      status,
      expires_at,
      revenuecat_customer_id: event.original_app_user_id || app_user_id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase Error:', error)
      return new Response(`Error updating database: ${error.message}`, { status: 500 })
    }

    return new Response('OK', { status: 200 })

  } catch (error: any) {
    console.error('Error parsing webhook payload:', error)
    return new Response(`Bad Request: ${error.message}`, { status: 400 })
  }
})
