import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SELECT_FIELDS = 'id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,source,posted_at,created_at,skills,role_category,is_published';

function interleaveCompanies<T extends { company_name?: string }>(items: T[]): T[] {
  if (!items || items.length <= 1) return items;

  // Group items by company_name
  const companyBuckets = new Map<string, T[]>();
  for (const item of items) {
    const key = (item.company_name || 'Unknown').trim().toLowerCase();
    if (!companyBuckets.has(key)) {
      companyBuckets.set(key, []);
    }
    companyBuckets.get(key)!.push(item);
  }

  // Interleave round-robin so jobs from the same company are distributed evenly
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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') || '1', 10);
  const perPage = Math.min(parseInt(sp.get('per_page') || '12', 10), 50);
  const offset = (page - 1) * perPage;
  const showAllWarehouse = sp.get('warehouse') === 'true';

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const params: Record<string, string> = {
    select: SELECT_FIELDS,
    status: 'eq.ACTIVE',
    limit: String(perPage),
    offset: String(offset),
  };

  // If not explicitly inspecting entire warehouse, default to published jobs
  if (!showAllWarehouse) {
    // Attempt published query
    params.is_published = 'eq.true';
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
  if (q && q.trim()) {
    const term = q.trim();
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

  // Job Functions Multi-select
  const functions = sp.get('functions');
  if (functions) {
    const fnList = functions.split(',').map(f => f.trim()).filter(Boolean);
    if (fnList.length === 1) {
      params.title = `ilike.*${fnList[0]}*`;
    } else if (fnList.length > 1) {
      params.title = `ilike(any).{${fnList.map(f => `*${f}*`).join(',')}}`;
    }
  }

  // Exact IDs filter (for Saved Jobs catalogue)
  const ids = sp.get('ids');
  if (ids) {
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      params.id = `in.(${idList.join(',')})`;
      delete params.and;
      delete params.or;
      delete params.is_published;
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
    let res = await supabaseFetch('jobs', params, { Prefer: 'count=exact' });

    // Fallback: If 0 published jobs found and not looking for specific IDs, fallback to active jobs
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
    }

    if (results.length === 0 && params.is_published && !ids) {
      delete params.is_published;
      const fallbackRes = await supabaseFetch('jobs', params, { Prefer: 'count=exact' });
      if (fallbackRes.ok) {
        results = await fallbackRes.json();
        const contentRange = fallbackRes.headers.get('content-range') || '';
        if (contentRange.includes('/')) {
          try {
            total = parseInt(contentRange.split('/')[1], 10);
          } catch {
            total = results.length;
          }
        } else {
          total = results.length;
        }
      }
    }

    const diverseResults = interleaveCompanies(results);

    // Enforce 1,000 public cap
    const publicCappedTotal = Math.min(total, 1000);

    return NextResponse.json({
      items: diverseResults,
      total: publicCappedTotal,
      warehouseTotal: total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(publicCappedTotal / perPage),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
