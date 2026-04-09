import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";

export async function GET(request: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("client_id");

    const supabase = createServiceRoleClient();

    let query = supabase.from("alert_configs").select("*");

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    // Scope to user (admin sees all, legacy rows without created_by_user_id are visible)
    if (session.role !== 'admin') {
      query = query.or(`created_by_user_id.eq.${session.userId},created_by_user_id.is.null`);
    }

    const { data: configs, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json(
        { error: "Failed to fetch alert configs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: configs });
  } catch (err) {
    console.error("Alert config GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch alert configs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const {
      id,
      client_id,
      topic_id,
      threshold_percent,
      notify_emails,
      notify_slack_webhook,
      notify_telegram_chat_id,
      is_enabled,
    } = body;

    if (!client_id) {
      return NextResponse.json(
        { error: "client_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const record = {
      client_id,
      topic_id: topic_id || null,
      threshold_percent: threshold_percent ?? 0,
      notify_emails: notify_emails || [],
      notify_slack_webhook: notify_slack_webhook || null,
      notify_telegram_chat_id: notify_telegram_chat_id || null,
      is_enabled: is_enabled ?? true,
      created_by_user_id: session.userId,
    };

    if (id) {
      // Update existing config
      const { data, error: dbError } = await supabase
        .from("alert_configs")
        .update(record)
        .eq("id", id)
        .select()
        .single();

      if (dbError) {
        console.error("Alert config update error:", dbError);
        return NextResponse.json(
          { error: "Failed to update alert config" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    } else {
      // Insert new config
      const { data, error: dbError } = await supabase
        .from("alert_configs")
        .insert(record)
        .select()
        .single();

      if (dbError) {
        console.error("Alert config insert error:", dbError);
        return NextResponse.json(
          { error: "Failed to create alert config" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    }
  } catch (err) {
    console.error("Alert config POST error:", err);
    return NextResponse.json(
      { error: "Failed to save alert config" },
      { status: 500 }
    );
  }
}
