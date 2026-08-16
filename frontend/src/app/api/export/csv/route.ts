import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SELECT_FIELDS = 'id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,job_url,apply_url,source,posted_at,created_at';

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get('limit') || '5000', 10), 10000);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const params: Record<string, string> = {
    select: SELECT_FIELDS,
    status: 'eq.ACTIVE',
    limit: String(limit),
    order: 'posted_at.desc.nullslast,created_at.desc',
  };

  const freshnessCond = `or(posted_at.gte.${thirtyDaysAgo},and(posted_at.is.null,created_at.gte.${thirtyDaysAgo}))`;

  // Search query
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

  // Functions Multi-select
  const functions = sp.get('functions');
  if (functions) {
    const fnList = functions.split(',').map(f => f.trim()).filter(Boolean);
    if (fnList.length === 1) {
      params.title = `ilike.*${fnList[0]}*`;
    } else if (fnList.length > 1) {
      params.title = `ilike(any).{${fnList.map(f => `*${f}*`).join(',')}}`;
    }
  }

  // Exact IDs filter
  const ids = sp.get('ids');
  if (ids) {
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      params.id = `in.(${idList.join(',')})`;
    }
  }

  const remoteType = sp.get('remote_type');
  if (remoteType) params.remote_type = `eq.${remoteType}`;

  const source = sp.get('source');
  if (source) params.source = `eq.${source}`;

  try {
    const res = await supabaseFetch('jobs', params);
    if (!res.ok) {
      return new NextResponse('Failed to export jobs from database', { status: 500 });
    }

    const jobs = await res.json();

    const headers = [
      'Job ID',
      'Title',
      'Company',
      'Location',
      'Remote Type',
      'Employment Type',
      'Department',
      'Salary Min',
      'Salary Max',
      'Currency',
      'Official Apply URL',
      'Jobright URL',
      'ATS Source',
      'Posted At',
    ];

    const csvRows = [
      headers.join(','),
      ...jobs.map((j: any) => [
        escapeCsvField(j.id),
        escapeCsvField(j.title),
        escapeCsvField(j.company_name),
        escapeCsvField(j.location || 'Remote'),
        escapeCsvField(j.remote_type || 'Unspecified'),
        escapeCsvField(j.employment_type || 'Full-time'),
        escapeCsvField(j.department || ''),
        escapeCsvField(j.salary_min || ''),
        escapeCsvField(j.salary_max || ''),
        escapeCsvField(j.salary_currency || 'USD'),
        escapeCsvField(j.apply_url || j.job_url),
        escapeCsvField(j.job_url),
        escapeCsvField(j.source),
        escapeCsvField(j.posted_at ? new Date(j.posted_at).toISOString().split('T')[0] : new Date(j.created_at).toISOString().split('T')[0]),
      ].join(',')),
    ];

    const csvData = '\uFEFF' + csvRows.join('\r\n'); // Add UTF-8 BOM for Excel compatibility

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `jobpulse_export_${dateStr}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return new NextResponse('Export error occurred', { status: 500 });
  }
}
