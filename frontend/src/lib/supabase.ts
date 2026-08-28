// Supabase REST API helper for server-side API routes
// Uses the service role key for full database access (never exposed to client)

function getServiceConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

  if (!url || !key) {
    console.error('[supabaseFetch Config Error] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on server runtime.');
  }

  return { url, key };
}

export async function supabaseFetch(
  table: string,
  params: Record<string, string> = {},
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    Prefer?: string;
  } = {}
) {
  const { url, key } = getServiceConfig();
  if (!url || !key) {
    throw new Error('Supabase server configuration is missing required SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL');
  }

  const restUrl = `${url}/rest/v1`;
  const target = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([k, v]) => target.searchParams.set(k, v));

  const fetchHeaders: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Support Prefer header (e.g. count=exact, return=minimal, resolution=merge-duplicates)
  if (options.Prefer) {
    fetchHeaders['Prefer'] = options.Prefer;
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: fetchHeaders,
    cache: 'no-store',
  };

  // Only attach body for non-GET methods
  if (options.body && options.method && options.method !== 'GET') {
    fetchOptions.body = options.body;
  }

  const res = await fetch(target.toString(), fetchOptions);
  if (!res.ok) {
    const errText = await res.clone().text();
    console.error("[supabaseFetch ERROR]", res.status, res.statusText, "URL:", target.toString(), "Error:", errText);
  }
  return res;
}
