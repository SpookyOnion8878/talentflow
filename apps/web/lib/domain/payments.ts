import { calculateOutstandingBalance, roundMoney, type Prisma } from "@repo/db";

const PAYABLE_INVOICE_STATUSES = new Set(["SENT", "VIEWED", "OVERDUE"]);

export class PaymentApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentApplicationError";
  }
}

export function calculatePaymentApplication(params: {
  invoiceStatus: string;
  invoiceCurrency: string;
  paymentCurrency: string;
  invoiceTotal: Prisma.Decimal.Value;
  completedPayments: Prisma.Decimal.Value[];
  requestedAmount: Prisma.Decimal.Value;
}) {
  if (!PAYABLE_INVOICE_STATUSES.has(params.invoiceStatus)) {
    throw new PaymentApplicationError(
      `Payments cannot be recorded for a ${params.invoiceStatus.toLowerCase()} invoice`,
    );
  }
  if (params.paymentCurrency !== params.invoiceCurrency) {
    throw new PaymentApplicationError(
      "Payment currency must match the invoice currency",
    );
  }

  const outstanding = calculateOutstandingBalance(
    params.invoiceTotal,
    params.completedPayments,
  );
  const amount = roundMoney(params.requestedAmount);
  if (amount.isZero()) {
    throw new PaymentApplicationError(
      "Payment amount is below the supported precision",
    );
  }
  if (amount.isNegative()) {
    throw new PaymentApplicationError("Payment amount must be positive");
  }
  if (amount.greaterThan(outstanding)) {
    throw new PaymentApplicationError(
      "Payment amount exceeds the outstanding balance",
    );
  }

  const remaining = roundMoney(outstanding.minus(amount));
  return {
    amount,
    outstandingBeforePayment: outstanding,
    remaining,
    settlesInvoice: remaining.isZero(),
  };
}
