import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: clients, error } = await supabase
      .from("clients")
      .select("*")
      .order("display_order");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: clients ?? [] });
  } catch (error) {
    console.error("Clients GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Batch upsert: { clients: [...] }
    if (Array.isArray(body.clients)) {
      const results = [];
      for (const client of body.clients) {
        const record = {
          name: client.name || client.display_name,
          fb_account_id: client.fb_account_id,
          fb_account_name: client.fb_account_name,
          currency: client.currency,
          conversion_type_override: client.conversion_type_override,
          is_active: client.is_active,
          display_order: client.display_order,
        };

        // Try to find existing by fb_account_id
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("fb_account_id", client.fb_account_id)
          .limit(1)
          .single();

        if (existing) {
          const { data, error } = await supabase
            .from("clients")
            .update(record)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) console.error("Client batch update error:", error);
          else results.push(data);
        } else {
          const { data, error } = await supabase
            .from("clients")
            .insert(record)
            .select()
            .single();
          if (error) console.error("Client batch insert error:", error);
          else results.push(data);
        }
      }
      return NextResponse.json({ data: results });
    }

    // Single upsert
    const {
      id,
      name,
      fb_account_id,
      fb_account_name,
      currency,
      conversion_type_override,
      is_active,
      display_order,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const record = {
      name,
      fb_account_id,
      fb_account_name,
      currency,
      conversion_type_override,
      is_active,
      display_order,
    };

    if (id) {
      const { data, error } = await supabase
        .from("clients")
        .update(record)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Client update error:", error);
        return NextResponse.json(
          { error: "Failed to update client" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error("Client insert error:", error);
        return NextResponse.json(
          { error: "Failed to create client" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    }
  } catch (error) {
    console.error("Clients POST error:", error);
    return NextResponse.json(
      { error: "Failed to save client" },
      { status: 500 }
    );
  }
}
