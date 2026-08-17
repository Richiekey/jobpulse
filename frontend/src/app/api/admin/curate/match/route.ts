import { NextRequest, NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";
import {
  CurationCriteria,
  extractResumeKeywords,
  scoreJob,
  balanceJobDiversity,
  RawJob,
} from "@/lib/curationEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SELECT_FIELDS = "id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,source,posted_at,created_at,skills,role_category";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resumeText = "",
      targetRoles = [],
      skills = [],
      excludedKeywords = [],
      maxJobsPerCompany = 3,
      minScoreThreshold = 35,
      targetTotalJobs = 1000,
    } = body;

    // Auto-extract keywords if resume text is provided
    let finalRoles = targetRoles;
    let finalSkills = skills;

    if (resumeText && (finalRoles.length === 0 || finalSkills.length === 0)) {
      const parsed = extractResumeKeywords(resumeText);
      if (finalRoles.length === 0 && parsed.roles.length > 0) finalRoles = parsed.roles;
      if (finalSkills.length === 0 && parsed.skills.length > 0) finalSkills = parsed.skills;
    }

    const criteria: CurationCriteria = {
      resumeText,
      targetRoles: finalRoles,
      skills: finalSkills,
      excludedKeywords,
      maxJobsPerCompany,
      minScoreThreshold,
      targetTotalJobs,
    };

    // Fetch pool of candidate jobs from database using supabaseFetch
    const res = await supabaseFetch("jobs", {
      select: SELECT_FIELDS,
      status: "eq.ACTIVE",
      limit: "1500",
      order: "posted_at.desc.nullslast,created_at.desc",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Database query failed: ${errText}` }, { status: 500 });
    }

    const warehouseJobs: RawJob[] = await res.json();

    // 1. Score all jobs against resume
    const scoredJobs = warehouseJobs.map((job) => scoreJob(job, criteria));

    // 2. Apply Diversity & Anti-Monopoly Balancing Algorithm
    const { selectedJobs, summary } = balanceJobDiversity(scoredJobs, criteria);

    return NextResponse.json({
      success: true,
      criteria,
      summary,
      totalEvaluated: warehouseJobs.length,
      allSelectedIds: selectedJobs.map((j) => j.id),
      previewJobs: selectedJobs.slice(0, 50), // Send top 50 for UI preview
    });
  } catch (err: any) {
    console.error("Curate match API error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
