import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { fbFetch } from "@/lib/facebook/client";
import type { FBCampaign } from "@/lib/facebook/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get("account_id");

    if (!accountId) {
      return NextResponse.json(
        { error: "Missing account_id query parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: fbConn, error: fbError } = await supabase
      .from("fb_connections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fbError || !fbConn) {
      console.error("FB connection lookup failed for campaigns:", fbError?.message);
      return NextResponse.json(
        { error: "No active Facebook connection" },
        { status: 401 }
      );
    }

    // Correct effective_status encoding per CLAUDE.md
    const effectiveStatusFilter = encodeURIComponent(
      JSON.stringify(["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED"])
    );

    // Account IDs from FB come as "act_XXXXX", ensure proper format
    const fbAccountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

    const path = `/${fbAccountId}/campaigns?fields=id,name,objective,status,effective_status&effective_status=${effectiveStatusFilter}&limit=500`;

    console.log("Fetching campaigns for account:", fbAccountId);

    const response = await fbFetch<{ data: FBCampaign[] }>(
      path,
      fbConn.access_token
    );

    console.log(`Fetched ${response.data?.length ?? 0} campaigns for ${fbAccountId}`);

    return NextResponse.json({ data: response.data ?? [] });
  } catch (error) {
    console.error("Facebook campaigns error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
