import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      jobId,
      companyName,
      jobTitle,
      jobUrl,
      location,
      salary,
      source,
      webhookUrl,
      autoSync = true,
      isTest = false,
    } = body;

    if (!isTest && (!userId || !companyName || !jobTitle)) {
      return NextResponse.json(
        { error: 'Missing required application fields (userId, companyName, jobTitle)' },
        { status: 400 }
      );
    }

    let sheetSyncSuccess = false;
    let sheetSyncError = '';

    // 1. If webhook URL is set and autoSync is enabled, post to Google Apps Script webhook
    if (webhookUrl && (autoSync || isTest)) {
      try {
        const payload = {
          timestamp: new Date().toISOString(),
          dateFormatted: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          company: companyName || 'Test Company',
          title: jobTitle || 'Test Role',
          location: location || 'Remote / Unspecified',
          salary: salary || 'N/A',
          source: source || 'JobPulse',
          link: jobUrl || 'https://jobpulse.app',
          status: 'Applied',
          isTest: !!isTest,
        };

        if (!webhookUrl.includes('/macros/s/') || !webhookUrl.endsWith('/exec')) {
          sheetSyncError = 'Invalid Webhook URL format. Make sure you deploy as a "Web app" and copy the URL ending in /exec (not the /edit or /library URL).';
        } else {
          const sheetRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'follow',
          });

          if (sheetRes.ok) {
            sheetSyncSuccess = true;
          } else if (sheetRes.status === 401 || sheetRes.status === 403) {
            sheetSyncError = 'Google Sheet returned status 401/403 (Unauthorized). In Google Apps Script, click "Deploy > Manage deployments > Edit", set "Who has access" to "Anyone", and click Deploy.';
          } else if (sheetRes.status === 404) {
            sheetSyncError = 'Google Sheet returned status 404 (Not Found). Please check that your Web App deployment is active and the URL is correct.';
          } else {
            sheetSyncError = `Google Sheet webhook returned status ${sheetRes.status}. Check your Apps Script execution logs.`;
          }
        }
      } catch (err: any) {
        sheetSyncError = err?.message || 'Failed to reach Google Sheet webhook';
      }
    }

    // If it's just a connection test, return the test result immediately
    if (isTest) {
      if (sheetSyncSuccess) {
        return NextResponse.json({
          success: true,
          message: 'Test row successfully added to your Google Sheet!',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: sheetSyncError || 'Webhook test failed. Please verify your Google Apps Script Webhook URL is deployed to "Anyone".',
          },
          { status: 400 }
        );
      }
    }

    // 2. Persist application record in Supabase user_applications
    try {
      await supabaseFetch('user_applications', {}, {
        'Prefer': 'resolution=merge-duplicates,return=representation',
      });

      // Post the application record
      const appRecord = {
        user_id: userId,
        job_id: jobId || null,
        company_name: companyName,
        job_title: jobTitle,
        job_url: jobUrl || '',
        location: location || '',
        salary: salary || '',
        source: source || '',
        applied_at: new Date().toISOString(),
        synced_to_sheet: sheetSyncSuccess,
        sync_error: sheetSyncError || null,
      };

      const { url, key } = (() => {
        const u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const k = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
        return { url: u, key: k };
      })();

      await fetch(`${url}/rest/v1/user_applications`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(appRecord),
      });
    } catch (dbErr) {
      console.error('Error saving application to DB:', dbErr);
    }

    return NextResponse.json({
      success: true,
      syncedToSheet: sheetSyncSuccess,
      message: sheetSyncSuccess
        ? 'Application logged and synced to Google Sheet!'
        : 'Application logged to your account.',
      syncError: sheetSyncError || undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
