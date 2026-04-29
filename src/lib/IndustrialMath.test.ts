import { describe, it, expect } from 'vitest';
import { IndustrialMath, IndustrialMathError } from './IndustrialMath';

describe('IndustrialMath', () => {
  it('should add strings with precision', () => {
    const result = IndustrialMath.add('100.00000001', '50.00000002');
    expect(result.toString()).toBe('150.00000003');
  });

  it('should throw on raw numbers', () => {
    expect(() => {
      // @ts-expect-error - Testing invalid input
      IndustrialMath.add(100, 200);
    }).toThrow(IndustrialMathError);
  });

  it('should round correctly', () => {
    const result = IndustrialMath.round('15.375', 2);
    expect(result.toString()).toBe('15.38');
  });
});
