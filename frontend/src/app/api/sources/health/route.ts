import { NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export async function GET() {
  try {
    // Get source health via RPC function
    const res = await supabaseFetch('rpc/get_source_health', {});

    if (!res.ok) {
      // Fallback: query source_runs directly
      const fallback = await supabaseFetch('source_runs', {
        select: 'source,started_at,jobs_found,jobs_inserted,status,error_message',
        order: 'started_at.desc',
        limit: '50',
      });

      if (!fallback.ok) {
        return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
      }

      const runs = await fallback.json();

      // Group by source
      const sourceMap: Record<string, any> = {};
      for (const run of runs) {
        const src = run.source;
        if (!sourceMap[src]) {
          sourceMap[src] = {
            source: src,
            last_run: run.started_at,
            total_runs: 0,
            successful_runs: 0,
            jobs_found_total: 0,
            jobs_inserted_total: 0,
            last_error: null,
          };
        }
        sourceMap[src].total_runs++;
        if (run.status === 'SUCCESS') sourceMap[src].successful_runs++;
        sourceMap[src].jobs_found_total += run.jobs_found || 0;
        sourceMap[src].jobs_inserted_total += run.jobs_inserted || 0;
        if (run.error_message && !sourceMap[src].last_error) {
          sourceMap[src].last_error = run.error_message;
        }
      }

      return NextResponse.json(Object.values(sourceMap));
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
