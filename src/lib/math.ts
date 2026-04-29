import { Decimal } from 'decimal.js';

/**
 * SOVEREIGN INDUSTRIAL MATH ENGINE (v7.0)
 * Standardized absolute precision math for Pakistani textile industry.
 */

export class IndustrialMath {
  // Configurable Defaults
  private static readonly SHRINKAGE_BUFFER = new Decimal(0.065); // 6.5%
  private static readonly WASTAGE_BUFFER = new Decimal(0.04);   // 4.0%
  private static readonly PKR_PRECISION = 2;
  private static readonly GAZ_PRECISION = 3;

  /**
   * Precise Rounding (Sovereign Standard)
   */
  static round(value: number | string | Decimal, places: number = this.PKR_PRECISION): number {
    return new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Fabric Yield: Material Calculation (v4.1 Logic)
   * Formula: required = base * (1 + wastage) * (1 + shrinkage)
   */
  static calculateYield(baseGaz: number | Decimal, customWastage?: number): number {
    const base = new Decimal(baseGaz);
    const wastage = customWastage ? new Decimal(customWastage).div(100) : this.WASTAGE_BUFFER;
    
    const withWastage = base.mul(new Decimal(1).add(wastage));
    const finalResult = withWastage.mul(new Decimal(1).add(this.SHRINKAGE_BUFFER));
    
    return this.round(finalResult, this.GAZ_PRECISION);
  }

  /**
   * Valuation: Multiplicative Calculation with Overhead
   */
  static calculateValuation(quantity: number, cost: number, overheadPct: number = 0): number {
    const base = new Decimal(quantity).mul(new Decimal(cost));
    const overhead = new Decimal(1).add(new Decimal(overheadPct).div(100));
    return this.round(base.mul(overhead), this.PKR_PRECISION);
  }

  /**
   * Currency Formatter (PKR Standard)
   */
  static formatPKR(amount: number | Decimal): string {
    const val = this.round(amount, this.PKR_PRECISION);
    return `Rs. ${val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
