// Supabase REST API helper for server-side API routes
// Uses the service role key for full access (never exposed to client)

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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
  const { url, key } = getConfig();
  const restUrl = `${url}/rest/v1`;

  const target = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([k, v]) => target.searchParams.set(k, v));

  const fetchHeaders: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Support Prefer header (for count=exact, return=minimal, resolution=merge-duplicates, etc.)
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
