import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

export { sendEmail } from "./send";
export type { SendEmailParams } from "./send";
export { renderAgentEmail } from "./render";
export type { EmailTemplateKind } from "./render";
export {
  InvoiceReminderEmail,
  ComplianceWarningEmail,
  WeeklySummaryEmail,
} from "./templates/agent";

interface EmailProps {
  name: string;
  actionUrl: string;
}

const baseStyle = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  color: "#333",
};

// ─── Welcome Email ───
export function WelcomeEmail({ name, actionUrl }: EmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to TalentFlow!</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Section style={{ textAlign: "center", padding: "30px 0" }}>
            <Text style={{ fontSize: 28, fontWeight: "bold" }}>TalentFlow</Text>
          </Section>
          <Section style={{ padding: "0 20px" }}>
            <Text style={{ fontSize: 18 }}>Welcome, {name}!</Text>
            <Text>
              Thank you for joining TalentFlow. Your platform for managing
              freelancers, contracts, timesheets, and payments is ready.
            </Text>
            <Section style={{ textAlign: "center", padding: "20px 0" }}>
              <Button
                href={actionUrl}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  padding: "12px 30px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                Go to Dashboard
              </Button>
            </Section>
          </Section>
          <Hr />
          <Text style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
            TalentFlow - Freelancer Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Timesheet Approval Request ───
export function TimesheetApprovalEmail({
  freelancerName,
  hours,
  date,
  actionUrl,
}: {
  freelancerName: string;
  hours: number;
  date: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Timesheet Approval Required</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Timesheet Pending Approval
          </Text>
          <Text>
            <strong>{freelancerName}</strong> submitted a timesheet for{" "}
            <strong>{hours} hours</strong> on <strong>{date}</strong>.
          </Text>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button
              href={actionUrl}
              style={{
                background: "#2563eb",
                color: "#fff",
                padding: "12px 30px",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              Review Timesheet
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Invoice Notification ───
export function InvoiceEmail({
  invoiceNo,
  amount,
  dueDate,
  actionUrl,
}: {
  invoiceNo: string;
  amount: string;
  dueDate: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNo} - {amount}
      </Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>New Invoice</Text>
          <Text>
            Invoice <strong>{invoiceNo}</strong> for <strong>{amount}</strong>{" "}
            is due on <strong>{dueDate}</strong>.
          </Text>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button
              href={actionUrl}
              style={{
                background: "#2563eb",
                color: "#fff",
                padding: "12px 30px",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              View Invoice
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
