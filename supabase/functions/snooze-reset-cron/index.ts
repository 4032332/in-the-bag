import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Check if this is a valid cron trigger (optional security layer, assuming Supabase handles it or checking headers)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Using raw SQL is not directly supported by standard supabase-js without an RPC.
    // Wait, with supabase-js v2 we can't do raw SQL directly.
    // Instead we can query where snoozed_until <= now() and update them.
    
    // First, find all tasks that need resetting
    const nowIso = new Date().toISOString()
    const { data: tasks, error: fetchError } = await supabase
      .from('trip_tasks')
      .select('id')
      .not('snoozed_until', 'is', null)
      .lte('snoozed_until', nowIso)

    if (fetchError) throw fetchError

    let resetCount = 0

    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id)
      
      const { error: updateError } = await supabase
        .from('trip_tasks')
        .update({ snoozed_until: null })
        .in('id', taskIds)

      if (updateError) throw updateError
      
      resetCount = taskIds.length
    }

    console.log(`Reset snoozed_until for ${resetCount} tasks.`)

    return new Response(JSON.stringify({ reset: resetCount }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Cron job error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
