// @ts-expect-error: Deno standard library
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error: Supabase JS library
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * WHATSAPP ORDER NOTIFIER (v7.1)
 * Automated transactional messaging for Gold She customers.
 */

serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const { record, old_record } = payload

    // Only trigger if status changed
    if (record.status === old_record?.status) {
      return new Response('NO_STATUS_CHANGE', { status: 200 })
    }

    const supabase = createClient(
      // @ts-expect-error: Deno global
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-expect-error: Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Party Details
    const { data: party } = await supabase
      .from('parties')
      .select('name, phone')
      .eq('id', record.party_id)
      .single()

    if (!party?.phone) return new Response('NO_PHONE_FOUND', { status: 200 })

    // 2. Format Phone (PK Standard)
    const rawPhone = party.phone.replace(/\D/g, '')
    const formattedPhone = rawPhone.startsWith('92') ? rawPhone : `92${rawPhone.replace(/^0/, '')}`

    // 3. Construct Message
    let messageBody = ''
    // @ts-expect-error: Deno global
    const baseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://gold-she-erp.vercel.app'
    const invoiceUrl = `${baseUrl}/invoice/${record.id}`

    switch (record.status) {
      case 'CONFIRMED':
        messageBody = `Salaam ${party.name}! Your order ${record.code} has been confirmed. Total: Rs. ${record.total}. Expected dispatch soon.`
        break
      case 'DISPATCHED':
        messageBody = `Order ${record.code} has been dispatched. Track your delivery via our portal.`
        break
      case 'DELIVERED':
        messageBody = `Order ${record.code} marked as delivered. Balance due: Rs. ${record.total - record.amount_paid}. View invoice: ${invoiceUrl}`
        break
      default:
        return new Response('STATUS_NOT_NOTIFIABLE', { status: 200 })
    }

    // 4. Send via WhatsApp Cloud API
    // @ts-expect-error: Deno global
    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN')
    // @ts-expect-error: Deno global
    const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!whatsappToken || !phoneId) throw new Error('MISSING_WHATSAPP_CONFIG')

    const whatsappResponse = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: messageBody }
      })
    })

    const whResult = await whatsappResponse.json()

    // 5. Trace Log
    await supabase.from('whatsapp_log').insert({
      order_id: record.id,
      phone: formattedPhone,
      status: whResult.error ? 'FAILED' : 'SENT'
    })

    return new Response(JSON.stringify({ success: !whResult.error, result: whResult }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
