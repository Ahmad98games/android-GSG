import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function audit() {
  console.log('--- SOVEREIGN DB AUDIT ---');
  
  const tables = ['parties', 'articles', 'batches', 'old_parties', 'old_articles', 'old_batches', 'migration_snapshots'];
  
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${t}: ${error.message}`);
    } else {
      console.log(`✅ ${t}: ${count} rows`);
    }
  }
}

audit();
