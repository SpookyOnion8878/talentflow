import React from "react";
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

const baseStyle = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  color: "#333",
};

const buttonStyle = {
  background: "#2563eb",
  color: "#fff",
  padding: "12px 30px",
  borderRadius: 6,
  textDecoration: "none",
  fontWeight: "bold",
};

const TIER_TITLES: Record<number, string> = {
  1: "Invoice unpaid — first reminder",
  2: "Invoice unpaid — second reminder",
  3: "Invoice unpaid — final notice",
};

export function InvoiceReminderEmail({
  invoiceNo,
  amount,
  dueDate,
  tier,
  companyName,
  actionUrl,
}: {
  invoiceNo: string;
  amount: string;
  dueDate: string;
  tier: number;
  companyName: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{TIER_TITLES[tier] ?? "Invoice reminder"}</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            {TIER_TITLES[tier] ?? "Invoice reminder"}
          </Text>
          <Text>
            Invoice <strong>{invoiceNo}</strong> for <strong>{amount}</strong>{" "}
            was due on <strong>{dueDate}</strong> and is still awaiting payment.
          </Text>
          <Text>
            Please arrange payment as soon as possible so that your working
            relationship with {companyName} is not disrupted.
          </Text>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button href={actionUrl} style={buttonStyle}>
              View Invoice
            </Button>
          </Section>
        </Container>
        <Hr />
        <Text style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
          Sent automatically by the TalentFlow agent.
        </Text>
      </Body>
    </Html>
  );
}

export function ComplianceWarningEmail({
  documentTitle,
  documentType,
  daysLeft,
  freelancerName,
  actionUrl,
}: {
  documentTitle: string;
  documentType: string;
  daysLeft: number;
  freelancerName: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Compliance document about to expire</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Compliance document about to expire
          </Text>
          <Text>
            Document <strong>{documentTitle}</strong> ({documentType}) of{" "}
            <strong>{freelancerName}</strong> expires in{" "}
            <strong>{daysLeft} days</strong>.
          </Text>
          <Text>
            Please upload a new document before the expiry date so the
            freelancer is not automatically suspended by the Compliance Agent.
          </Text>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button href={actionUrl} style={buttonStyle}>
              Manage Documents
            </Button>
          </Section>
        </Container>
        <Hr />
        <Text style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
          Sent automatically by the Compliance agent.
        </Text>
      </Body>
    </Html>
  );
}

export function WeeklySummaryEmail({
  companyName,
  totalOutstanding,
  unpaidCount,
  overdueCount,
  expiringCount,
  draftCount,
  actionUrl,
}: {
  companyName: string;
  totalOutstanding: string;
  unpaidCount: number;
  overdueCount: number;
  expiringCount: number;
  draftCount: number;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Weekly summary — {companyName}</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Weekly Summary — {companyName}
          </Text>
          <Text>Operational summary prepared automatically by the agent:</Text>
          <Section
            style={{ background: "#f8fafc", borderRadius: 8, padding: "16px" }}
          >
            <Text>
              Total unpaid: <strong>{totalOutstanding}</strong> ({unpaidCount}{" "}
              invoices, {overdueCount} overdue)
            </Text>
            <Text>
              Draft invoices pending: <strong>{draftCount}</strong>
            </Text>
            <Text>
              Compliance documents expiring &le;30 days:{" "}
              <strong>{expiringCount}</strong>
            </Text>
          </Section>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button href={actionUrl} style={buttonStyle}>
              Open Dashboard
            </Button>
          </Section>
        </Container>
        <Hr />
        <Text style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
          Sent automatically by the TalentFlow agent.
        </Text>
      </Body>
    </Html>
  );
}
