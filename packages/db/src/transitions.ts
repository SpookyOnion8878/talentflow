export const contractTransitions = {
  DRAFT: ["SENT", "SIGNED", "TERMINATED"],
  SENT: ["SIGNED", "TERMINATED", "EXPIRED"],
  SIGNED: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["COMPLETED", "TERMINATED", "EXPIRED"],
  COMPLETED: [],
  TERMINATED: [],
  EXPIRED: [],
} as const;

export const invoiceTransitions = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["VIEWED", "OVERDUE", "PAID", "CANCELLED"],
  VIEWED: ["OVERDUE", "PAID", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
} as const;

export const timesheetTransitions = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["REVISED"],
  REVISED: ["PENDING"],
} as const;

type TransitionMap = Record<string, readonly string[]>;

export class InvalidStateTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`${entity} cannot transition from ${from} to ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function canTransition(
  transitions: TransitionMap,
  from: string,
  to: string,
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition(
  entity: string,
  transitions: TransitionMap,
  from: string,
  to: string,
): void {
  if (!canTransition(transitions, from, to)) {
    throw new InvalidStateTransitionError(entity, from, to);
  }
}
