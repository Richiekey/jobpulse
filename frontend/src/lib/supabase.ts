// Supabase REST API helper for server-side API routes
// Uses the service role key for full access (never exposed to client)

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
  return { url, key };
}

export async function supabaseFetch(
  table: string,
  params: Record<string, string> = {},
  extraHeaders: Record<string, string> = {}
) {
  const { url, key } = getConfig();
  const restUrl = `${url}/rest/v1`;

  const target = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([k, v]) => target.searchParams.set(k, v));

  const res = await fetch(target.toString(), {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    next: { revalidate: 30 },
  });

  return res;
}
