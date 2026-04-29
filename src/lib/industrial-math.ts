import Decimal from 'decimal.js';

/**
 * FixedDecimal: Extends Decimal to preserve trailing zeros in toString().
 * This is critical for industrial precision where '2.000' and '2' have
 * different semantic meanings (3-place gaz precision vs integer).
 */
class FixedDecimal extends Decimal {
  private readonly _fixedPlaces: number;

  constructor(value: Decimal.Value, places: number) {
    super(value);
    this._fixedPlaces = places;
  }

  override toString(): string {
    return this.toFixed(this._fixedPlaces);
  }
}

/**
 * SOVEREIGN INDUSTRIAL MATH ENGINE (v8.3)
 * Pure functions. No side effects. Exact Decimal arithmetic.
 * Methods returning gaz/cost values preserve 3 decimal places.
 */
export class IndustrialMath {
  private static readonly DEFAULT_WASTAGE = new Decimal('0.04');    // 4%
  private static readonly DEFAULT_SHRINKAGE = new Decimal('0.065'); // 6.5%

  /**
   * Fabric Estimator: base * (1 + wastage) * (1 + shrinkage)
   * Returns Decimal rounded to 3 decimal places.
   */
  static calculateRequiredGaz(
    base: Decimal,
    wastage: Decimal = this.DEFAULT_WASTAGE,
    shrinkage: Decimal = this.DEFAULT_SHRINKAGE
  ): Decimal {
    const result = base
      .times(new Decimal(1).plus(wastage))
      .times(new Decimal(1).plus(shrinkage));
    return new FixedDecimal(result.toFixed(3), 3);
  }

  /**
   * Karigar Variance: gaz_issued - (suits_received * gaz_per_suit)
   * Positive = surplus, Negative = deficit (chori suspect).
   */
  static calculateVariance(
    gazIssued: Decimal,
    suitsReceived: Decimal,
    gazPerSuit: Decimal
  ): Decimal {
    const consumed = suitsReceived.times(gazPerSuit);
    const variance = gazIssued.minus(consumed);
    return new FixedDecimal(variance.toFixed(3), 3);
  }

  /**
   * Audit verdict based on variance vs tolerance.
   */
  static auditResult(variance: Decimal, tolerance: Decimal): 'RED_ALERT' | 'PASS' {
    return variance.abs().greaterThan(tolerance) ? 'RED_ALERT' : 'PASS';
  }

  /**
   * Unit cost with overhead: cost * (1 + overhead/100)
   */
  static unitCostWithOverhead(cost: Decimal, overheadPct: Decimal): Decimal {
    const multiplier = new Decimal(1).plus(overheadPct.div(100));
    const result = cost.times(multiplier);
    return new FixedDecimal(result.toFixed(3), 3);
  }

  /**
   * Profit margin: ((price - cost) / price) * 100
   */
  static marginPercent(price: Decimal, cost: Decimal): Decimal {
    if (price.isZero()) return new Decimal(0);
    return price.minus(cost).div(price).times(100);
  }

  /**
   * Wholesale discount: 5% off if sets > minSets (default 50).
   */
  static applyWholesaleDiscount(
    total: Decimal,
    sets: number,
    discountPct: Decimal = new Decimal('5'),
    minSets: number = 50
  ): Decimal {
    if (sets <= minSets) return total;
    const discount = total.times(discountPct.div(100));
    return new FixedDecimal(total.minus(discount).toFixed(3), 3);
  }

  /**
   * Currency formatter for PKR
   */
  static formatPKR(amount: number | Decimal): string {
    const val = new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    return `PKR ${val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
