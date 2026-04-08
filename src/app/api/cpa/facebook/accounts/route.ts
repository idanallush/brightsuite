import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { fbFetchAll } from "@/lib/facebook/client";
import type { FBAdAccount } from "@/lib/facebook/types";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: fbConn, error: fbError } = await supabase
      .from("fb_connections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fbError || !fbConn) {
      console.error("FB connection lookup failed:", fbError?.message ?? "No connection found");
      return NextResponse.json(
        { error: "No active Facebook connection", details: fbError?.message },
        { status: 401 }
      );
    }

    // Check token expiry
    if (fbConn.token_expires_at && new Date(fbConn.token_expires_at) < new Date()) {
      console.error("FB token expired at:", fbConn.token_expires_at);
      return NextResponse.json(
        { error: "Facebook token expired", details: "Token expired at " + fbConn.token_expires_at },
        { status: 401 }
      );
    }

    console.log("Fetching FB ad accounts with token for user:", fbConn.fb_user_name);

    const accounts = await fbFetchAll<FBAdAccount>(
      "/me/adaccounts?fields=id,name,account_id,currency,account_status,business_name&limit=100",
      fbConn.access_token
    );

    console.log(`Fetched ${accounts.length} ad accounts from Facebook`);

    return NextResponse.json({ data: accounts });
  } catch (error) {
    console.error("Facebook accounts error:", error instanceof Error ? error.message : error);
    console.error("Full error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad accounts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
