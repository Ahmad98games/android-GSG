// @ts-expect-error: Deno standard library
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error: Supabase JS library
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, device_name, device_fingerprint, public_key_pem } = await req.json();
    const supabase = createClient(
      // @ts-expect-error: Deno global
      Deno.env.get('SUPABASE_URL')!, 
      // @ts-expect-error: Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate code server-side
    const { data: token, error: tokenErr } = await supabase
      .from('node_pairing_tokens')
      .select('*')
      .eq('code', code)
      .eq('claimed', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !token) {
      return new Response(JSON.stringify({ error: 'INVALID_OR_EXPIRED_CODE' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Enforce max 10 nodes
    const { count } = await supabase
      .from('node_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (count !== null && count >= 10) {
      return new Response(JSON.stringify({ error: 'MAX_DEVICES_REACHED' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Mark token claimed (atomic — prevents race condition)
    const { error: claimErr } = await supabase
      .from('node_pairing_tokens')
      .update({ claimed: true, device_fingerprint })
      .eq('code', code)
      .eq('claimed', false);

    if (claimErr) {
      return new Response(JSON.stringify({ error: 'CODE_ALREADY_CLAIMED' }), { 
        status: 409, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Register or update node
    const { data: node, error: nodeErr } = await supabase
      .from('node_registrations')
      .upsert({
        node_slot: token.node_slot,
        device_name,
        device_fingerprint,
        role: token.role,
        public_key_pem,
        is_active: true,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'node_slot' })
      .select()
      .single();

    if (nodeErr) {
      return new Response(JSON.stringify({ error: 'REGISTRATION_FAILED', detail: nodeErr.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      node_id: node.id, 
      node_slot: node.node_slot, 
      role: node.role 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'SERVER_ERROR', detail }), { 

      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
