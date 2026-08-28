import { NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SELECT_FIELDS = 'id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,apply_url_original,is_staffing_agency,source,posted_at,created_at,skills,role_category';

// Title keywords that match our supported job functions
// Only jobs whose title matches at least one of these patterns will be shown
const RELEVANT_TITLE_PATTERNS = [
  // Software Engineering
  '*Engineer*', '*Developer*', '*DevOps*', '*SRE*', '*QA*', '*SDET*',
  '*Full Stack*', '*Fullstack*', '*Backend*', '*Frontend*', '*Software*',
  '*Mobile*', '*iOS*', '*Android*', '*Platform*', '*Infrastructure*',
  // Data & AI / ML
  '*Data*', '*Machine Learning*', '*ML *', '*AI *', '*Artificial Intelligence*',
  '*NLP*', '*LLM*', '*Deep Learning*', '*Computer Vision*', '*Scientist*',
  '*Analytics*',
  // Cybersecurity & Cloud
  '*Security*', '*Cyber*', '*Cloud*', '*Network*',
  // Product & Design
  '*Product Manager*', '*Program Manager*', '*TPM*', '*Designer*',
  '*UX*', '*UI*', '*Scrum*', '*Agile*',
  // Business & Ops
  '*Account Executive*', '*Sales*', '*Marketing*', '*Operations*',
  '*Financial Analyst*', '*Business Analyst*',
  // General tech
  '*Architect*', '*Technical*', '*Tech Lead*', '*CTO*', '*VP Engineering*',
  '*Head of*', '*Director*', '*Manager*',
];

function interleaveCompanies<T extends { company_name?: string }>(items: T[]): T[] {
  if (!items || items.length <= 1) return items;

  const companyBuckets = new Map<string, T[]>();
  for (const item of items) {
    const key = (item.company_name || 'Unknown').trim().toLowerCase();
    if (!companyBuckets.has(key)) {
      companyBuckets.set(key, []);
    }
    companyBuckets.get(key)!.push(item);
  }

  const result: T[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const [_, queue] of companyBuckets.entries()) {
      if (queue.length > 0) {
        result.push(queue.shift()!);
        remaining--;
      }
    }
  }

  return result;
}

async function handleJobsRequest(sp: URLSearchParams, excludeIds: string[] = []) {
  const page = parseInt(sp.get('page') || '1', 10);
  const perPage = Math.min(parseInt(sp.get('per_page') || '12', 10), 50);
  const offset = (page - 1) * perPage;

  // Date Posted Filter (24h, 3d, 7d, 14d — default 14d)
  const datePosted = sp.get('date_posted');
  let daysWindow = 14;
  if (datePosted === '24h' || datePosted === '1') daysWindow = 1;
  else if (datePosted === '3d' || datePosted === '3') daysWindow = 3;
  else if (datePosted === '7d' || datePosted === '7') daysWindow = 7;
  else if (datePosted === '14d' || datePosted === '14') daysWindow = 14;

  const dateCutoff = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();

  const params: Record<string, string> = {
    select: SELECT_FIELDS,
    status: 'eq.ACTIVE',
    limit: String(perPage),
    offset: String(offset),
  };

  // Exclude hidden/applied job IDs so pagination counts are accurate
  if (excludeIds.length > 0) {
    params.id = `not.in.(${excludeIds.join(',')})`;
  }

  // Freshness condition based on chosen date window
  const freshnessCond = `or(posted_at.gte.${dateCutoff},and(posted_at.is.null,created_at.gte.${dateCutoff}))`;

  // Sorting
  const sortBy = sp.get('sort_by') || 'newest';
  if (sortBy === 'oldest') {
    params.order = 'posted_at.asc,created_at.asc';
  } else if (sortBy === 'salary') {
    params.order = 'salary_max.desc.nullslast,salary_min.desc.nullslast';
  } else {
    params.order = 'posted_at.desc,created_at.desc';
  }

  // Search query (Keyword / Company / Title / Location / Department)
  const q = sp.get('q');
  const functions = sp.get('functions');
  const hasUserSearch = !!(q && q.trim());
  const hasUserFunctions = !!functions;

  if (hasUserSearch) {
    // Sanitize PostgREST reserved characters: , ( ) & # % " *
    const rawClean = q!.replace(/[,()&#%"*]+/g, ' ');
    let words = rawClean.split(/\s+/).map(w => w.trim()).filter(w => w.length > 1);
    if (words.length === 0) {
      words = rawClean.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
    }

    if (words.length === 0) {
      params.or = `(posted_at.gte.${dateCutoff},and(posted_at.is.null,created_at.gte.${dateCutoff}))`;
    } else {
      const wordClauses = words.slice(0, 4).map(w =>
        `or(title.ilike.*${w}*,company_name.ilike.*${w}*,location.ilike.*${w}*,department.ilike.*${w}*)`
      );
      const searchClause = wordClauses.length === 1 ? wordClauses[0] : `and(${wordClauses.join(',')})`;
      params.and = `(${freshnessCond},${searchClause})`;
    }
  } else {
    params.or = `(posted_at.gte.${dateCutoff},and(posted_at.is.null,created_at.gte.${dateCutoff}))`;
  }

  // Country & Location Filters
  const country = sp.get('country');
  const location = sp.get('location');
  if (location && location.trim()) {
    params.location = `ilike.*${location.trim()}*`;
  } else if (country && country !== 'ALL') {
    if (country === 'US') {
      params.location = `ilike(any).{%United States%,%USA%,%US-%,%Remote%US%,%San Francisco%,%New York%,%Seattle%,%Austin%,%Boston%,%Los Angeles%,%Chicago%,%San Jose%,%Sunnyvale%,%Mountain View%,%Denver%,%Atlanta%,%Dallas%,%Miami%,%Portland%,%Washington%,%Philadelphia%,%San Diego%,%Phoenix%,%Minneapolis%,%Raleigh%,%Charlotte%,%Nashville%,%Detroit%,%Irvine%,%Palo Alto%,%Cupertino%,%Menlo Park%,%Redmond%,%Santa Clara%,%Plano%,%Reston%,% CA%,% NY%,% WA%,% TX%,% MA%,% IL%,% CO%,% GA%,% FL%,% NC%,% VA%,% PA%,% MN%,% AZ%,% OR%,% OH%,% MI%,% NJ%,% MD%,% CT%,% UT%}`;
    } else if (country === 'CA') {
      params.location = `ilike(any).{%Canada%,%Toronto%,%Vancouver%,%Montreal%,%Calgary%,%Ottawa%,%Edmonton%,%Ontario%,%Quebec%,%Alberta%,%British Columbia%,%Waterloo%,%Winnipeg%,%Halifax%,%Victoria%,% ON%,% BC%,% QC%,% AB%}`;
    } else if (country === 'UK') {
      params.location = `ilike(any).{%United Kingdom%,%UK%,%London%,%England%,%Edinburgh%,%Manchester%,%Cambridge%,%Bristol%,%Glasgow%,%Oxford%,%Birmingham%,%Leeds%,%Belfast%,%Cardiff%,%Liverpool%,%Reading%,%Scotland%,%Wales%}`;
    }
  }

  // ── Job Functions Multi-select ──
  // Split function names into flexible keyword variants so "Full Stack Engineer"
  // also matches "Fullstack Developer", "Full-Stack Dev", etc.
  const FUNCTION_KEYWORD_MAP: Record<string, string[]> = {
    'Full Stack Engineer': ['*full stack*', '*fullstack*', '*full-stack*'],
    'Backend Engineer': ['*backend*', '*back end*', '*back-end*', '*server side*'],
    'Frontend Software Engineer': ['*frontend*', '*front end*', '*front-end*', '*ui engineer*'],
    'Python Engineer': ['*python*'],
    'Java Engineer': ['*java *', '*java,*'],
    'C/C++ Engineer': ['*c++*', '*c/c++*', '*embedded*'],
    '.Net Engineer': ['*.net*', '*dotnet*', '*c#*'],
    'Systems Engineer': ['*systems engineer*', '*system engineer*'],
    'DevOps': ['*devops*', '*dev ops*', '*platform engineer*', '*site reliability*', '*sre*'],
    'Mobile Engineer': ['*mobile*', '*ios *', '*android*', '*react native*', '*flutter*'],
    'QA / Test Automation': ['*qa *', '*quality assurance*', '*test*', '*sdet*', '*automation engineer*'],
    'Data Analyst': ['*data analyst*', '*business analyst*', '*analytics*'],
    'Data Scientist': ['*data scientist*', '*scientist*'],
    'Data Engineer': ['*data engineer*', '*data platform*', '*etl*', '*data infrastructure*'],
    'Machine Learning Engineer': ['*machine learning*', '*ml *', '*ml,*', '*deep learning*'],
    'AI Engineer': ['*ai *', '*ai,*', '*artificial intelligence*', '*generative ai*', '*genai*'],
    'Machine Learning/AI Researcher': ['*research*scientist*', '*ml research*', '*ai research*'],
    'Machine Learning, Deep Learning': ['*deep learning*', '*neural*', '*computer vision*', '*cv engineer*'],
    'LLM Engineer': ['*llm*', '*large language*', '*nlp*', '*natural language*'],
    'Machine Learning, Computer Vision': ['*computer vision*', '*cv *', '*image*recognition*'],
    'NLP Engineer': ['*nlp*', '*natural language*', '*text mining*', '*computational linguistics*'],
    'Cyber Security Engineer': ['*security*', '*cyber*', '*infosec*', '*appsec*'],
    'Cloud Security Engineer': ['*cloud security*', '*devsecops*'],
    'Network Security Engineer': ['*network security*', '*network engineer*'],
    'Cloud Architect': ['*cloud*architect*', '*cloud engineer*', '*aws*architect*', '*azure*architect*'],
    'Site Reliability Engineer (SRE)': ['*sre*', '*site reliability*', '*reliability engineer*'],
    'Infrastructure Engineer': ['*infrastructure*', '*infra engineer*', '*platform*'],
    'Product Manager': ['*product manager*', '*product lead*', '*pm *'],
    'Technical Program Manager': ['*program manager*', '*tpm*', '*technical program*'],
    'Product Designer': ['*product designer*', '*design*'],
    'UI/UX Designer': ['*ux*', '*ui *', '*ui/*', '*user experience*', '*user interface*'],
    'Scrum Master / Agile Coach': ['*scrum*', '*agile*'],
    'Account Executive': ['*account executive*', '*account manager*', '*ae *'],
    'Sales Development Rep': ['*sales*', '*sdr*', '*business development*', '*bdr*'],
    'Marketing Specialist': ['*marketing*', '*growth*'],
    'Operations Associate': ['*operations*', '*ops *'],
    'Financial Analyst': ['*financial analyst*', '*finance*'],
  };

  if (hasUserFunctions) {
    const fnList = functions!.split(',').map(f => f.trim()).filter(Boolean);
    // Expand each function into its keyword variants
    const allPatterns: string[] = [];
    for (const fn of fnList) {
      const variants = FUNCTION_KEYWORD_MAP[fn];
      if (variants) {
        allPatterns.push(...variants);
      } else {
        // Fallback: use the raw function name as a wildcard
        allPatterns.push(`*${fn}*`);
      }
    }
    // Deduplicate
    const uniquePatterns = [...new Set(allPatterns)];
    params.title = `ilike(any).{${uniquePatterns.join(',')}}`;
  } else if (!hasUserSearch) {
    // Default: only show jobs matching our supported job functions
    params.title = `ilike(any).{${RELEVANT_TITLE_PATTERNS.join(',')}}`;
  }

  // Exact IDs filter (for Saved Jobs catalogue) — overrides exclusion
  const ids = sp.get('ids');
  if (ids) {
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      params.id = `in.(${idList.join(',')})`;
      delete params.and;
      delete params.or;
      delete params.title; // Don't filter saved jobs by title
    }
  }

  // Remote Type Filter (REMOTE, HYBRID, ONSITE)
  const remoteType = sp.get('remote_type');
  if (remoteType && remoteType !== 'ALL') {
    params.remote_type = `eq.${remoteType}`;
  }

  // Source ATS Filter
  const source = sp.get('source');
  if (source && source !== 'ALL') {
    params.source = `eq.${source}`;
  }

  // Skills Filter — use array overlap + title fallback for unenriched jobs
  const skills = sp.get('skills');
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      // Match jobs where skills array overlaps OR title contains any skill keyword
      const titleFallbacks = skillList.map(s => `title.ilike.*${s}*`);
      const skillsOr = `(skills.ov.{${skillList.join(',')}},${titleFallbacks.join(',')})`;
      // Merge into existing OR if present, otherwise set new
      if (params.or) {
        // We need to AND this with the existing OR — use params.and instead
        if (params.and) {
          params.and = `(${params.and.slice(1, -1)},or${skillsOr})`;
        } else {
          params.and = `(${params.or},or${skillsOr})`;
          delete params.or;
        }
      } else {
        params.or = skillsOr;
      }
    }
  }

  try {
    const res = await supabaseFetch('jobs', params, { Prefer: 'count=exact' });

    let results: any[] = [];
    let total = 0;

    if (res.ok) {
      results = await res.json();
      const contentRange = res.headers.get('content-range') || '';
      if (contentRange.includes('/')) {
        try {
          total = parseInt(contentRange.split('/')[1], 10);
        } catch {
          total = results.length;
        }
      } else {
        total = results.length;
      }
    } else {
      console.warn("Supabase query note:", res.status);
    }

    const diverseResults = interleaveCompanies(results);

    return NextResponse.json({
      items: diverseResults,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleJobsRequest(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const excludeIds: string[] = Array.isArray(body.excludeIds) ? body.excludeIds : [];
  return handleJobsRequest(req.nextUrl.searchParams, excludeIds);
}

