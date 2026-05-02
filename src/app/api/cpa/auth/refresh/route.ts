import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { getLongLivedToken } from "@/lib/facebook/auth";

export async function POST() {
  const { error: authError } = await requireApiAuth();
  if (authError) return authError;

  try {
    const supabase = createServiceRoleClient();

    const { data: fbConn, error: fbError } = await supabase
      .from("fb_connections")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fbError || !fbConn) {
      return NextResponse.json(
        { error: "אין חיבור פייסבוק פעיל" },
        { status: 404 },
      );
    }

    if (!fbConn.access_token) {
      return NextResponse.json(
        { error: "טוקן לא תקין, יש להתחבר מחדש" },
        { status: 400 },
      );
    }

    let refreshed: { access_token: string; expires_in: number };
    try {
      refreshed = await getLongLivedToken(fbConn.access_token);
    } catch (err) {
      console.error("FB token refresh failed:", err);
      return NextResponse.json(
        {
          error: "רענון הטוקן מול פייסבוק נכשל, יש להתחבר מחדש",
          details: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 502 },
      );
    }

    const expiresAt = new Date(
      Date.now() + refreshed.expires_in * 1000,
    ).toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("fb_connections")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fbConn.id)
      .select(
        "id, fb_user_id, fb_user_name, token_expires_at, is_active, created_at, updated_at",
      )
      .single();

    if (updateError || !updated) {
      console.error("FB connection update failed:", updateError);
      return NextResponse.json(
        { error: "שגיאה בשמירת הטוקן המעודכן" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      connected: true,
      connection: updated,
    });
  } catch (err) {
    console.error("CPA auth refresh error:", err);
    return NextResponse.json(
      { error: "שגיאה ברענון טוקן" },
      { status: 500 },
    );
  }
}
