"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@repo/utils";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { data: freelancers } = trpc.freelancer.list.useQuery({
    page: 1,
    limit: 100,
  });

  const [form, setForm] = useState({
    freelancerId: "",
    dueDate: "",
    currency: "USD",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);
  const [error, setError] = useState("");

  const createMutation = trpc.invoice.create.useMutation({
    onSuccess: () => router.push("/dashboard/invoices"),
    onError: (err) => setError(err.message),
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validItems = lineItems.filter(
      (item) => item.description && item.quantity > 0,
    );
    if (validItems.length === 0) {
      setError("Add at least one line item with a description");
      return;
    }

    createMutation.mutate({
      freelancerId: form.freelancerId,
      currency: form.currency,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      notes: form.notes || undefined,
      items: validItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
      })),
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/invoices"
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          &larr; Back to Invoices
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Create New Invoice
        </h2>
        <p className="text-sm text-slate-500">
          Generate an invoice for a freelancer
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Invoice Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Invoice Details
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Freelancer *
              </label>
              <select
                name="freelancerId"
                value={form.freelancerId}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">Select freelancer</option>
                {freelancers?.data.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Due Date *
              </label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Currency
              </label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="IDR">IDR - Indonesian Rupiah</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              + Add Item
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 sm:grid-cols-[1fr_100px_120px_auto]"
              >
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(index, "description", e.target.value)
                  }
                  placeholder="Description"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(
                      index,
                      "quantity",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="Qty"
                  min="1"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) =>
                    updateLineItem(
                      index,
                      "rate",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="Rate"
                  step="0.01"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(subtotal, form.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax (11%)</span>
                <span className="font-medium">
                  {formatCurrency(tax, form.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total, form.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">Notes</h3>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="mt-4 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Payment instructions, thank you note, etc."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/invoices"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
