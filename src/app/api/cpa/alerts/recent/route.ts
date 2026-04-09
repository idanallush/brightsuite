import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const seenAfter = searchParams.get("seen_after");

    const supabase = createServiceRoleClient();

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: alerts, error } = await supabase
      .from("alert_log")
      .select("*")
      .gte("sent_at", cutoff)
      .order("sent_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch recent alerts" },
        { status: 500 }
      );
    }

    const unreadCount = seenAfter
      ? (alerts ?? []).filter(
          (a: { sent_at: string }) => a.sent_at > seenAfter
        ).length
      : (alerts ?? []).length;

    return NextResponse.json({
      alerts: alerts ?? [],
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error("Recent alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent alerts" },
      { status: 500 }
    );
  }
}
