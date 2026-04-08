import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("client_id");

    if (!clientId) {
      return NextResponse.json(
        { error: "Missing client_id query parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: topics, error } = await supabase
      .from("topics")
      .select("*")
      .eq("client_id", clientId)
      .order("display_order");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch topics" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: topics });
  } catch (error) {
    console.error("Topics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, name, campaign_ids, tcpa, tcpa_currency, metric_type } = body;

    if (!client_id || !name) {
      return NextResponse.json(
        { error: "client_id and name are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("topics")
      .insert({
        client_id,
        name,
        campaign_ids: campaign_ids || [],
        tcpa,
        tcpa_currency,
        metric_type: metric_type || "leads",
      })
      .select()
      .single();

    if (error) {
      console.error("Topic insert error:", error);
      return NextResponse.json(
        { error: "Failed to create topic" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Topics POST error:", error);
    return NextResponse.json(
      { error: "Failed to create topic" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, campaign_ids, tcpa, tcpa_currency, metric_type, is_active, display_order } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Topic id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (campaign_ids !== undefined) update.campaign_ids = campaign_ids;
    if (tcpa !== undefined) update.tcpa = tcpa;
    if (tcpa_currency !== undefined) update.tcpa_currency = tcpa_currency;
    if (metric_type !== undefined) update.metric_type = metric_type;
    if (is_active !== undefined) update.is_active = is_active;
    if (display_order !== undefined) update.display_order = display_order;

    const { data, error } = await supabase
      .from("topics")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Topic update error:", error);
      return NextResponse.json(
        { error: "Failed to update topic" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Topics PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update topic" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Topic id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("topics").delete().eq("id", id);

    if (error) {
      console.error("Topic delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete topic" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Topics DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete topic" },
      { status: 500 }
    );
  }
}
