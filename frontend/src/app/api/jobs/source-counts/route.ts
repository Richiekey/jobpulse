import { NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";
import { ALL_ATS_PLATFORMS } from "@/lib/jobUrls";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Keywords representing our supported tech/business job functions
const RELEVANT_TITLE_PATTERNS = [
  // Software Engineering
  '*Software Engineer*', '*Software Developer*', '*Full Stack*', '*Fullstack*', '*Full-Stack*',
  '*Backend*', '*Back End*', '*Back-End*', '*Frontend*', '*Front End*', '*Front-End*',
  '*Web Developer*', '*Python Developer*', '*Python Engineer*', '*Java Developer*', '*Java Engineer*',
  '*C++*', '*C/C++*', '*.NET Developer*', '*.NET Engineer*', '*Dotnet*', '*C# Developer*', '*C# Engineer*',
  '*Systems Engineer*', '*System Engineer*', '*DevOps*', '*Platform Engineer*', '*Infrastructure Engineer*',
  '*Mobile Developer*', '*Mobile Engineer*', '*iOS Developer*', '*iOS Engineer*', '*Android Developer*', '*Android Engineer*',
  '*React Native*', '*Flutter*', '*QA Engineer*', '*Quality Assurance Engineer*', '*SDET*', '*Test Automation*', '*Automation Engineer*',
  '*Rust Developer*', '*Rust Engineer*', '*Golang*', '*Go Developer*', '*Go Engineer*',
  '*Firmware Engineer*', '*Embedded Software*', '*Embedded Engineer*',

  // Data & AI / ML
  '*Data Analyst*', '*Data Analytics*', '*BI Analyst*', '*Business Intelligence Analyst*',
  '*Data Scientist*', '*Data Science*', '*Applied Scientist*', '*Decision Scientist*',
  '*Data Engineer*', '*Data Platform*', '*ETL Developer*', '*Data Warehouse*',
  '*Machine Learning*', 'ML *', '* ML *', '* ML/*', '* ML-*', '* (ML)*', '* ML', '*MLOps*', '*Deep Learning*',
  'AI *', '* AI *', '* AI/*', '* AI-*', '* (AI)*', '* AI', '*Artificial Intelligence*',
  '*Generative AI*', '*GenAI*', '*Gen AI*', '*LLM*', '*NLP*', '*Computer Vision*', '*Prompt Engineer*', '*AI Agent*',

  // Cybersecurity & Cloud
  '*Cyber Security*', '*Cybersecurity*', '*Cloud Security*', '*Network Security*',
  '*Security Engineer*', '*Security Analyst*', '*Security Architect*', '*Information Security*',
  '*Infosec*', '*AppSec*', '*Application Security*', '*DevSecOps*', '*SOC Analyst*', '*Penetration Tester*',
  '*Cloud Architect*', '*Cloud Engineer*', '*AWS Engineer*', '*Azure Engineer*', '*GCP Engineer*',
  '*Site Reliability*', 'SRE *', '* SRE *', '* SRE',

  // Product & Design
  '*Product Manager*', '*Technical Program Manager*', 'TPM *', '* TPM *', '* TPM',
  '*Product Designer*', '*UI/UX*', '*UI Designer*', '*UX Designer*', '*UX Researcher*',
  '*User Experience*', '*User Interface*', '*Interaction Designer*', '*Design Systems*',
  '*Scrum Master*', '*Agile Coach*',

  // Business & Tech Ops
  '*Account Executive*', '*Sales Development Representative*', '*Sales Development Rep*', '*SDR *', '* SDR *', '* SDR',
  '*Business Development Representative*', '*BDR *', '* BDR *', '* BDR', '*Enterprise Sales*',
  '*Growth Marketing*', '*Product Marketing*', '*Marketing Specialist*', '*Digital Marketing*',
  '*Business Operations*', '*Revenue Operations*', '*RevOps*',
  '*Financial Analyst*', '*Finance Analyst*', '*FP&A*',

  // Engineering Leadership & Architecture
  '*Software Architect*', '*Solutions Architect*', '*Staff Engineer*', '*Principal Engineer*',
  '*Tech Lead*', '*Technical Lead*', '*Engineering Manager*', '*Director of Engineering*',
  '*VP of Engineering*', '*Head of Engineering*', '*Chief Technology Officer*', 'CTO *', '* CTO *', '* CTO',
];

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
