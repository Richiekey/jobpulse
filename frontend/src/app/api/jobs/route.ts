import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SELECT_FIELDS = 'id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,apply_url_original,is_staffing_agency,source,posted_at,created_at,skills,role_category';

// Title keywords that match our supported job functions
// Only jobs whose title matches at least one of these patterns will be shown
const RELEVANT_TITLE_PATTERNS = [
  // Software Engineering
  '*Engineer*', '*Developer*', '*DevOps*', '*SRE*', '*QA*', '*SDET*',
  '*Full Stack*', '*Fullstack*', '*Backend*', '*Frontend*', '*Software*',
  '*Mobile*', '*iOS*', '*Android*', '*Platform*', '*Infrastructure*',
  // Data & AI / ML
  '*Data*', '*Machine Learning*', '*ML *', '*AI *', '*Artificial Intelligence*',
  '*NLP*', '*LLM*', '*Deep Learning*', '*Computer Vision*', '*Scientist*',
  '*Analytics*',
  // Cybersecurity & Cloud
  '*Security*', '*Cyber*', '*Cloud*', '*Network*',
  // Product & Design
  '*Product Manager*', '*Program Manager*', '*TPM*', '*Designer*',
  '*UX*', '*UI*', '*Scrum*', '*Agile*',
  // Business & Ops
  '*Account Executive*', '*Sales*', '*Marketing*', '*Operations*',
  '*Financial Analyst*', '*Business Analyst*',
  // General tech
  '*Architect*', '*Technical*', '*Tech Lead*', '*CTO*', '*VP Engineering*',
  '*Head of*', '*Director*', '*Manager*',
];

function interleaveCompanies<T extends { company_name?: string }>(items: T[]): T[] {
  if (!items || items.length <= 1) return items;

  const companyBuckets = new Map<string, T[]>();
  for (const item of items) {
    const key = (item.company_name || 'Unknown').trim().toLowerCase();
    if (!companyBuckets.has(key)) {
      companyBuckets.set(key, []);
    }
    companyBuckets.get(key)!.push(item);
  }

  const result: T[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const [_, queue] of companyBuckets.entries()) {
      if (queue.length > 0) {
        result.push(queue.shift()!);
        remaining--;
      }
    }
  }

  return result;
}

async function handleJobsRequest(sp: URLSearchParams, excludeIds: string[] = []) {
  const page = parseInt(sp.get('page') || '1', 10);
  const perPage = Math.min(parseInt(sp.get('per_page') || '12', 10), 50);
  const offset = (page - 1) * perPage;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const params: Record<string, string> = {
    select: SELECT_FIELDS,
    status: 'eq.ACTIVE',
    limit: String(perPage),
    offset: String(offset),
  };

  // Exclude hidden/applied job IDs so pagination counts are accurate
  if (excludeIds.length > 0) {
    params.id = `not.in.(${excludeIds.join(',')})`;
  }

  // 30-day freshness condition
  const freshnessCond = `or(posted_at.gte.${thirtyDaysAgo},and(posted_at.is.null,created_at.gte.${thirtyDaysAgo}))`;

  // Sorting
  const sortBy = sp.get('sort_by') || 'newest';
  if (sortBy === 'oldest') {
    params.order = 'posted_at.asc,created_at.asc';
  } else if (sortBy === 'salary') {
    params.order = 'salary_max.desc.nullslast,salary_min.desc.nullslast';
  } else {
    params.order = 'posted_at.desc,created_at.desc';
  }

  // Search query (Keyword / Company / Title)
  const q = sp.get('q');
  const functions = sp.get('functions');
  const hasUserSearch = !!(q && q.trim());
  const hasUserFunctions = !!functions;

  if (hasUserSearch) {
    const term = q!.trim();
    params.and = `(${freshnessCond},or(title.ilike.*${term}*,company_name.ilike.*${term}*,location.ilike.*${term}*))`;
  } else {
    params.or = `(posted_at.gte.${thirtyDaysAgo},and(posted_at.is.null,created_at.gte.${thirtyDaysAgo}))`;
  }

  // Country & Location Filters
  const country = sp.get('country');
  const location = sp.get('location');
  if (location && location.trim()) {
    params.location = `ilike.*${location.trim()}*`;
  } else if (country && country !== 'ALL') {
    if (country === 'US') {
      params.location = `ilike(any).{%United States%,%USA%,%US-Remote%,%San Francisco%,%New York%,%Seattle%,%Austin%,%Boston%,%Los Angeles%,%Chicago%,%San Jose%,%Sunnyvale%,%Mountain View%,%Denver%,%Atlanta%,%Dallas%,%Miami%,%Portland%,%Washington%}`;
    } else if (country === 'CA') {
      params.location = `ilike(any).{%Canada%,%Toronto%,%Vancouver%,%Montreal%,%Calgary%,%Ottawa%,%Edmonton%,%Ontario%,%Quebec%,%Alberta%}`;
    } else if (country === 'UK') {
      params.location = `ilike(any).{%United Kingdom%,%UK%,%London%,%England%,%Edinburgh%,%Manchester%,%Cambridge%,%Bristol%,%Glasgow%,%Oxford%}`;
    }
  }

  // Job Functions Multi-select (user explicitly selected)
  if (hasUserFunctions) {
    const fnList = functions!.split(',').map(f => f.trim()).filter(Boolean);
    if (fnList.length === 1) {
      params.title = `ilike.*${fnList[0]}*`;
    } else if (fnList.length > 1) {
      params.title = `ilike(any).{${fnList.map(f => `*${f}*`).join(',')}}`;
    }
  } else if (!hasUserSearch) {
    // Default: only show jobs matching our supported job functions
    params.title = `ilike(any).{${RELEVANT_TITLE_PATTERNS.join(',')}}`;
  }

  // Exact IDs filter (for Saved Jobs catalogue) — overrides exclusion
  const ids = sp.get('ids');
  if (ids) {
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      params.id = `in.(${idList.join(',')})`;
      delete params.and;
      delete params.or;
      delete params.title; // Don't filter saved jobs by title
    }
  }

  // Remote Type Filter
  const remoteType = sp.get('remote_type');
  if (remoteType && remoteType !== 'ALL') {
    params.remote_type = `eq.${remoteType}`;
  }

  // Source ATS Filter
  const source = sp.get('source');
  if (source && source !== 'ALL') {
    params.source = `eq.${source}`;
  }

  // Skills Filter
  const skills = sp.get('skills');
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      params.skills = `ov.{${skillList.join(',')}}`;
    }
  }

  try {
    const res = await supabaseFetch('jobs', params, { Prefer: 'count=exact' });

    let results: any[] = [];
    let total = 0;

    if (res.ok) {
      results = await res.json();
      const contentRange = res.headers.get('content-range') || '';
      if (contentRange.includes('/')) {
        try {
          total = parseInt(contentRange.split('/')[1], 10);
        } catch {
          total = results.length;
        }
      } else {
        total = results.length;
      }
    } else {
      console.warn("Supabase query note:", res.status);
    }

    const diverseResults = interleaveCompanies(results);

    return NextResponse.json({
      items: diverseResults,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleJobsRequest(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const excludeIds: string[] = Array.isArray(body.excludeIds) ? body.excludeIds : [];
  return handleJobsRequest(req.nextUrl.searchParams, excludeIds);
}

