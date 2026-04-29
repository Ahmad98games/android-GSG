// @ts-expect-error: Deno standard library
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error: Supabase JS library
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  const body = await req.json();
  const { record, old_record, type, test, token, phoneId, phone: testPhone } = body;
  
  // @ts-expect-error: Deno global
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let status, order_id, party_id, phone, messageText;

  if (test) {
    status = 'TEST';
    phone = testPhone.replace(/^0/, '+92').replace(/[^\d+]/g, '');
    messageText = 'Industrial System: WhatsApp API integration verified successfully.';
  } else {
    // We only care about UPDATE on orders where status changed
    if (type !== 'UPDATE') return new Response('Not an update', { status: 200 });
    if (record.status === old_record.status) return new Response('Status unchanged', { status: 200 });
    
    status = record.status;
    order_id = record.id;
    party_id = record.party_id;

    if (!['CONFIRMED', 'DISPATCHED', 'DELIVERED'].includes(status)) {
      return new Response('Status not relevant', { status: 200 });
    }

    const { data: party } = await supabase.from('parties').select('name, phone').eq('id', party_id).single();
    if (!party?.phone) return new Response('No phone', { status: 400 });

    const { data: order } = await supabase.from('orders').select('code, total, amount_paid').eq('id', order_id).single();
    const balance = parseFloat(order.total) - parseFloat(order.amount_paid);

    const messages: Record<string, string> = {
      CONFIRMED: `Order ${order.code} confirm ho gaya hai. Total: Rs. ${parseFloat(order.total).toLocaleString('en-PK')}.`,
      DISPATCHED: `Order ${order.code} dispatch ho gaya hai.`,
      DELIVERED: `Order ${order.code} deliver ho gaya. Balance: Rs. ${balance.toLocaleString('en-PK')}.`,
    };

    messageText = messages[status];
    phone = party.phone.replace(/^0/, '+92').replace(/[^\d+]/g, '');
  }

  if (!messageText) return new Response('No template', { status: 400 });

  // @ts-expect-error: Deno global
  const activeToken = test ? token : Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  // @ts-expect-error: Deno global
  const activePhoneId = test ? phoneId : Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  const waResponse = await fetch(
    'https://graph.facebook.com/v18.0/' + activePhoneId + '/messages',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + activeToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: messageText }
      })
    }
  );

  const waResult = await waResponse.json();

  await supabase.from('whatsapp_log').insert({
    party_id: test ? null : party_id, 
    order_id: test ? null : order_id, 
    status_trigger: status,
    phone, 
    message: messageText,
    api_status: waResponse.status,
    api_response: waResult,
    sent_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({ success: waResponse.ok, result: waResult }), { status: 200 });
});
