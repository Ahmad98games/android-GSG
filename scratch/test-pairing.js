const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('node_pairing_tokens').insert({
    code: '123456',
    node_slot: 1,
    role: 'FIELD_NODE',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  }).select();
  
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', JSON.stringify(error, null, 2));
}

test();
