import { NextRequest, NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";
import {
  CurationCriteria,
  scoreJob,
  balanceJobDiversity,
  RawJob,
} from "@/lib/curationEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SELECT_FIELDS = "id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,source,posted_at,created_at,skills,role_category";

export async function POST(req: NextRequest) {
  try {
    const criteria: CurationCriteria = {
      targetRoles: ["software engineer", "developer", "engineer", "full stack", "backend", "frontend", "devops"],
      skills: ["react", "typescript", "python", "javascript", "sql", "node.js", "docker", "aws", "golang"],
      maxJobsPerCompany: 3,
      minScoreThreshold: 35,
      targetTotalJobs: 1000,
    };

    // 1. Fetch fresh warehouse jobs
    const res = await supabaseFetch("jobs", {
      select: SELECT_FIELDS,
      status: "eq.ACTIVE",
      limit: "1500",
      order: "posted_at.desc.nullslast,created_at.desc",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch warehouse pool" }, { status: 500 });
    }

    const warehouseJobs: RawJob[] = await res.json();

    // 2. Score & Balance
    const scoredJobs = warehouseJobs.map((j) => scoreJob(j, criteria));
    const { selectedJobs, summary } = balanceJobDiversity(scoredJobs, criteria);
    const finalIds = selectedJobs.map((j) => j.id);

    // 3. Unpublish old jobs
    await supabaseFetch("jobs", { is_published: "eq.true" }, {
      method: "PATCH",
      body: JSON.stringify({ is_published: false }),
      Prefer: "return=minimal",
    });

    // 4. Publish 1,000 balanced jobs
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

      if (patchRes.ok) publishedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      publishedCount,
      summary,
      timestamp: nowIso,
      message: `24-Hour Automated Curation completed. ${publishedCount} balanced jobs published across ${summary.uniqueCompanies} unique companies.`,
    });
  } catch (err: any) {
    console.error("Auto-run curation error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
