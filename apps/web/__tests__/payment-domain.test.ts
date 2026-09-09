import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@repo/db";
import { calculatePaymentApplication } from "../lib/domain/payments";
import { withSerializableTransaction } from "../lib/domain/transactions";

const basePayment = {
  invoiceStatus: "SENT",
  invoiceCurrency: "USD",
  paymentCurrency: "USD",
  invoiceTotal: "100.0000",
  completedPayments: ["25.0000"],
  requestedAmount: "30.0000",
};

describe("payment application", () => {
  it("keeps an invoice open after a partial payment", () => {
    const result = calculatePaymentApplication(basePayment);
    expect(result.outstandingBeforePayment.toFixed(4)).toBe("75.0000");
    expect(result.remaining.toFixed(4)).toBe("45.0000");
    expect(result.settlesInvoice).toBe(false);
  });

  it("settles an invoice only when the outstanding balance reaches zero", () => {
    const result = calculatePaymentApplication({
      ...basePayment,
      requestedAmount: "75.0000",
    });
    expect(result.remaining.toFixed(4)).toBe("0.0000");
    expect(result.settlesInvoice).toBe(true);
  });

  it.each([
    [
      { ...basePayment, requestedAmount: "75.0001" },
      "exceeds the outstanding balance",
    ],
    [
      { ...basePayment, paymentCurrency: "EUR" },
      "must match the invoice currency",
    ],
    [
      { ...basePayment, invoiceStatus: "DRAFT" },
      "cannot be recorded for a draft invoice",
    ],
    [
      { ...basePayment, requestedAmount: "0.00001" },
      "below the supported precision",
    ],
  ])("rejects an invalid payment application", (input, message) => {
    expect(() => calculatePaymentApplication(input)).toThrow(message);
  });
});

describe("serializable transaction retry", () => {
  it("retries a PostgreSQL write conflict and returns the successful result", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Write conflict",
      { code: "P2034", clientVersion: "6.19.3" },
    );
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce("completed");

    await expect(
      withSerializableTransaction(
        { $transaction: transaction } as never,
        async () => "unused",
      ),
    ).resolves.toBe("completed");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-conflict errors", async () => {
    const failure = new Error("database unavailable");
    const transaction = vi.fn().mockRejectedValue(failure);

    await expect(
      withSerializableTransaction(
        { $transaction: transaction } as never,
        async () => "unused",
      ),
    ).rejects.toThrow("database unavailable");
  });
});
