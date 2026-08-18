import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wvyrivmvpcrhwinzmcyy.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Known ATS URL patterns
const ATS_PATTERNS = [
  /https?:\/\/(?:boards\.|job-boards\.)?greenhouse\.io\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.ashbyhq\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.lever\.co\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.smartrecruiters\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.workable\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.icims\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.applytojob\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.jobvite\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.breezy\.hr\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.recruitee\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/careers\.[a-zA-Z0-9_\-\.]+\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.[a-zA-Z0-9_\-\.]+\.com\/[a-zA-Z0-9_\-\.\/]+/i,
];

// Recursively search an object for URL fields
function findUrlsInObject(obj: any, depth = 0): string[] {
  if (depth > 3 || !obj || typeof obj !== "object") return [];
  const urls: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string" && val.startsWith("http") && !val.includes("jobright.ai")) {
      // Prioritize known URL-like fields
      if (/url|link|apply|career|redirect|external|source/i.test(key)) {
        urls.unshift(val); // high priority
      } else {
        urls.push(val);
      }
    } else if (typeof val === "object" && val !== null) {
      urls.push(...findUrlsInObject(val, depth + 1));
    }
  }
  return urls;
}

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
      return NextResponse.json({ directUrl: null, companyUrl: null, error: "Failed to fetch page" }, { status: 502 });
    }

    const html = await resp.text();
    let directUrl: string | null = null;
    let companyUrl: string | null = null;

    // 1. Try helper_data — Jobright nests data in jobResult and companyResult
    const helperMatch = html.match(/<script\s+id="jobright-helper-job-detail-info"[^>]*>([\s\S]*?)<\/script>/i);
    if (helperMatch?.[1]) {
      try {
        const helper = JSON.parse(helperMatch[1]);

        // Extract company careers URL from companyResult
        const cr = helper?.companyResult;
        if (cr?.companyURL && typeof cr.companyURL === "string") {
          companyUrl = cr.companyURL.trim();
        }

        // Search jobResult for any external URLs
        const jr = helper?.jobResult;
        if (jr && typeof jr === "object") {
          const foundUrls = findUrlsInObject(jr);
          // Check if any found URL matches an ATS pattern
          for (const url of foundUrls) {
            for (const pattern of ATS_PATTERNS) {
              if (pattern.test(url)) {
                directUrl = url.replace(/\.$/, "");
                break;
              }
            }
            if (directUrl) break;
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

    // 3. Regex from full page content for ATS URLs
    if (!directUrl) {
      for (const pattern of ATS_PATTERNS) {
        const match = html.match(pattern);
        if (match) {
          const candidate = match[0].replace(/\.$/, "");
          // Skip CDN/asset URLs
          if (!/\.(js|css|png|jpg|svg|woff|webp)/.test(candidate)) {
            directUrl = candidate;
            break;
          }
        }
      }
    }

    // 4. Cache the result back to DB
    if (directUrl && jobId && jobId !== "test") {
      try {
        await supabase.from("jobs").update({ apply_url: directUrl }).eq("id", jobId);
      } catch {}
    }

    return NextResponse.json({
      directUrl: directUrl || null,
      companyUrl: companyUrl || null,
    });
  } catch (err: any) {
    console.error("resolve-url error:", err);
    return NextResponse.json({ directUrl: null, companyUrl: null, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
