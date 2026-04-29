import Decimal from 'decimal.js';

export class IndustrialMathError extends Error {
  constructor(message: string) {
    super(`[IndustrialMathError] ${message}`);
    this.name = 'IndustrialMathError';
  }
}

class IndustrialMathClass {
  private validate(val: Decimal | string): Decimal {
    if (typeof val === 'number') {
      throw new IndustrialMathError('Raw JS numbers are prohibited for financial calculations. Use string or Decimal.');
    }
    try {
      return val instanceof Decimal ? val : new Decimal(val);
    } catch {
      throw new IndustrialMathError(`Invalid numeric input: ${val}`);
    }
  }

  add(a: Decimal | string, b: Decimal | string): Decimal {
    return this.validate(a).add(this.validate(b));
  }

  subtract(a: Decimal | string, b: Decimal | string): Decimal {
    return this.validate(a).sub(this.validate(b));
  }

  multiply(a: Decimal | string, b: Decimal | string): Decimal {
    return this.validate(a).mul(this.validate(b));
  }

  divide(a: Decimal | string, b: Decimal | string): Decimal {
    const divisor = this.validate(b);
    if (divisor.isZero()) throw new IndustrialMathError('Division by zero.');
    return this.validate(a).div(divisor);
  }

  round(value: Decimal | string, places: number = 2): Decimal {
    return this.validate(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
  }

  isZero(value: Decimal | string): boolean {
    return this.validate(value).isZero();
  }

  isNegative(value: Decimal | string): boolean {
    return this.validate(value).isNegative();
  }

  isPositive(value: Decimal | string): boolean {
    return this.validate(value).isPositive();
  }

  fromString(s: string): Decimal {
    return this.validate(s);
  }

  format(value: Decimal | string, currency: string = 'PKR'): string {
    const dec = this.round(value, 2);
    const formatter = new Intl.NumberFormat('en-PK', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currency} ${formatter.format(dec.toNumber())}`;
  }
}

export const IndustrialMath = new IndustrialMathClass();
