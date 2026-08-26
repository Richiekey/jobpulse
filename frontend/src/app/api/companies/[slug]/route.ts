import { NextRequest, NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();

  if (!decodedSlug) {
    return NextResponse.json({ error: "Company name or identifier is required" }, { status: 400 });
  }

  try {
    // 1. Fetch company info from `companies` table if available
    let companyMeta = null;
    const compRes = await supabaseFetch("companies", {
      select: "*",
      or: `(name.ilike.*${decodedSlug}*,ats_identifier.ilike.*${decodedSlug}*)`,
      limit: "1",
    });

    if (compRes.ok) {
      const compRows = await compRes.json();
      if (compRows && compRows.length > 0) {
        companyMeta = compRows[0];
      }
    }

    // 2. Fetch all active jobs for this company from `jobs` table
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const jobsRes = await supabaseFetch("jobs", {
      select: "id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,apply_url_original,is_staffing_agency,source,posted_at,created_at,skills,role_category",
      company_name: `ilike.*${decodedSlug}*`,
      status: "eq.ACTIVE",
      or: `(posted_at.gte.${twoWeeksAgo},and(posted_at.is.null,created_at.gte.${twoWeeksAgo}))`,
      order: "created_at.desc",
      limit: "100",
    });

    let jobs: any[] = [];
    if (jobsRes.ok) {
      jobs = await jobsRes.json();
    }

    // If no jobs found with company_name ilike, and we have companyMeta, try by ats_identifier
    if (jobs.length === 0 && companyMeta?.name) {
      const retryRes = await supabaseFetch("jobs", {
        select: "id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,apply_url_original,is_staffing_agency,source,posted_at,created_at,skills,role_category",
        company_name: `ilike.*${companyMeta.name}*`,
        status: "eq.ACTIVE",
        order: "created_at.desc",
        limit: "100",
      });
      if (retryRes.ok) {
        jobs = await retryRes.json();
      }
    }

    const resolvedName = companyMeta?.name || (jobs.length > 0 ? jobs[0].company_name : decodedSlug);

    return NextResponse.json({
      company: {
        name: resolvedName,
        website: companyMeta?.website || null,
        career_url: companyMeta?.career_url || null,
        ats: companyMeta?.ats || (jobs.length > 0 ? jobs[0].source : null),
        country: companyMeta?.country || null,
      },
      jobs,
      totalJobs: jobs.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch company profile" }, { status: 500 });
  }
}
