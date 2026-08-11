import { NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

const KNOWN_SOURCES = ['GREENHOUSE', 'ASHBY', 'LEVER', 'WORKDAY'];

export async function GET() {
  try {
    const sourceData: Record<string, any> = {};

    // Initialize all sources
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

    // Get all active job counts in one query, grouped by source
    const jobsRes = await supabaseFetch('jobs', {
      select: 'source',
      status: 'eq.ACTIVE',
      limit: '5000',
    });

    if (jobsRes.ok) {
      const jobs = await jobsRes.json();
      // Count by source
      const counts: Record<string, number> = {};
      for (const job of jobs) {
        const src = job.source;
        counts[src] = (counts[src] || 0) + 1;
      }
      for (const [src, count] of Object.entries(counts)) {
        if (sourceData[src]) {
          sourceData[src].active_jobs = count;
          sourceData[src].total_found = count;
        }
      }
    }

    // Get last run info from source_runs
    const runsRes = await supabaseFetch('source_runs', {
      select: 'source,started_at,status',
      order: 'started_at.desc',
      limit: '20',
    });

    if (runsRes.ok) {
      const runs = await runsRes.json();
      const seen: Record<string, boolean> = {};
      for (const run of runs) {
        const src = run.source;
        if (sourceData[src] && !seen[src]) {
          sourceData[src].last_run = run.started_at;
          if (run.status === 'SUCCESS') {
            sourceData[src].last_success = run.started_at;
          }
          seen[src] = true;
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
