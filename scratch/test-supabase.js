
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('system_settings').select('*').limit(1);
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('Success! Data:', data);
    }
  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

test();
