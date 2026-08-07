import { z } from "zod";

// ─── Auth Schemas ───
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Company Schemas ───
export const companySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().max(50).optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;

// ─── Freelancer Schemas ───
export const freelancerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  skills: z.array(z.string()).default([]),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().default("USD"),
  taxId: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
});

export type FreelancerInput = z.infer<typeof freelancerSchema>;

// ─── Project Schemas ───
export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().default("USD"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// ─── Contract Schemas ───
export const contractSchema = z.object({
  freelancerId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  ratePerHour: z.number().min(0),
  currency: z.string().default("USD"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  terms: z.record(z.unknown()).default({}),
});

export type ContractInput = z.infer<typeof contractSchema>;

// ─── Timesheet Schemas ───
export const timesheetSchema = z.object({
  freelancerId: z.string().cuid(),
  contractId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  date: z.coerce.date(),
  hours: z.number().min(0.5).max(24),
  description: z.string().optional(),
});

export type TimesheetInput = z.infer<typeof timesheetSchema>;

// ─── Invoice Schemas ───
export const invoiceSchema = z.object({
  freelancerId: z.string().cuid(),
  contractId: z.string().cuid().optional(),
  currency: z.string().default("USD"),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().min(0),
      rate: z.number().min(0),
      amount: z.number().min(0),
    }),
  ),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// ─── Payment Schemas ───
export const paymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.number().min(0),
  currency: z.string().default("USD"),
  method: z.enum(["BANK_TRANSFER", "STRIPE", "PAYPAL", "WISE", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ─── Compliance Schemas ───
export const complianceSchema = z.object({
  freelancerId: z.string().cuid(),
  type: z.enum([
    "ID_CARD",
    "TAX_ID",
    "WORK_PERMIT",
    "VISA",
    "NDA",
    "CONTRACT_COPY",
    "INSURANCE",
    "CERTIFICATION",
    "OTHER",
  ]),
  title: z.string().min(1),
  documentUrl: z.string().url().optional(),
  expiryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type ComplianceInput = z.infer<typeof complianceSchema>;

// ─── Pagination ───
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
