import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wvyrivmvpcrhwinzmcyy.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Known ATS URL patterns
const ATS_PATTERNS = [
  /https?:\/\/(?:boards\.)?greenhouse\.io\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.ashbyhq\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.lever\.co\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.smartrecruiters\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.workable\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.icims\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.applytojob\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.jobvite\.com\/[a-zA-Z0-9_\-\.\/]+/i,
];

// Helper data fields that may contain direct apply URLs
const HELPER_FIELDS = [
  "applyUrl", "jobApplyUrl", "originalUrl", "externalUrl",
  "companyJobUrl", "sourceUrl", "directUrl", "applyLink",
  "applicationUrl", "externalApplyUrl",
];

/**
 * POST /api/jobs/resolve-url
 * Body: { jobId: string, jobrightUrl: string }
 * 
 * Fetches the Jobright detail page, extracts the direct ATS URL,
 * updates the DB, and returns the resolved URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { jobId, jobrightUrl } = await req.json();

    if (!jobrightUrl || !jobrightUrl.includes("jobright.ai")) {
      return NextResponse.json({ directUrl: jobrightUrl || null });
    }

    // Fetch the Jobright page
    const resp = await fetch(jobrightUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) {
      return NextResponse.json({ directUrl: null, error: "Failed to fetch page" }, { status: 502 });
    }

    const html = await resp.text();
    let directUrl: string | null = null;

    // 1. Try helper_data script tag
    const helperMatch = html.match(/<script\s+id="jobright-helper-job-detail-info"[^>]*>([\s\S]*?)<\/script>/i);
    if (helperMatch?.[1]) {
      try {
        const helper = JSON.parse(helperMatch[1]);
        if (helper && typeof helper === "object") {
          for (const field of HELPER_FIELDS) {
            const val = helper[field];
            if (val && typeof val === "string" && !val.includes("jobright.ai")) {
              directUrl = val.trim();
              break;
            }
          }
        }
      } catch {}
    }

    // 2. Try JSON-LD
    if (!directUrl) {
      const ldMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of ldMatches) {
        try {
          const ld = JSON.parse(m[1]);
          if (ld?.["@type"] === "JobPosting") {
            for (const field of ["url", "sameAs"]) {
              const val = ld[field];
              if (val && typeof val === "string" && !val.includes("jobright.ai")) {
                directUrl = val.trim();
                break;
              }
            }
          }
        } catch {}
        if (directUrl) break;
      }
    }

    // 3. Regex from page content
    if (!directUrl) {
      for (const pattern of ATS_PATTERNS) {
        const match = html.match(pattern);
        if (match) {
          directUrl = match[0].replace(/\.$/, "");
          break;
        }
      }
    }

    // 4. Cache the result back to DB if we found a direct URL
    if (directUrl && jobId) {
      try {
        await supabase
          .from("jobs")
          .update({ apply_url: directUrl })
          .eq("id", jobId);
      } catch {}
    }

    return NextResponse.json({ directUrl: directUrl || jobrightUrl });
  } catch (err: any) {
    console.error("resolve-url error:", err);
    return NextResponse.json({ directUrl: null, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
