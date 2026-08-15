import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  const repo = process.env.GITHUB_REPOSITORY || 'Richiekey/jobpulse';

  // Option 1: Trigger GitHub Actions workflow dispatch if GitHub token is present
  if (ghToken) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/scrape.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'JobPulse-App',
        },
        body: JSON.stringify({ ref: 'main' }),
      });

      if (ghRes.status === 204 || ghRes.ok) {
        return NextResponse.json({
          success: true,
          message: 'GitHub Actions scrape workflow dispatched successfully',
          runner: 'github-actions',
        });
      }

      if (ghRes.status === 409) {
        return NextResponse.json(
          { error: 'A scrape run is already in progress', status: 'running' },
          { status: 409 }
        );
      }

      const errorText = await ghRes.text();
      return NextResponse.json(
        { error: `GitHub API error (${ghRes.status}): ${errorText}` },
        { status: ghRes.status }
      );
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to dispatch workflow: ${e?.message}` }, { status: 500 });
    }
  }

  // Option 2: Forward to backend FastAPI server if configured
  if (backendUrl) {
    try {
      const backendRes = await fetch(`${backendUrl.replace(/\/$/, '')}/api/scrape/trigger`, {
        method: 'POST',
      });
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to contact backend: ${e?.message}` }, { status: 500 });
    }
  }

  // Option 3: Helpful guidance if no token/backend is configured
  return NextResponse.json(
    {
      error: 'Triggering on-demand scrape requires GITHUB_TOKEN configured in Vercel environment variables to dispatch the GitHub Actions workflow.',
      hint: 'Scrapes also run automatically every 6 hours via scheduled cron.',
    },
    { status: 400 }
  );
}
