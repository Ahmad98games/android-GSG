import { describe, it, expect, beforeEach } from 'vitest';
import { KhataEngine } from '../khata-engine';
import { prisma } from '../prisma';


/**
 * GOLD SHE MESH — Khata Engine Test Suite
 * Pillar 5: Immutable Ledger & Financial Accuracy
 */

describe('KhataEngine (Pillar 5)', () => {
  beforeEach(async () => {
    // Clean up before each test
    await prisma.auditLog.deleteMany();
    // Use raw query to bypass immutability guard for test cleanup
    await (prisma as unknown as { $executeRawUnsafe: (query: string) => Promise<void> }).$executeRawUnsafe('DELETE FROM khata_entries');
  });

  it('should record an immutable entry and generate an audit log', async () => {
    const req = {
      type: 'CREDIT' as const,
      amount: 1500.50,
      description: 'Production Batch GS-001',
      workerName: 'Karigar Ahmad',
    };

    const entry = await KhataEngine.recordEntry(req);

    expect(entry.amount).toBe('1500.5');
    expect(entry.workerName).toBe('Karigar Ahmad');

    // Verify Audit Log
    const logs = await prisma.auditLog.findMany();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('CREATE');
    expect(logs[0].entity).toBe('KHATA');
    expect(logs[0].entityId).toBe(entry.id);
  });

  it('should calculate balance correctly with Decimal.js precision', async () => {
    const entries = [
      { type: 'CREDIT', amount: '1000.10' },
      { type: 'DEBIT', amount: '200.05' },
      { type: 'CREDIT', amount: '50.00' },
    ];

    const balance = KhataEngine.calculateBalance(entries);
    expect(balance.toString()).toBe('850.05');
  });

  it('should fail when attempting to update a ledger row (ORM Immutability)', async () => {
    const entry = await KhataEngine.recordEntry({
      type: 'CREDIT',
      amount: 1000,
      description: 'Initial Entry',
      workerName: 'Ahmad',
    });

    /**
     * MODIFICATION 3: ORM Level Immutability Test
     * We attempt to update a ledger row directly via Prisma.
     * This MUST fail to satisfy the append-only industrial rule.
     */
    await expect(prisma.khataEntry.update({
      where: { id: entry.id },
      data: { amount: '2000' }
    })).rejects.toThrow();
  });

  it('should fail when attempting to delete a ledger row', async () => {
     const entry = await KhataEngine.recordEntry({
      type: 'CREDIT',
      amount: 1000,
      description: 'Delete Test',
      workerName: 'Ahmad',
    });

    await expect(prisma.khataEntry.delete({
      where: { id: entry.id }
    })).rejects.toThrow();
  });
});
