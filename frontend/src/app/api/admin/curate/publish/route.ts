import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobIds = [], unpublishOthers = true } = body;

    const { url, key } = (() => {
      const u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const k = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
      return { url: u, key: k };
    })();

    if (!url || !key) {
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
    }

    let targetIds = jobIds;

    // If no IDs explicitly passed, get the top 1000 active jobs
    if (targetIds.length === 0) {
      const fetchRes = await fetch(`${url}/rest/v1/jobs?select=id&status=eq.ACTIVE&limit=1000&order=posted_at.desc.nullslast,created_at.desc`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        targetIds = data.map((j: { id: string }) => j.id);
      }
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No jobs available to publish" }, { status: 400 });
    }

    // Cap strictly at 1,000
    const finalIds = targetIds.slice(0, 1000);

    // 1. Unpublish older jobs if requested
    if (unpublishOthers) {
      try {
        await fetch(`${url}/rest/v1/jobs?is_published=eq.true`, {
          method: "PATCH",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ is_published: false }),
        });
      } catch (err) {
        console.warn("Unpublish old jobs note:", err);
      }
    }

    // 2. Publish target batch in chunks of 200
    const nowIso = new Date().toISOString();
    const chunkSize = 200;
    let publishedCount = 0;

    for (let i = 0; i < finalIds.length; i += chunkSize) {
      const chunk = finalIds.slice(i, i + chunkSize);
      const idFilter = `in.(${chunk.join(",")})`;

      const patchRes = await fetch(`${url}/rest/v1/jobs?id=${idFilter}`, {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          is_published: true,
          published_at: nowIso,
        }),
      });

      if (patchRes.ok) {
        publishedCount += chunk.length;
      }
    }

    return NextResponse.json({
      success: true,
      publishedCount,
      timestamp: nowIso,
      message: `Successfully published ${publishedCount} curated positions to the website.`,
    });
  } catch (err: any) {
    console.error("Publish batch API error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
