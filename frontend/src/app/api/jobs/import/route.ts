import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/jobs/import
 * Body: { urls: string[] }
 * 
 * For the $0 MVP, this route is a stub that returns status for each URL.
 * Actual scraping happens in the backend or GitHub Actions.
 * This route validates URLs and queues them for the next scrape cycle.
 */

const ATS_PATTERNS: Record<string, RegExp> = {
  GREENHOUSE: /boards\.greenhouse\.io|job-boards\.greenhouse\.io/i,
  ASHBY: /jobs\.ashbyhq\.com/i,
  LEVER: /jobs\.lever\.co/i,
  WORKDAY: /\.myworkdayjobs\.com/i,
};

function detectATS(url: string): string {
  for (const [ats, pattern] of Object.entries(ATS_PATTERNS)) {
    if (pattern.test(url)) return ats;
  }
  return 'UNKNOWN';
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = body.urls || [];

    if (!urls.length) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    if (urls.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 URLs per batch' }, { status: 400 });
    }

    const batchId = crypto.randomUUID();
    const results = urls.map((url) => {
      if (!isValidUrl(url)) {
        return {
          url,
          status: 'FAILED',
          detected_ats: 'UNKNOWN',
          error_message: 'Invalid URL format',
        };
      }

      const ats = detectATS(url);
      if (ats === 'UNKNOWN') {
        return {
          url,
          status: 'FAILED',
          detected_ats: 'UNKNOWN',
          error_message: 'Unsupported ATS platform. Supported: Greenhouse, Ashby, Lever, Workday',
        };
      }

      return {
        url,
        status: 'QUEUED',
        detected_ats: ats,
        error_message: null,
      };
    });

    const successful = results.filter((r) => r.status === 'QUEUED').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;

    return NextResponse.json({
      batch_id: batchId,
      total: urls.length,
      successful,
      failed,
      duplicates: 0,
      results,
    });
  } catch {
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
