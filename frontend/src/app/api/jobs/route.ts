import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

const SELECT_FIELDS = 'id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,source,posted_at,created_at,skills,role_category';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') || '1', 10);
  const perPage = Math.min(parseInt(sp.get('per_page') || '12', 10), 50);
  const offset = (page - 1) * perPage;

  const params: Record<string, string> = {
    select: SELECT_FIELDS,
    status: 'eq.ACTIVE',
    limit: String(perPage),
    offset: String(offset),
  };

  // Sorting
  const sortBy = sp.get('sort_by') || 'newest';
  if (sortBy === 'oldest') {
    params.order = 'posted_at.asc.nullslast,created_at.asc';
  } else if (sortBy === 'salary') {
    params.order = 'salary_max.desc.nullslast,salary_min.desc.nullslast';
  } else {
    params.order = 'posted_at.desc.nullslast,created_at.desc';
  }

  // Filters
  const q = sp.get('q');
  if (q) params.search_vector = `plfts.english.${q}`;

  const location = sp.get('location');
  if (location) params.location = `ilike.*${location}*`;

  const remoteType = sp.get('remote_type');
  if (remoteType) params.remote_type = `eq.${remoteType}`;

  const source = sp.get('source');
  if (source) params.source = `eq.${source}`;

  const roleCategory = sp.get('role_category');
  if (roleCategory) params.role_category = `eq.${roleCategory}`;

  const skills = sp.get('skills');
  if (skills) {
    const skillsList = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillsList.length) params.skills = `cs.{${skillsList.join(',')}}`;
  }

  const salaryMin = sp.get('salary_min');
  if (salaryMin) params.salary_max = `gte.${salaryMin}`;

  const salaryMax = sp.get('salary_max');
  if (salaryMax) params.salary_min = `lte.${salaryMax}`;

  try {
    const res = await supabaseFetch('jobs', params, { Prefer: 'count=exact' });

    if (!res.ok) {
      return NextResponse.json({ error: 'Database query failed', status: res.status }, { status: 500 });
    }

    const results = await res.json();

    // Parse total from Content-Range header
    let total = 0;
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

    return NextResponse.json({
      items: results,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
