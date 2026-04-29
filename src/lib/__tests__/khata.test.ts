import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { KhataEngine } from '../khata-engine';

describe('KhataEngine — Double Entry Ledger', () => {
  it('calculates party balance correctly', () => {
    const entries = [
      { entry_type: 'DEBIT' as const, amount: '50000' },
      { entry_type: 'DEBIT' as const, amount: '25000' },
      { entry_type: 'CREDIT' as const, amount: '30000' },
    ];
    const balance = KhataEngine.calculateBalance(entries);
    expect(balance.toString()).toBe('-45000');
  });

  it('credit balance returns positive value', () => {
    const entries = [
      { entry_type: 'CREDIT' as const, amount: '100000' },
      { entry_type: 'DEBIT' as const, amount: '40000' },
    ];
    expect(KhataEngine.calculateBalance(entries).toString()).toBe('60000');
  });

  it('zero balance when debits equal credits', () => {
    const entries = [
      { entry_type: 'DEBIT' as const, amount: '50000' },
      { entry_type: 'CREDIT' as const, amount: '50000' },
    ];
    expect(KhataEngine.calculateBalance(entries).toString()).toBe('0');
  });

  it('never produces floating point errors on PKR amounts', () => {
    const entries = [
      { entry_type: 'DEBIT' as const, amount: '33333.33' },
      { entry_type: 'CREDIT' as const, amount: '11111.11' },
    ];
    const result = KhataEngine.calculateBalance(entries);
    expect(result.toString()).not.toContain('0000000');
    expect(result.toString()).not.toContain('9999999');
  });

  it('running balance array is correct', () => {
    const entries = [
      { entry_type: 'DEBIT' as const, amount: '1000', created_at: '2025-01-01' },
      { entry_type: 'CREDIT' as const, amount: '500', created_at: '2025-01-02' },
    ];
    const running = KhataEngine.runningBalance(entries);
    expect(running[0].balance.toString()).toBe('-1000');
    expect(running[1].balance.toString()).toBe('-500');
  });

  it('rejects entry with zero or negative amount', () => {
    expect(() => KhataEngine.validateEntry({ entry_type: 'DEBIT', amount: '0' })).toThrow();
    expect(() => KhataEngine.validateEntry({ entry_type: 'CREDIT', amount: '-500' })).toThrow();
  });
});
