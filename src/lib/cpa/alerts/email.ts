import { Resend } from "resend";
import type { AlertViolation } from "./checker";
import { formatCurrency } from "@/lib/cpa/format";

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendAlertEmail(
  violation: AlertViolation,
  emails: string[]
): Promise<boolean> {
  const resend = getResendClient();
  if (!emails.length || !resend) return false;

  try {
    await resend.emails.send({
      from: "CPA Tracker <alerts@b-bright.co.il>",
      to: emails,
      subject: `התראת CPA: ${violation.client_name} - ${violation.topic_name}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ef4444;">התראת חריגת CPA</h2>
          <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">לקוח</td>
              <td style="padding: 8px; border: 1px solid #e5e5e5;">${violation.client_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">נושא</td>
              <td style="padding: 8px; border: 1px solid #e5e5e5;">${violation.topic_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">CPA בפועל</td>
              <td style="padding: 8px; border: 1px solid #e5e5e5;">${formatCurrency(violation.actual_cpa, violation.currency)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">יעד CPA</td>
              <td style="padding: 8px; border: 1px solid #e5e5e5;">${formatCurrency(violation.target_cpa, violation.currency)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">חריגה</td>
              <td style="padding: 8px; border: 1px solid #e5e5e5; color: #ef4444;">${violation.overshoot_percent}%</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">תקופה</td>
              <td style="padding: 8px; border: 1px solid #e5e5e5;">${violation.date_range.since} — ${violation.date_range.until}</td>
            </tr>
          </table>
          <p style="color: #737373; margin-top: 16px;">Bright CPA Tracker</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    return false;
  }
}
