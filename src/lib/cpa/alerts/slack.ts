import type { AlertViolation } from "./checker";
import { formatCurrency } from "@/lib/cpa/format";

export async function sendSlackAlert(
  violation: AlertViolation,
  webhookUrl: string
): Promise<boolean> {
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🚨 התראת חריגת CPA" },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*לקוח:*\n${violation.client_name}` },
              { type: "mrkdwn", text: `*נושא:*\n${violation.topic_name}` },
              { type: "mrkdwn", text: `*CPA בפועל:*\n${formatCurrency(violation.actual_cpa, violation.currency)}` },
              { type: "mrkdwn", text: `*יעד CPA:*\n${formatCurrency(violation.target_cpa, violation.currency)}` },
              { type: "mrkdwn", text: `*חריגה:*\n${violation.overshoot_percent}%` },
              { type: "mrkdwn", text: `*תקופה:*\n${violation.date_range.since} — ${violation.date_range.until}` },
            ],
          },
        ],
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
    return false;
  }
}
