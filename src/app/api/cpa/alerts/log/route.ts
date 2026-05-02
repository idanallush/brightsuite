import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    // Accept both `client_id` (legacy) and `clientId` for forward-compat with the new client.
    const clientId = searchParams.get("client_id") ?? searchParams.get("clientId");
    const sinceRaw = searchParams.get("since");
    const untilRaw = searchParams.get("until");
    const since = sinceRaw && DATE_RE.test(sinceRaw) ? sinceRaw : null;
    const until = untilRaw && DATE_RE.test(untilRaw) ? untilRaw : null;

    const page = clampInt(searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("alert_log")
      .select("*", { count: "exact" })
      .order("sent_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }
    if (since) {
      query = query.gte("sent_at", `${since}T00:00:00.000Z`);
    }
    if (until) {
      query = query.lte("sent_at", `${until}T23:59:59.999Z`);
    }

    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch alert logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Alert log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert logs" },
      { status: 500 }
    );
  }
}
