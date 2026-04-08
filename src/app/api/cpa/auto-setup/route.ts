import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { fbFetch } from "@/lib/facebook/client";
import { SEED_DATA, type SeedClient, type SeedTopic } from "@/lib/cpa/seed-data";
import type { FBCampaign } from "@/lib/facebook/types";

interface MatchResult {
  client_id: string;
  client_name: string;
  matched: boolean;
  seed_name?: string;
  topics_created: number;
  campaigns_matched: number;
  unmatched_campaigns: string[];
  skipped_existing: boolean;
}

/** Find a matching SeedClient by checking client name and fb_account_name against patterns */
function findSeedMatch(clientName: string, fbAccountName: string | null): SeedClient | null {
  const nameLower = clientName.toLowerCase();
  const fbNameLower = (fbAccountName || "").toLowerCase();

  for (const seed of SEED_DATA) {
    for (const pattern of seed.fb_account_name_patterns) {
      const p = pattern.toLowerCase();
      if (nameLower.includes(p) || fbNameLower.includes(p)) {
        return seed;
      }
    }
  }
  return null;
}

/** Clean campaign name for matching — remove common noise */
function cleanCampaignName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(campaign|קמפיין)\b/gi, "")
    .replace(/\d{1,2}[./]\d{1,2}[./]?\d{0,4}/g, "") // dates
    .replace(/\s+/g, " ")
    .trim();
}

/** Match campaigns to topics. Each campaign assigned to first matching topic only. */
function matchCampaignsToTopics(
  campaigns: { id: string; name: string }[],
  seedTopics: SeedTopic[],
): { assignments: Record<string, string[]>; unmatched: string[] } {
  const assignments: Record<string, string[]> = {};
  for (const topic of seedTopics) {
    assignments[topic.name] = [];
  }

  const assignedCampaignIds = new Set<string>();
  const unmatched: string[] = [];

  for (const campaign of campaigns) {
    const cleaned = cleanCampaignName(campaign.name);
    let matched = false;

    for (const topic of seedTopics) {
      for (const keyword of topic.keywords) {
        if (cleaned.includes(keyword.toLowerCase())) {
          assignments[topic.name].push(campaign.id);
          assignedCampaignIds.add(campaign.id);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      unmatched.push(campaign.name);
    }
  }

  return { assignments, unmatched };
}

async function setupClient(
  clientId: string,
  supabase: ReturnType<typeof createServiceRoleClient>,
  accessToken: string,
): Promise<MatchResult> {
  // Load client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return {
      client_id: clientId,
      client_name: "לא נמצא",
      matched: false,
      topics_created: 0,
      campaigns_matched: 0,
      unmatched_campaigns: [],
      skipped_existing: false,
    };
  }

  // Check if topics already exist
  const { data: existingTopics } = await supabase
    .from("topics")
    .select("id")
    .eq("client_id", clientId);

  if (existingTopics && existingTopics.length > 0) {
    return {
      client_id: clientId,
      client_name: client.name,
      matched: true,
      skipped_existing: true,
      topics_created: 0,
      campaigns_matched: 0,
      unmatched_campaigns: [],
    };
  }

  // Find seed match
  const seed = findSeedMatch(client.name, client.fb_account_name);
  if (!seed) {
    return {
      client_id: clientId,
      client_name: client.name,
      matched: false,
      topics_created: 0,
      campaigns_matched: 0,
      unmatched_campaigns: [],
      skipped_existing: false,
    };
  }

  // Fetch campaigns from FB
  let campaigns: { id: string; name: string }[] = [];
  if (client.fb_account_id) {
    try {
      const fbAccountId = client.fb_account_id.startsWith("act_")
        ? client.fb_account_id
        : `act_${client.fb_account_id}`;

      const effectiveStatusFilter = encodeURIComponent(
        JSON.stringify(["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED"]),
      );

      const response = await fbFetch<{ data: FBCampaign[] }>(
        `/${fbAccountId}/campaigns?fields=id,name,objective,status,effective_status&effective_status=${effectiveStatusFilter}&limit=500`,
        accessToken,
      );
      campaigns = (response.data ?? []).map((c) => ({ id: c.id, name: c.name }));
    } catch (err) {
      console.error(`Failed to fetch campaigns for ${client.name}:`, err);
    }
  }

  // Match campaigns to topics
  const { assignments, unmatched } = matchCampaignsToTopics(campaigns, seed.topics);

  // Create topics in Supabase
  let topicsCreated = 0;
  let campaignsMatched = 0;

  for (let i = 0; i < seed.topics.length; i++) {
    const seedTopic = seed.topics[i];
    const campaignIds = assignments[seedTopic.name] || [];

    const { error: insertError } = await supabase.from("topics").insert({
      client_id: clientId,
      name: seedTopic.name,
      campaign_ids: campaignIds,
      tcpa: seedTopic.tcpa,
      tcpa_currency: seedTopic.tcpa_currency,
      metric_type: seedTopic.metric_type || "leads",
      display_order: i,
    });

    if (!insertError) {
      topicsCreated++;
      campaignsMatched += campaignIds.length;
    } else {
      console.error(`Failed to insert topic ${seedTopic.name}:`, insertError);
    }
  }

  return {
    client_id: clientId,
    client_name: client.name,
    matched: true,
    seed_name: seed.name,
    topics_created: topicsCreated,
    campaigns_matched: campaignsMatched,
    unmatched_campaigns: unmatched,
    skipped_existing: false,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Get FB access token
    const { data: fbConn, error: fbError } = await supabase
      .from("fb_connections")
      .select("access_token")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fbError || !fbConn) {
      return NextResponse.json(
        { error: "אין חיבור פייסבוק פעיל" },
        { status: 401 },
      );
    }

    // Single client
    if (body.client_id) {
      const result = await setupClient(body.client_id, supabase, fbConn.access_token);
      return NextResponse.json({ data: result });
    }

    // All clients
    if (body.all) {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .eq("is_active", true)
        .order("display_order");

      if (clientsError || !clients) {
        return NextResponse.json(
          { error: "שגיאה בטעינת לקוחות" },
          { status: 500 },
        );
      }

      const results: MatchResult[] = [];
      for (const client of clients) {
        const result = await setupClient(client.id, supabase, fbConn.access_token);
        results.push(result);
      }

      return NextResponse.json({ data: results });
    }

    return NextResponse.json(
      { error: "נדרש client_id או all: true" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Auto-setup error:", error);
    return NextResponse.json(
      { error: "שגיאה בהגדרה אוטומטית" },
      { status: 500 },
    );
  }
}
