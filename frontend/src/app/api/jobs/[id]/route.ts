import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await supabaseFetch('jobs', {
      select: '*',
      id: `eq.${id}`,
      limit: '1',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    const rows = await res.json();
    if (!rows.length) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}
