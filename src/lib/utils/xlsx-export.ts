import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';

/**
 * SOVEREIGN XLSX EXPORT PROTOCOL (v8.3)
 * Industrial-grade export with Decimal.js precision.
 * Numeric columns are exported as numbers so Excel SUM works.
 */

// ─── Generic Export ─────────────────────────────────────
export function exportToXLSX(data: unknown[], fileName: string, sheetName: string = 'Sovereign_Ledger') {
  try {
    if (!data || data.length === 0) {
      console.warn('⚠️ XLSX_EXPORT_WARNING: No data to export.');
      return;
    }

    const flattenedData = data.map(item => {
      const flattened: Record<string, string | number | boolean | null> = {};
      const obj = item as Record<string, unknown>;

      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (typeof val === 'object' && val !== null) {
          const nested = val as Record<string, unknown>;
          Object.keys(nested).forEach(nestedKey => {
            const nestedVal = nested[nestedKey];
            flattened[`${key}_${nestedKey}`] = (typeof nestedVal === 'string' || typeof nestedVal === 'number' || typeof nestedVal === 'boolean' || nestedVal === null)
              ? nestedVal
              : JSON.stringify(nestedVal);
          });
        } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null) {
          flattened[key] = val;
        } else {
          flattened[key] = JSON.stringify(val);
        }
      });
      return flattened;
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const maxWidths: Record<number, number> = {};
    flattenedData.forEach((row) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? String(row[key]).length : 10;
        maxWidths[i] = Math.max(maxWidths[i] || 10, val, key.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxWidths).map(i => ({ wch: maxWidths[Number(i)] + 2 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_EXCEPTION';
    console.error('❌ XLSX_EXPORT_FAILURE:', message);
    throw new Error(`Failed to export XLSX: ${message}`);
  }
}

// ─── Khata Ledger Export ────────────────────────────────
interface KhataParty {
  name: string;
  phone?: string | null;
}

interface KhataEntry {
  entry_type: string;
  amount: string | number;
  created_at: string;
  reference_id?: string | null;
  note?: string | null;
}

export function exportKhataToXLSX(party: KhataParty, entries: KhataEntry[]) {
  const wb = XLSX.utils.book_new();

  const totalDebits = entries
    .filter(e => e.entry_type === 'DEBIT')
    .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));
  const totalCredits = entries
    .filter(e => e.entry_type === 'CREDIT')
    .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));

  const summaryData = [
    ['Party Name', party.name],
    ['Phone', party.phone || ''],
    ['Export Date', new Date().toLocaleDateString('en-PK')],
    [],
    ['Total Debits', Number(totalDebits.toFixed(2))],
    ['Total Credits', Number(totalCredits.toFixed(2))],
    ['Net Balance', Number(totalCredits.minus(totalDebits).toFixed(2))],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

  const txHeaders = ['Date', 'Type', 'Amount (Rs.)', 'Running Balance', 'Reference', 'Note'];
  let running = new Decimal(0);
  const txData = entries.map(e => {
    const amount = new Decimal(e.amount);
    running = e.entry_type === 'CREDIT' ? running.plus(amount) : running.minus(amount);
    return [
      new Date(e.created_at).toLocaleDateString('en-PK'),
      e.entry_type,
      Number(amount.toFixed(2)),
      Number(running.toFixed(2)),
      e.reference_id || '',
      e.note || ''
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([txHeaders, ...txData]);
  ws['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  XLSX.writeFile(wb, `${party.name} - Ledger - ${new Date().toISOString().slice(0, 7)}.xlsx`);
}

// ─── Orders Export ──────────────────────────────────────
interface ExportOrder {
  code: string;
  created_at: string;
  parties?: { name: string } | null;
  order_items?: unknown[] | null;
  subtotal?: string | number;
  discount_pct?: number;
  tax_pct?: number;
  total: string | number;
  amount_paid: string | number;
  status: string;
}

export function exportOrdersToXLSX(orders: ExportOrder[]) {
  const headers = ['Order Code', 'Date', 'Party', 'Items', 'Total', 'Paid', 'Balance', 'Status'];
  const rows = orders.map(o => [
    o.code,
    new Date(o.created_at).toLocaleDateString('en-PK'),
    o.parties?.name || '',
    o.order_items?.length || 0,
    Number(new Decimal(o.total).toFixed(2)),
    Number(new Decimal(o.amount_paid).toFixed(2)),
    Number(new Decimal(o.total).minus(o.amount_paid).toFixed(2)),
    o.status
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Orders');
  XLSX.writeFile(wb, `Orders - ${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Vault/Batch Export ─────────────────────────────────
interface ExportBatch {
  code: string;
  articles?: { name?: string; desi_color_name?: string } | null;
  location?: string | null;
  suits_count: number;
  unit_cost: string | number;
}

export function exportVaultToXLSX(batches: ExportBatch[]) {
  const headers = ['Batch Code', 'Article', 'Color', 'Location', 'Suits', 'Unit Cost', 'Total Value', 'Status'];
  const rows = batches.map(b => [
    b.code,
    b.articles?.name || '',
    b.articles?.desi_color_name || '',
    b.location || '',
    b.suits_count,
    Number(new Decimal(b.unit_cost).toFixed(2)),
    Number(new Decimal(b.suits_count).times(b.unit_cost).toFixed(2)),
    b.suits_count > 20 ? 'IN_STOCK' : b.suits_count > 0 ? 'LOW' : 'OUT'
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Vault');
  XLSX.writeFile(wb, `Vault - ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
