import { Prisma } from "@prisma/client";

export const MONEY_SCALE = 4;
export const DEFAULT_INVOICE_TAX_RATE = new Prisma.Decimal("0.11");
export const INVOICE_CALCULATION_VERSION = "invoice-v1";

type DecimalInput = Prisma.Decimal.Value;

export type InvoiceLineInput = {
  description: string;
  quantity: DecimalInput;
  rate: DecimalInput;
};

export type CalculatedInvoiceLine = {
  description: string;
  quantity: string;
  rate: string;
  amount: string;
};

export class MoneyInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyInvariantError";
  }
}

export function toDecimal(value: DecimalInput): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function roundMoney(value: DecimalInput): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(
    MONEY_SCALE,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

export function decimalToNumber(value: DecimalInput): number {
  return toDecimal(value).toNumber();
}

export function calculateInvoiceAmounts(
  inputLines: InvoiceLineInput[],
  taxRate: DecimalInput = DEFAULT_INVOICE_TAX_RATE,
) {
  if (inputLines.length === 0) {
    throw new MoneyInvariantError("An invoice must contain at least one item");
  }

  const lines = inputLines.map((line) => {
    const quantity = toDecimal(line.quantity);
    const rate = roundMoney(line.rate);

    if (!quantity.isFinite() || quantity.lessThanOrEqualTo(0)) {
      throw new MoneyInvariantError("Invoice item quantity must be positive");
    }
    if (!rate.isFinite() || rate.isNegative()) {
      throw new MoneyInvariantError("Invoice item rate cannot be negative");
    }

    const amount = roundMoney(quantity.times(rate));
    return {
      description: line.description,
      quantity: quantity.toString(),
      rate: rate.toFixed(MONEY_SCALE),
      amount: amount.toFixed(MONEY_SCALE),
    } satisfies CalculatedInvoiceLine;
  });

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0)),
  );
  const normalizedTaxRate = toDecimal(taxRate);
  if (
    !normalizedTaxRate.isFinite() ||
    normalizedTaxRate.isNegative() ||
    normalizedTaxRate.greaterThan(1)
  ) {
    throw new MoneyInvariantError("Invoice tax rate must be between 0 and 1");
  }

  const tax = roundMoney(subtotal.times(normalizedTaxRate));
  return {
    lines,
    subtotal,
    tax,
    total: roundMoney(subtotal.plus(tax)),
    taxRate: normalizedTaxRate,
    calculationVersion: INVOICE_CALCULATION_VERSION,
  };
}

export function calculateOutstandingBalance(
  invoiceTotal: DecimalInput,
  completedPayments: DecimalInput[],
): Prisma.Decimal {
  const total = roundMoney(invoiceTotal);
  const paid = roundMoney(
    completedPayments.reduce<Prisma.Decimal>(
      (sum, payment) => sum.plus(payment),
      new Prisma.Decimal(0),
    ),
  );
  const outstanding = roundMoney(total.minus(paid));

  if (outstanding.isNegative()) {
    throw new MoneyInvariantError(
      "Completed payments exceed the invoice total",
    );
  }
  return outstanding;
}
