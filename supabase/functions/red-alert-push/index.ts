// @ts-expect-error: Deno standard library
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error: Supabase JS library
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * RED_ALERT_PUSH HANDLER (v7.1)
 * Industrial security broadcast for Karigar audit deficits.
 */

serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const { record } = payload

    if (record.result !== 'RED_ALERT') {
      return new Response('IGNORING_PASS_RESULT', { status: 200 })
    }

    const supabase = createClient(
      // @ts-expect-error: Deno global
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-expect-error: Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Job Details
    const { data: job } = await supabase
      .from('job_orders')
      .select('code, karigars(name)')
      .eq('id', record.job_order_id)
      .single()

    const karigarName = job?.karigars?.name || 'Unknown'
    const jobCode = job?.code || 'N/A'

    // 2. Fetch Active Roving Managers
    const { data: recipients } = await supabase
      .from('node_registrations')
      .select('push_token, id')
      .eq('role', 'MANAGER_ROVING')
      .eq('is_active', true)
      .not('push_token', 'is', null)

    if (!recipients || recipients.length === 0) {
      return new Response('NO_RECIPIENTS_FOUND', { status: 200 })
    }

    // 3. Dispatch Expo Push Notification
    const messages = recipients.map((r: { push_token: string }) => ({
      to: r.push_token,
      title: "🚨 RED ALERT — Fabric Deficit",
      body: `Job ${jobCode}: ${record.variance} gaz missing. Karigar: ${karigarName}`,
      data: { screen: "job", code: jobCode },
      priority: "high",
      sound: "default"
    }))

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    })

    // 4. Trace Log
    await supabase.from('push_log').insert(
      recipients.map((r: { id: string }) => ({
        notification_type: 'RED_ALERT',
        recipient_node_id: r.id,
        status: 'DISPATCHED'
      }))
    )

    return new Response(JSON.stringify({ success: true, count: recipients.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
