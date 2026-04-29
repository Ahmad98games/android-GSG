import { describe, it, expect } from 'vitest';
import { IndustrialMath, IndustrialMathError } from '../IndustrialMath';
import Decimal from 'decimal.js';

describe('IndustrialMath', () => {
  it('should handle 0.1 + 0.2 precision', () => {
    expect(IndustrialMath.add('0.1', '0.2').toString()).toBe('0.3');
  });

  it('should handle large numbers', () => {
    expect(IndustrialMath.add('999999999.99', '0.01').toString()).toBe('1000000000');
  });

  it('should subtract correctly', () => {
    expect(IndustrialMath.subtract('10.00', '3.33').toString()).toBe('6.67');
  });

  it('should multiply precisely', () => {
    expect(IndustrialMath.multiply('1.005', '200').toString()).toBe('201');
  });

  it('should divide and round', () => {
    const res = IndustrialMath.divide('10', '3');
    expect(IndustrialMath.round(res, 2).toString()).toBe('3.33');
  });

  it('should use ROUND_HALF_UP', () => {
    expect(IndustrialMath.round('2.345', 2).toString()).toBe('2.35');
  });

  it('should identify zero', () => {
    expect(IndustrialMath.isZero('0')).toBe(true);
  });

  it('should handle negative values', () => {
    const res = IndustrialMath.subtract('5', '10');
    expect(IndustrialMath.isNegative(res)).toBe(true);
    expect(res.toString()).toBe('-5');
  });

  it('should throw on raw number', () => {
    expect(() => {
      // @ts-expect-error - Testing raw number input validation
      IndustrialMath.add(5, 5);
    }).toThrow(IndustrialMathError);
  });

  it('should format PKR', () => {
    expect(IndustrialMath.format('1234.56')).toContain('1,234.56');
    expect(IndustrialMath.format('1234.56')).toContain('PKR');
  });

  it('should create from string', () => {
    expect(IndustrialMath.fromString('100') instanceof Decimal).toBe(true);
  });
});
