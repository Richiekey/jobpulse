import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';
import { RELEVANT_TITLE_PATTERNS, FUNCTION_KEYWORD_MAP } from '@/lib/jobPatterns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SELECT_FIELDS = 'id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,apply_url_original,is_staffing_agency,source,posted_at,created_at,skills,role_category';

function deduplicateAndInterleaveJobs<T extends { id?: string; title?: string; company_name?: string }>(items: T[]): T[] {
  if (!items || items.length <= 1) return items;

  // 1. Strict Deduplication by normalized signature (company_name + title)
  const seenSignatures = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    const comp = (item.company_name || 'Unknown').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const title = (item.title || 'Untitled').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const signature = `${comp}:::${title}`;

    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      uniqueItems.push(item);
    }
  }

  // 2. Interleave companies so cards from the same company are never adjacent
  const companyBuckets = new Map<string, T[]>();
  for (const item of uniqueItems) {
    const key = (item.company_name || 'Unknown').trim().toLowerCase();
    if (!companyBuckets.has(key)) {
      companyBuckets.set(key, []);
    }
    companyBuckets.get(key)!.push(item);
  }

  const result: T[] = [];
  let remaining = uniqueItems.length;
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

// In-memory cache for API queries (30s TTL)
const apiJobsMemoryCache = new Map<string, { data: any; timestamp: number }>();
const API_CACHE_TTL = 30 * 1000;

// Cached total counts by filter key (3-minute TTL)
const totalCountCache = new Map<string, { total: number; timestamp: number }>();
const TOTAL_COUNT_CACHE_TTL = 3 * 60 * 1000;

async function handleJobsRequest(sp: URLSearchParams, excludeIds: string[] = []) {
  const page = parseInt(sp.get('page') || '1', 10);
  const perPage = Math.min(parseInt(sp.get('per_page') || '12', 10), 50);
  const offset = (page - 1) * perPage;

  // Cache key
  const cacheKey = `${sp.toString()}__ex_${excludeIds.sort().join(',')}`;
  const cached = apiJobsMemoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < API_CACHE_TTL)) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  // Date Posted Filter (24h, 3d, 7d, 14d — default 14d)
  const datePosted = sp.get('date_posted');
  let daysWindow = 14;
  if (datePosted === '24h' || datePosted === '1') daysWindow = 1;
  else if (datePosted === '3d' || datePosted === '3') daysWindow = 3;
  else if (datePosted === '7d' || datePosted === '7') daysWindow = 7;
  else if (datePosted === '14d' || datePosted === '14') daysWindow = 14;

  const dateCutoff = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();

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

  // Freshness condition based on chosen date window
  const freshnessCond = `or(posted_at.gte.${dateCutoff},and(posted_at.is.null,created_at.gte.${dateCutoff}))`;

  // Sorting
  const sortBy = sp.get('sort_by') || 'newest';
  if (sortBy === 'oldest') {
    params.order = 'posted_at.asc,created_at.asc';
  } else if (sortBy === 'salary') {
    params.order = 'salary_max.desc.nullslast,salary_min.desc.nullslast';
  } else {
    params.order = 'posted_at.desc,created_at.desc';
  }

  // Search query (Keyword / Company / Title / Location / Department)
  const q = sp.get('q');
  const functions = sp.get('functions');
  const hasUserSearch = !!(q && q.trim());
  const hasUserFunctions = !!functions;

  if (hasUserSearch) {
    // Sanitize PostgREST reserved characters: , ( ) & # % " *
    const rawClean = q!.replace(/[,()&#%"*]+/g, ' ');
    let words = rawClean.split(/\s+/).map(w => w.trim()).filter(w => w.length > 1);
    if (words.length === 0) {
      words = rawClean.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
    }

    if (words.length === 0) {
      params.or = `(posted_at.gte.${dateCutoff},and(posted_at.is.null,created_at.gte.${dateCutoff}))`;
    } else {
      const wordClauses = words.slice(0, 4).map(w =>
        `or(title.ilike.*${w}*,company_name.ilike.*${w}*,location.ilike.*${w}*,department.ilike.*${w}*)`
      );
      const searchClause = wordClauses.length === 1 ? wordClauses[0] : `and(${wordClauses.join(',')})`;
      params.and = `(${freshnessCond},${searchClause})`;
    }
  } else {
    params.or = `(posted_at.gte.${dateCutoff},and(posted_at.is.null,created_at.gte.${dateCutoff}))`;
  }

  // Country & Location Filters
  const country = sp.get('country');
  const location = sp.get('location');
  if (location && location.trim()) {
    params.location = `ilike.*${location.trim()}*`;
  } else if (country && country !== 'ALL') {
    if (country === 'US') {
      params.location = `ilike(any).{%United States%,%USA%,%US-%,%Remote%US%,%San Francisco%,%New York%,%Seattle%,%Austin%,%Boston%,%Los Angeles%,%Chicago%,%San Jose%,%Sunnyvale%,%Mountain View%,%Denver%,%Atlanta%,%Dallas%,%Miami%,%Portland%,%Washington%,%Philadelphia%,%San Diego%,%Phoenix%,%Minneapolis%,%Raleigh%,%Charlotte%,%Nashville%,%Detroit%,%Irvine%,%Palo Alto%,%Cupertino%,%Menlo Park%,%Redmond%,%Santa Clara%,%Plano%,%Reston%,% CA%,% NY%,% WA%,% TX%,% MA%,% IL%,% CO%,% GA%,% FL%,% NC%,% VA%,% PA%,% MN%,% AZ%,% OR%,% OH%,% MI%,% NJ%,% MD%,% CT%,% UT%}`;
    } else if (country === 'CA') {
      params.location = `ilike(any).{%Canada%,%Toronto%,%Vancouver%,%Montreal%,%Calgary%,%Ottawa%,%Edmonton%,%Ontario%,%Quebec%,%Alberta%,%British Columbia%,%Waterloo%,%Winnipeg%,%Halifax%,%Victoria%,% ON%,% BC%,% QC%,% AB%}`;
    } else if (country === 'UK') {
      params.location = `ilike(any).{%United Kingdom%,%UK%,%London%,%England%,%Edinburgh%,%Manchester%,%Cambridge%,%Bristol%,%Glasgow%,%Oxford%,%Birmingham%,%Leeds%,%Belfast%,%Cardiff%,%Liverpool%,%Reading%,%Scotland%,%Wales%}`;
    }
  }

  if (hasUserFunctions) {
    const fnList = functions!.split(',').map(f => f.trim()).filter(Boolean);
    const allPatterns: string[] = [];
    for (const fn of fnList) {
      const variants = FUNCTION_KEYWORD_MAP[fn];
      if (variants) {
        allPatterns.push(...variants);
      } else {
        allPatterns.push(`*${fn}*`);
      }
    }
    const uniquePatterns = [...new Set(allPatterns)];
    params.title = `ilike(any).{${uniquePatterns.join(',')}}`;
  } else if (!hasUserSearch) {
    params.title = `ilike(any).{${RELEVANT_TITLE_PATTERNS.join(',')}}`;
  }

  // Exact IDs filter (for Saved Jobs catalogue)
  const ids = sp.get('ids');
  if (ids) {
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      params.id = `in.(${idList.join(',')})`;
      delete params.and;
      delete params.or;
      delete params.title;
    }
  }

  // Remote Type Filter (REMOTE, HYBRID, ONSITE)
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
      const titleFallbacks = skillList.map(s => `title.ilike.*${s}*`);
      const skillsOr = `(skills.ov.{${skillList.join(',')}},${titleFallbacks.join(',')})`;
      if (params.or) {
        if (params.and) {
          params.and = `(${params.and.slice(1, -1)},or${skillsOr})`;
        } else {
          params.and = `(${params.or},or${skillsOr})`;
          delete params.or;
        }
      } else {
        params.or = skillsOr;
      }
    }
  }

  // Determine whether we need count=exact or can reuse cached total
  const filterKey = `${sp.get('q') || ''}_${sp.get('country') || ''}_${sp.get('location') || ''}_${sp.get('functions') || ''}_${sp.get('date_posted') || ''}_${sp.get('remote_type') || ''}_${sp.get('source') || ''}_${sp.get('skills') || ''}_${excludeIds.length}`;
  const cachedTotalEntry = totalCountCache.get(filterKey);
  const isCountFresh = cachedTotalEntry && (Date.now() - cachedTotalEntry.timestamp < TOTAL_COUNT_CACHE_TTL);

  // If we already know the total for this filter query, don't force expensive count=exact
  const preferHeader = isCountFresh ? undefined : 'count=exact';

  try {
    const res = await supabaseFetch('jobs', params, preferHeader ? { Prefer: preferHeader } : {});

    let results: any[] = [];
    let total = isCountFresh ? (cachedTotalEntry?.total || 0) : 0;

    if (res.ok) {
      results = await res.json();
      const contentRange = res.headers.get('content-range') || '';
      if (contentRange.includes('/')) {
        const rawTotal = contentRange.split('/')[1];
        const parsed = parseInt(rawTotal, 10);
        if (!isNaN(parsed) && parsed > 0) {
          total = parsed;
          totalCountCache.set(filterKey, { total, timestamp: Date.now() });
        } else if (cachedTotalEntry?.total) {
          total = cachedTotalEntry.total;
        } else {
          total = Math.max(results.length, (page - 1) * perPage + results.length);
        }
      } else if (cachedTotalEntry?.total) {
        total = cachedTotalEntry.total;
      } else if (!total) {
        total = Math.max(results.length, (page - 1) * perPage + results.length);
      }
    } else {
      console.warn("Supabase query note:", res.status);
    }

    const diverseResults = deduplicateAndInterleaveJobs(results);

    const payload = {
      items: diverseResults,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };

    // Store in server SWR cache
    apiJobsMemoryCache.set(cacheKey, { data: payload, timestamp: Date.now() });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'MISS',
      },
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

