import { renderToString } from "react-dom/server";
import {
  ComplianceWarningEmail,
  InvoiceReminderEmail,
  WeeklySummaryEmail,
} from "./templates/agent";

export type EmailTemplateKind =
  | "invoice-reminder"
  | "compliance-warning"
  | "weekly-summary";

export function renderAgentEmail(
  kind: EmailTemplateKind,
  props: unknown,
): string {
  switch (kind) {
    case "invoice-reminder":
      return renderToString(
        InvoiceReminderEmail(
          props as Parameters<typeof InvoiceReminderEmail>[0],
        ),
      );
    case "compliance-warning":
      return renderToString(
        ComplianceWarningEmail(
          props as Parameters<typeof ComplianceWarningEmail>[0],
        ),
      );
    case "weekly-summary":
      return renderToString(
        WeeklySummaryEmail(props as Parameters<typeof WeeklySummaryEmail>[0]),
      );
  }
}
