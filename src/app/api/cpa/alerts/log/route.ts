import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("client_id");

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("alert_log")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch alert logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Alert log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert logs" },
      { status: 500 }
    );
  }
}
