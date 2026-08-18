import { NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/jobs/source-counts
 * Returns the count of active jobs per source (last 30 days).
 */
export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Use RPC or raw query to get counts grouped by source
    // PostgREST doesn't support GROUP BY, so we query each source separately
    const sources = ["JOBRIGHT", "GREENHOUSE", "ASHBY", "WORKDAY", "LEVER", "WORKABLE", "ICIMS", "APPLYTOJOB", "JOBVITE", "SMARTRECRUITERS"];

    const counts: Record<string, number> = {};

    // Parallel fetch for all sources
    const results = await Promise.allSettled(
      sources.map(async (src) => {
        const params: Record<string, string> = {
          select: "id",
          status: "eq.ACTIVE",
          source: `eq.${src}`,
          or: `(posted_at.gte.${thirtyDaysAgo},and(posted_at.is.null,created_at.gte.${thirtyDaysAgo}))`,
          title: `ilike(any).{*Engineer*,*Developer*,*DevOps*,*SRE*,*QA*,*SDET*,*Full Stack*,*Fullstack*,*Backend*,*Frontend*,*Software*,*Mobile*,*iOS*,*Android*,*Platform*,*Infrastructure*,*Data*,*Machine Learning*,*ML *,*AI *,*Artificial Intelligence*,*NLP*,*LLM*,*Deep Learning*,*Computer Vision*,*Scientist*,*Analytics*,*Security*,*Cyber*,*Cloud*,*Network*,*Product Manager*,*Program Manager*,*TPM*,*Designer*,*UX*,*UI*,*Scrum*,*Agile*,*Account Executive*,*Sales*,*Marketing*,*Operations*,*Financial Analyst*,*Business Analyst*,*Architect*,*Technical*,*Tech Lead*,*CTO*,*VP Engineering*,*Head of*,*Director*,*Manager*}`,
          limit: "1",
        };

        // Try with is_published first
        let res = await supabaseFetch("jobs", { ...params, is_published: "eq.true" }, { Prefer: "count=exact" });

        if (res.ok) {
          const contentRange = res.headers.get("content-range") || "";
          if (contentRange.includes("/")) {
            const total = parseInt(contentRange.split("/")[1], 10);
            if (total > 0) return { source: src, count: total };
          }
        }

        // Fallback without is_published
        res = await supabaseFetch("jobs", params, { Prefer: "count=exact" });
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

    return NextResponse.json({ counts, total: grandTotal }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch counts" }, { status: 500 });
  }
}
