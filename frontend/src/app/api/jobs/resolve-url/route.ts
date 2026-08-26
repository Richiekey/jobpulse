import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wvyrivmvpcrhwinzmcyy.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8";
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cached session
let cachedSessionId: string | null = "af5f3ceeb49e4aa5ac932f696b158c55";
let sessionExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days

const JOBRIGHT_EMAIL = process.env.JOBRIGHT_EMAIL || "merichie430@gmail.com";
const JOBRIGHT_PASSWORD = process.env.JOBRIGHT_PASSWORD || "Jobpulse12345";

async function getJobrightSession(): Promise<string | null> {
  if (cachedSessionId && Date.now() < sessionExpiresAt) {
    return cachedSessionId;
  }

  try {
    const loginRes = await fetch("https://jobright.ai/swan/auth/login/pwd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://jobright.ai",
        "Referer": "https://jobright.ai/",
      },
      body: JSON.stringify({
        email: JOBRIGHT_EMAIL,
        password: JOBRIGHT_PASSWORD,
      }),
    });

    if (loginRes.ok) {
      const setCookie = loginRes.headers.get("set-cookie") || "";
      const match = setCookie.match(/SESSION_ID=([^;]+)/);
      if (match) {
        cachedSessionId = match[1];
        sessionExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
        return cachedSessionId;
      }
    }
  } catch (err) {
    console.error("Jobright login error:", err);
  }

  return cachedSessionId;
}

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
  /https?:\/\/[a-zA-Z0-9_\-\.]+\.jibeapply\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/career\d*\.successfactors\.com\/[a-zA-Z0-9_\-\.\/\?=&]+/i,
  /https?:\/\/workforcenow\.adp\.com\/[a-zA-Z0-9_\-\.\/\?=&]+/i,
  /https?:\/\/careers\.[a-zA-Z0-9_\-\.]+\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/jobs\.[a-zA-Z0-9_\-\.]+\.com\/[a-zA-Z0-9_\-\.\/]+/i,
  /https?:\/\/(?:www\.)?linkedin\.com\/jobs\/view\/\d+/i,
];

// Recursively search an object for URL fields
function findUrlsInObject(obj: any, depth = 0): string[] {
  if (depth > 3 || !obj || typeof obj !== "object") return [];
  const urls: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string" && val.startsWith("http") && !val.includes("jobright.ai")) {
      if (/url|link|apply|career|redirect|external|source/i.test(key)) {
        urls.unshift(val);
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
 * Authenticates with Jobright, fetches the detail page, extracts the
 * exact direct ATS URL from "Original Job Post", updates DB, and returns it.
 */
export async function POST(req: NextRequest) {
  try {
    const { jobId, jobrightUrl } = await req.json();

    if (!jobrightUrl || !jobrightUrl.includes("jobright.ai")) {
      return NextResponse.json({ directUrl: jobrightUrl || null, companyUrl: null });
    }

    const sessionId = await getJobrightSession();

    // Fetch the Jobright page with session
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (sessionId) {
      fetchHeaders["Cookie"] = `SESSION_ID=${sessionId}`;
    }

    let resp = await fetch(jobrightUrl, {
      headers: fetchHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    // If session expired, re-login once
    if (resp.status === 401 || resp.status === 403) {
      cachedSessionId = null;
      const newSession = await getJobrightSession();
      if (newSession) {
        fetchHeaders["Cookie"] = `SESSION_ID=${newSession}`;
        resp = await fetch(jobrightUrl, {
          headers: fetchHeaders,
          redirect: "follow",
          signal: AbortSignal.timeout(12000),
        });
      }
    }

    if (!resp.ok) {
      return NextResponse.json({ directUrl: null, companyUrl: null, error: "Failed to fetch page" }, { status: 502 });
    }

    const html = await resp.text();
    let directUrl: string | null = null;
    let companyUrl: string | null = null;

    // 1. Extract from jobright-helper-job-detail-info (richest)
    const helperMatch = html.match(/<script\s+id="jobright-helper-job-detail-info"[^>]*>([\s\S]*?)<\/script>/i);
    if (helperMatch?.[1]) {
      try {
        const helper = JSON.parse(helperMatch[1]);
        const jr = helper?.jobResult;
        const cr = helper?.companyResult;

        // Company homepage/careers URL
        if (cr?.companyURL && typeof cr.companyURL === "string") {
          companyUrl = cr.companyURL.trim();
        }

        // Direct apply / Original Job Post URL
        for (const candidate of [jr?.originalUrl, jr?.applyLink, jr?.sourceUrl, jr?.externalUrl]) {
          if (candidate && typeof candidate === "string" && !candidate.includes("jobright.ai") && candidate.startsWith("http")) {
            directUrl = candidate.trim();
            break;
          }
        }

        // Fallback: search any nested URL matching ATS patterns
        if (!directUrl && jr && typeof jr === "object") {
          const foundUrls = findUrlsInObject(jr);
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

    // 2. Extract from JSON-LD
    if (!directUrl) {
      const ldMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of ldMatches) {
        try {
          const ld = JSON.parse(m[1]);
          if (ld?.["@type"] === "JobPosting") {
            for (const field of ["url", "sameAs"]) {
              const val = ld[field];
              if (val && typeof val === "string" && !val.includes("jobright.ai") && val.startsWith("http")) {
                directUrl = val.trim();
                break;
              }
            }
          }
        } catch {}
        if (directUrl) break;
      }
    }

    // 3. Fallback regex on HTML for known ATS patterns
    if (!directUrl) {
      for (const pattern of ATS_PATTERNS) {
        const match = html.match(pattern);
        if (match) {
          const candidate = match[0].replace(/\.$/, "");
          if (!/\.(js|css|png|jpg|svg|woff|webp)/.test(candidate)) {
            directUrl = candidate;
            break;
          }
        }
      }
    }

    // 4. Persist to database so subsequent views are instant
    if (directUrl && jobId && jobId !== "test") {
      try {
        await supabase
          .from("jobs")
          .update({
            apply_url: directUrl,
            apply_url_original: directUrl,
          })
          .eq("id", jobId);
      } catch (dbErr) {
        console.warn("Failed to persist resolved apply_url:", dbErr);
      }
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

