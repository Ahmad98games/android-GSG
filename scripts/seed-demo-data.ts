import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * SOVEREIGN INDUSTRIAL SEEDER (v7.1.13)
 * Generates high-fidelity demo data for system exploration.
 */

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function seed() {
  console.log('🌱 SEEDING_INDUSTRIAL_ENVIRONMENT...');

  // 1. Create Profile (Admin)
  const { data: user } = await supabase.auth.admin.listUsers();
  const adminId = user?.users?.[0]?.id || crypto.randomUUID();

  // 2. Create Karigars
  const { data: karigars } = await supabase.from('karigars').insert([
    { name: 'Master Rashid', phone: '0300-1234567', cnic: '35202-1234567-1' },
    { name: 'Ustad Hanif', phone: '0300-7654321', cnic: '35202-7654321-1' }
  ]).select();

  // 3. Create Parties
  const { data: parties } = await supabase.from('parties').insert([
    { name: 'Ahmad Cloth House', type: 'CUSTOMER', phone: '0321-1112223' },
    { name: 'City Wholesale', type: 'CUSTOMER', phone: '0321-4445556' }
  ]).select();

  // 4. Create Articles
  const { data: articles } = await supabase.from('articles').insert([
    { code: 'GS-ART-2025-001', name: 'Premium Lawn Print', desi_color_name: 'Dhani Green', price_per_set: 4500, cost_per_set: 3200, created_by: adminId },
    { code: 'GS-ART-2025-002', name: 'Signature Cotton', desi_color_name: 'Surkh Red', price_per_set: 5200, cost_per_set: 3800, created_by: adminId }
  ]).select();

  // 5. Create Job Orders
  const { data: jobs } = await supabase.from('job_orders').insert([
    { code: 'JO-2025-X1', article_id: articles?.[0]?.id, karigar_id: karigars?.[0]?.id, target_suits: 500, gaz_issued: 1250, status: 'IN_PROGRESS', created_by: adminId },
    { code: 'JO-2025-X2', article_id: articles?.[1]?.id, karigar_id: karigars?.[1]?.id, target_suits: 300, gaz_issued: 750, status: 'ISSUED', created_by: adminId }
  ]).select();

  // 6. Create Batches & Stock
  const { data: batches } = await supabase.from('batches').insert([
    { code: 'B-1001', article_id: articles?.[0]?.id, job_order_id: jobs?.[0]?.id, suits_count: 200, unit_cost: 3200, location: 'Shelf A1', created_by: adminId },
    { code: 'B-1002', article_id: articles?.[1]?.id, job_order_id: jobs?.[1]?.id, suits_count: 150, unit_cost: 3800, location: 'Shelf B2', created_by: adminId }
  ]).select();

  // 7. Create Orders (Friday Clustered for Velocity)
  const today = new Date();
  const orders = [];
  for (let i = 0; i < 15; i++) {
    const timestamp = new Date(today);
    timestamp.setHours(9 + i, Math.floor(Math.random() * 60)); // Spread through the day
    
    orders.push({
      code: `ORD-DEMO-${i}`,
      party_id: parties?.[i % 2]?.id,
      status: 'DELIVERED',
      subtotal: 15000,
      total: 15000,
      created_at: timestamp.toISOString(),
      created_by: adminId
    });
  }
  
  const { data: newOrders } = await supabase.from('orders').insert(orders).select();

  // 8. Create Order Items (sets_count)
  if (newOrders) {
    const items = newOrders.map(o => ({
      order_id: o.id,
      batch_id: batches?.[0]?.id,
      quantity: 10 + Math.floor(Math.random() * 20),
      unit_price: 4500,
      line_total: 15000
    }));
    await supabase.from('order_items').insert(items);
  }

  console.log('✅ SEEDING_COMPLETE: Industrial environment is now LIVE.');
}

seed().catch(console.error);
