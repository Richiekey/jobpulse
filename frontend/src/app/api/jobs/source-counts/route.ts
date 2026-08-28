import { NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";
import { ALL_ATS_PLATFORMS } from "@/lib/jobUrls";
import { RELEVANT_TITLE_PATTERNS } from "@/lib/jobPatterns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-side in-memory cache for source counts (5-minute TTL)
let cachedCounts: { counts: Record<string, number>; total: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/jobs/source-counts
 * Returns the count of active jobs per source (last 14 days).
 */
export async function GET() {
  try {
    // Serve from server memory cache if fresh (0ms latency)
    if (cachedCounts && Date.now() - cachedCounts.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        { counts: cachedCounts.counts, total: cachedCounts.total },
        {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
            "X-Cache": "HIT",
          },
        }
      );
    }

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const sources = ALL_ATS_PLATFORMS.map((p) => p.id);

    const counts: Record<string, number> = {};

    // Parallel fetch for all sources
    const results = await Promise.allSettled(
      sources.map(async (src) => {
        const params: Record<string, string> = {
          select: "id",
          status: "eq.ACTIVE",
          source: `eq.${src}`,
          or: `(posted_at.gte.${twoWeeksAgo},and(posted_at.is.null,created_at.gte.${twoWeeksAgo}))`,
          title: `ilike(any).{${RELEVANT_TITLE_PATTERNS.join(',')}}`,
          limit: "1",
        };

        const res = await supabaseFetch("jobs", params, { Prefer: "count=exact" });
        if (res.ok) {
          const contentRange = res.headers.get("content-range") || "";
          if (contentRange.includes("/")) {
            const total = parseInt(contentRange.split("/")[1], 10);
            return { source: src, count: total };
          }
        }

        return { source: src, count: 0 };
      })
    );

    let grandTotal = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        counts[r.value.source] = r.value.count;
        grandTotal += r.value.count;
      }
    }

    cachedCounts = { counts, total: grandTotal, timestamp: Date.now() };

    return NextResponse.json({ counts, total: grandTotal }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "MISS",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch counts" }, { status: 500 });
  }
}
