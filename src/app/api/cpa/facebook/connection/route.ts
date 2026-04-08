import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("fb_connections")
      .select("id, fb_user_id, fb_user_name, token_expires_at, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ connected: false, connection: null });
    }

    return NextResponse.json({
      connected: true,
      connection: data,
    });
  } catch {
    return NextResponse.json({ connected: false, connection: null });
  }
}
