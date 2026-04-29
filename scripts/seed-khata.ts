import { KhataEngine } from '../src/lib/khata-engine';
import { prisma } from '../src/lib/prisma';

/**
 * OMNORA NOXIS — Ledger Seeding Script
 * Populates the local SQLite database with sample industrial entries.
 */

async function seed() {
  console.log('🚀 Seeding Industrial Ledger...');

  const workers = ['Ahmed Ali', 'Zubair Shah', 'Imran Khan', 'Bilal Hussain'];
  
  for (const name of workers) {
    // Initial Credit (Opening Balance)
    await KhataEngine.recordEntry({
      type: 'CREDIT',
      amount: Math.floor(Math.random() * 50000) + 10000,
      description: 'Opening Balance Migration',
      workerName: name
    });

    // Random Debit (Payment)
    await KhataEngine.recordEntry({
      type: 'DEBIT',
      amount: Math.floor(Math.random() * 5000) + 1000,
      description: 'Weekly Wage Disbursement',
      workerName: name
    });
  }

  console.log('✅ Seeding Complete. Restart your app to see the intelligence hub in action.');
}

seed().catch(console.error);
