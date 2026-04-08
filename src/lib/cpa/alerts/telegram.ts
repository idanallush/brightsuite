import type { AlertViolation } from "./checker";
import { formatCurrency } from "@/lib/cpa/format";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramAlert(
  violation: AlertViolation,
  chatId: string
): Promise<boolean> {
  if (!chatId || !BOT_TOKEN) return false;

  const message = [
    "🚨 *התראת חריגת CPA*",
    "",
    `*לקוח:* ${violation.client_name}`,
    `*נושא:* ${violation.topic_name}`,
    `*CPA בפועל:* ${formatCurrency(violation.actual_cpa, violation.currency)}`,
    `*יעד CPA:* ${formatCurrency(violation.target_cpa, violation.currency)}`,
    `*חריגה:* ${violation.overshoot_percent}%`,
    `*תקופה:* ${violation.date_range.since} — ${violation.date_range.until}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );
    return res.ok;
  } catch (error) {
    console.error("Failed to send Telegram alert:", error);
    return false;
  }
}
