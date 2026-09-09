import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
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

export function InvoiceSentEmail({
  invoiceNo,
  amount,
  dueDate,
  companyName,
  actionUrl,
}: {
  invoiceNo: string;
  amount: string;
  dueDate: string;
  companyName: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNo} was sent</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Invoice {invoiceNo} sent
          </Text>
          <Text>
            Invoice <strong>{invoiceNo}</strong> for <strong>{amount}</strong>{" "}
            from {companyName} has been sent
            {dueDate !== "—" ? (
              <>
                {" "}
                and is due on <strong>{dueDate}</strong>
              </>
            ) : null}
            .
          </Text>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button href={actionUrl} style={buttonStyle}>
              View Invoice
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function InvoicePaidEmail({
  invoiceNo,
  amount,
  paidAt,
  companyName,
  actionUrl,
}: {
  invoiceNo: string;
  amount: string;
  paidAt: string;
  companyName: string;
  actionUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNo} was paid</Preview>
      <Body style={baseStyle}>
        <Container style={{ maxWidth: 580, margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Invoice {invoiceNo} paid
          </Text>
          <Text>
            Invoice <strong>{invoiceNo}</strong> for <strong>{amount}</strong>{" "}
            was settled in full on <strong>{paidAt}</strong>.
          </Text>
          <Text>No further action is required for this invoice.</Text>
          <Section style={{ textAlign: "center", padding: "20px 0" }}>
            <Button href={actionUrl} style={buttonStyle}>
              View Invoice
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
