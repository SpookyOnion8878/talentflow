/**
 * Sends through Resend when configured and falls back to the console in
 * development environments without SMTP.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<{ sent: boolean; channel: "resend" | "console" }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TalentFlow <no-reply@talentflow.dev>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`Resend error ${res.status}: ${detail}`);
    }
    return { sent: true, channel: "resend" };
  }

  console.log(
    `[email:console] to=${to} subject="${subject}" html=${html.length} chars`,
  );
  return { sent: true, channel: "console" };
}
