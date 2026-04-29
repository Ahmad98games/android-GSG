import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { IndustrialMath } from '../industrial-math';

describe('IndustrialMath — Fabric Estimator', () => {
  it('calculates gaz with 4% wastage and 6.5% shrinkage', () => {
    const base = new Decimal('2.5');
    const result = IndustrialMath.calculateRequiredGaz(base);
    const expected = base.times(1.04).times(1.065);
    expect(result.toString()).toBe(expected.toFixed(3));
  });

  it('never uses floating point — result is exact Decimal', () => {
    const result = IndustrialMath.calculateRequiredGaz(new Decimal('1.1'));
    expect(result instanceof Decimal).toBe(true);
    expect(result.toString()).not.toContain('0000000');
  });

  it('calculates karigar variance correctly', () => {
    const gaz_issued = new Decimal('50.000');
    const suits_received = new Decimal('20');
    const gaz_per_suit = new Decimal('2.4');
    const variance = IndustrialMath.calculateVariance(gaz_issued, suits_received, gaz_per_suit);
    expect(variance.toString()).toBe('2.000');
  });

  it('flags RED_ALERT when variance exceeds tolerance', () => {
    const result = IndustrialMath.auditResult(new Decimal('-3.5'), new Decimal('0.5'));
    expect(result).toBe('RED_ALERT');
  });

  it('returns PASS when within tolerance', () => {
    const result = IndustrialMath.auditResult(new Decimal('0.3'), new Decimal('0.5'));
    expect(result).toBe('PASS');
  });

  it('calculates unit cost with overhead correctly', () => {
    const cost = new Decimal('500');
    const overhead = new Decimal('15');
    const result = IndustrialMath.unitCostWithOverhead(cost, overhead);
    expect(result.toString()).toBe('575.000');
  });

  it('calculates profit margin correctly', () => {
    const price = new Decimal('800');
    const cost = new Decimal('575');
    const margin = IndustrialMath.marginPercent(price, cost);
    expect(margin.toFixed(2)).toBe('28.13');
  });

  it('wholesale discount: 5% applied over 50 sets', () => {
    const total = new Decimal('100000');
    const sets = 51;
    const result = IndustrialMath.applyWholesaleDiscount(total, sets);
    expect(result.toString()).toBe('95000.000');
  });

  it('wholesale discount: NOT applied at exactly 50 sets', () => {
    const total = new Decimal('100000');
    const sets = 50;
    const result = IndustrialMath.applyWholesaleDiscount(total, sets);
    expect(result.toString()).toBe('100000');
  });
});
