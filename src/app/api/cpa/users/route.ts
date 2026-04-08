import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("users")
      .insert({ email, name, role: role || "viewer" })
      .select()
      .single();

    if (error) {
      console.error("User invite error:", error);
      return NextResponse.json(
        { error: "Failed to invite user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json(
      { error: "Failed to invite user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json(
        { error: "id and role are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("User update error:", error);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Users PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
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
        { error: "User id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("User delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
