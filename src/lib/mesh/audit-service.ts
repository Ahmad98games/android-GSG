import { HubOfflineStore } from './offline-store';
import { SecureCrypto } from './security-service';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GOLD SHE MESH — Audit Service
 * 
 * Pillar 6 (Production): Advanced Financial Audit.
 * Generates encrypted CSV reports for discrepancies.
 */

export class AuditService {
  private readonly AUDIT_DIR: string;

  constructor(private store: HubOfflineStore) {
    this.AUDIT_DIR = path.join(process.cwd(), 'audits');
    if (!fs.existsSync(this.AUDIT_DIR)) {
      fs.mkdirSync(this.AUDIT_DIR, { recursive: true });
    }
  }

  /**
   * Generates an encrypted CSV report of financial discrepancies.
   */
  async generateFinancialReport(masterPassword: string): Promise<string> {
    // 1. Fetch discrepancies (mock logic based on ledger)
    // In production, this would query the stock_ledger / khata tables
    const db = this.store.getDb();
    const rows = db.prepare(`
      SELECT * FROM stock_ledger 
      WHERE abs(quantity_delta) > 1000 
      OR description LIKE '%error%' 
      LIMIT 1000
    `).all();

    // 2. Build CSV string
    let csv = 'ID,Date,Worker,Action,Delta,Description\n';
    for (const row of rows as any[]) {
      csv += `${row.id},${new Date(row.ts).toISOString()},${row.worker_name},${row.action},${row.quantity_delta},"${row.description}"\n`;
    }

    // 3. Encrypt CSV using Master Password
    // SecureCrypto.encrypt uses aes-256-gcm
    const encrypted = SecureCrypto.encrypt(csv, masterPassword);

    // 4. Save to disk
    const fileName = `audit-financial-${Date.now()}.csv.enc`;
    const filePath = path.join(this.AUDIT_DIR, fileName);
    fs.writeFileSync(filePath, encrypted);

    console.info(`[AuditService] Encrypted audit report generated: ${fileName}`);
    return filePath;
  }
}
