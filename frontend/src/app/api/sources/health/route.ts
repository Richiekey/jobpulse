import { NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

const KNOWN_SOURCES = ['GREENHOUSE', 'ASHBY', 'LEVER', 'WORKDAY'];

export async function GET() {
  try {
    // Get active job counts grouped by source directly from jobs table
    const jobsRes = await supabaseFetch('rpc/get_source_health', {});

    let sourceData: Record<string, any> = {};

    // Initialize all known sources with defaults
    for (const src of KNOWN_SOURCES) {
      sourceData[src] = {
        source: src,
        active_jobs: 0,
        total_found: 0,
        last_run: null,
        last_success: null,
        status: 'healthy',
      };
    }

    if (jobsRes.ok) {
      const rpcData = await jobsRes.json();
      // Merge RPC data into known sources
      for (const item of rpcData) {
        const src = item.source || item.platform;
        if (src) {
          sourceData[src] = { ...sourceData[src], ...item, source: src };
        }
      }
    } else {
      // Fallback: count jobs per source directly
      for (const src of KNOWN_SOURCES) {
        const countRes = await supabaseFetch('jobs', {
          select: 'id',
          source: `eq.${src}`,
          status: 'eq.ACTIVE',
        }, { Prefer: 'count=exact' });

        if (countRes.ok) {
          const range = countRes.headers.get('content-range') || '';
          const total = range.includes('/') ? parseInt(range.split('/')[1], 10) : 0;
          sourceData[src].active_jobs = total;
          sourceData[src].total_found = total;
        }
      }

      // Get last run info from source_runs
      const runsRes = await supabaseFetch('source_runs', {
        select: 'source,started_at,status,jobs_found,jobs_inserted',
        order: 'started_at.desc',
        limit: '20',
      });

      if (runsRes.ok) {
        const runs = await runsRes.json();
        for (const run of runs) {
          const src = run.source;
          if (sourceData[src] && !sourceData[src].last_run) {
            sourceData[src].last_run = run.started_at;
            if (run.status === 'SUCCESS') {
              sourceData[src].last_success = run.started_at;
            }
            sourceData[src].total_found = run.jobs_found || sourceData[src].total_found;
          }
        }
      }
    }

    return NextResponse.json({
      sources: Object.values(sourceData),
    });
  } catch {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
