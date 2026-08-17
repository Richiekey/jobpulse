import { NextRequest, NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobIds = [], unpublishOthers = true } = body;

    let targetIds = jobIds;

    // If no IDs explicitly passed, get the top 1000 active jobs
    if (targetIds.length === 0) {
      const fetchRes = await supabaseFetch("jobs", {
        select: "id",
        status: "eq.ACTIVE",
        limit: "1000",
        order: "posted_at.desc.nullslast,created_at.desc",
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
        await supabaseFetch("jobs", { is_published: "eq.true" }, {
          method: "PATCH",
          body: JSON.stringify({ is_published: false }),
          Prefer: "return=minimal",
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

      const patchRes = await supabaseFetch("jobs", { id: idFilter }, {
        method: "PATCH",
        body: JSON.stringify({
          is_published: true,
          published_at: nowIso,
        }),
        Prefer: "return=minimal",
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
