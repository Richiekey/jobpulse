/**
 * Utility functions for resolving direct ATS application URLs,
 * detecting ATS platforms, and managing dual apply links.
 */

export type ATSPlatformKey =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workday'
  | 'applytojob'
  | 'jobvite'
  | 'icims'
  | 'smartrecruiters'
  | 'rippling'
  | 'recruiterflow'
  | 'gusto_ats'
  | 'manatal'
  | 'recruitee'
  | 'breezy'
  | 'bamboohr'
  | 'cats'
  | 'jobdiva'
  | 'bullhorn'
  | 'oracle_cloud'
  | 'taleo'
  | 'adp'
  | 'personio'
  | 'kula'
  | 'gem'
  | 'teamtailor'
  | 'pinpoint'
  | 'workable'
  | 'jobright'
  | 'other';

export interface ATSInfo {
  platform: ATSPlatformKey;
  label: string;
  badgeColor: string;
  isDirect: boolean;
}

export interface ATSPlatformDefinition {
  id: string;
  label: string;
  color: string;
  isDirect: boolean;
}

export const ALL_ATS_PLATFORMS: ATSPlatformDefinition[] = [
  { id: "JOBRIGHT", label: "Jobright Direct", color: "#f97316", isDirect: false },
  { id: "GREENHOUSE", label: "Greenhouse", color: "#22c55e", isDirect: true },
  { id: "ASHBY", label: "Ashby", color: "#8b5cf6", isDirect: true },
  { id: "LEVER", label: "Lever", color: "#06b6d4", isDirect: true },
  { id: "WORKDAY", label: "Workday", color: "#f59e0b", isDirect: true },
  { id: "SMARTRECRUITERS", label: "SmartRecruiters", color: "#14b8a6", isDirect: true },
  { id: "RIPPLING", label: "Rippling", color: "#9333ea", isDirect: true },
  { id: "RECRUITERFLOW", label: "Recruiterflow", color: "#0ea5e9", isDirect: true },
  { id: "WORKABLE", label: "Workable", color: "#6366f1", isDirect: true },
  { id: "APPLYTOJOB", label: "ApplyToJob / JazzHR", color: "#ec4899", isDirect: true },
  { id: "JOBVITE", label: "Jobvite", color: "#3b82f6", isDirect: true },
  { id: "ICIMS", label: "iCIMS", color: "#10b981", isDirect: true },
  { id: "GUSTO_ATS", label: "Gusto ATS", color: "#ea580c", isDirect: true },
  { id: "MANATAL", label: "Manatal", color: "#0284c7", isDirect: true },
  { id: "RECRUITEE", label: "Recruitee", color: "#16a34a", isDirect: true },
  { id: "BREEZY", label: "Breezy HR", color: "#059669", isDirect: true },
  { id: "BAMBOOHR", label: "BambooHR", color: "#84cc16", isDirect: true },
  { id: "PERSONIO", label: "Personio", color: "#4f46e5", isDirect: true },
  { id: "PINPOINT", label: "Pinpoint", color: "#2563eb", isDirect: true },
  { id: "TEAMTAILOR", label: "Teamtailor", color: "#e11d48", isDirect: true },
  { id: "KULA", label: "Kula", color: "#7c3aed", isDirect: true },
  { id: "GEM", label: "Gem", color: "#db2777", isDirect: true },
  { id: "ORACLE_CLOUD", label: "Oracle Cloud", color: "#dc2626", isDirect: true },
  { id: "ADP", label: "ADP", color: "#b91c1c", isDirect: true },
  { id: "CATS", label: "CATS ATS", color: "#ca8a04", isDirect: true },
  { id: "TALEO", label: "Taleo", color: "#64748b", isDirect: true },
  { id: "JOBDIVA", label: "JobDiva", color: "#64748b", isDirect: true },
  { id: "BULLHORN", label: "Bullhorn", color: "#64748b", isDirect: true },
];

export function getPlatformMeta(sourceId?: string | null): ATSPlatformDefinition {
  if (!sourceId) {
    return { id: "OTHER", label: "External Career Page", color: "#64748b", isDirect: true };
  }
  const clean = sourceId.toUpperCase().trim();
  const found = ALL_ATS_PLATFORMS.find((p) => p.id === clean);
  if (found) return found;
  return {
    id: clean,
    label: clean.charAt(0) + clean.slice(1).toLowerCase().replace(/_/g, " "),
    color: "#64748b",
    isDirect: true,
  };
}

/**
 * Identify the ATS platform from a given URL or source string
 */
export function identifyAtsPlatform(url: string | undefined | null): ATSInfo {
  if (!url) {
    return { platform: 'other', label: 'External Link', badgeColor: '#64748b', isDirect: false };
  }

  const u = url.toLowerCase();

  if (u.includes('boards.greenhouse.io') || u.includes('greenhouse.io') || u.includes('gh_jid=')) {
    return { platform: 'greenhouse', label: 'Greenhouse', badgeColor: '#22c55e', isDirect: true };
  }
  if (u.includes('jobs.lever.co') || u.includes('lever.co')) {
    return { platform: 'lever', label: 'Lever', badgeColor: '#06b6d4', isDirect: true };
  }
  if (u.includes('jobs.ashbyhq.com') || u.includes('ashbyhq.com')) {
    return { platform: 'ashby', label: 'Ashby', badgeColor: '#8b5cf6', isDirect: true };
  }
  if (u.includes('myworkdayjobs.com') || u.includes('workdayjobs.com') || u.includes('workday.com')) {
    return { platform: 'workday', label: 'Workday', badgeColor: '#f59e0b', isDirect: true };
  }
  if (u.includes('applytojob.com')) {
    return { platform: 'applytojob', label: 'JazzHR / ApplyToJob', badgeColor: '#ec4899', isDirect: true };
  }
  if (u.includes('jobvite.com')) {
    return { platform: 'jobvite', label: 'Jobvite', badgeColor: '#3b82f6', isDirect: true };
  }
  if (u.includes('icims.com')) {
    return { platform: 'icims', label: 'iCIMS', badgeColor: '#10b981', isDirect: true };
  }
  if (u.includes('smartrecruiters.com')) {
    return { platform: 'smartrecruiters', label: 'SmartRecruiters', badgeColor: '#14b8a6', isDirect: true };
  }
  if (u.includes('ats.rippling.com') || u.includes('rippling.com')) {
    return { platform: 'rippling', label: 'Rippling', badgeColor: '#9333ea', isDirect: true };
  }
  if (u.includes('recruiterflow.com')) {
    return { platform: 'recruiterflow', label: 'Recruiterflow', badgeColor: '#0ea5e9', isDirect: true };
  }
  if (u.includes('jobs.gusto.com')) {
    return { platform: 'gusto_ats', label: 'Gusto ATS', badgeColor: '#ea580c', isDirect: true };
  }
  if (u.includes('careers-page.com')) {
    return { platform: 'manatal', label: 'Manatal', badgeColor: '#0284c7', isDirect: true };
  }
  if (u.includes('recruitee.com')) {
    return { platform: 'recruitee', label: 'Recruitee', badgeColor: '#16a34a', isDirect: true };
  }
  if (u.includes('breezy.hr')) {
    return { platform: 'breezy', label: 'Breezy HR', badgeColor: '#059669', isDirect: true };
  }
  if (u.includes('bamboohr.com')) {
    return { platform: 'bamboohr', label: 'BambooHR', badgeColor: '#84cc16', isDirect: true };
  }
  if (u.includes('catsone.com')) {
    return { platform: 'cats', label: 'CATS ATS', badgeColor: '#ca8a04', isDirect: true };
  }
  if (u.includes('jobdiva.com')) {
    return { platform: 'jobdiva', label: 'JobDiva (Staffing)', badgeColor: '#64748b', isDirect: true };
  }
  if (u.includes('bullhorn')) {
    return { platform: 'bullhorn', label: 'Bullhorn (Staffing)', badgeColor: '#64748b', isDirect: true };
  }
  if (u.includes('oraclecloud.com')) {
    return { platform: 'oracle_cloud', label: 'Oracle Cloud', badgeColor: '#dc2626', isDirect: true };
  }
  if (u.includes('taleo.net')) {
    return { platform: 'taleo', label: 'Taleo (Staffing)', badgeColor: '#64748b', isDirect: true };
  }
  if (u.includes('adp.com')) {
    return { platform: 'adp', label: 'ADP', badgeColor: '#b91c1c', isDirect: true };
  }
  if (u.includes('personio.com') || u.includes('personio.de')) {
    return { platform: 'personio', label: 'Personio', badgeColor: '#4f46e5', isDirect: true };
  }
  if (u.includes('kula.ai')) {
    return { platform: 'kula', label: 'Kula', badgeColor: '#7c3aed', isDirect: true };
  }
  if (u.includes('gem.com')) {
    return { platform: 'gem', label: 'Gem', badgeColor: '#db2777', isDirect: true };
  }
  if (u.includes('teamtailor.com')) {
    return { platform: 'teamtailor', label: 'Teamtailor', badgeColor: '#e11d48', isDirect: true };
  }
  if (u.includes('pinpointhq.com')) {
    return { platform: 'pinpoint', label: 'Pinpoint', badgeColor: '#2563eb', isDirect: true };
  }
  if (u.includes('workable.com') || u.includes('apply.workable.com')) {
    return { platform: 'workable', label: 'Workable', badgeColor: '#6366f1', isDirect: true };
  }
  if (u.includes('jobright.ai')) {
    return { platform: 'jobright', label: 'Jobright Aggregator', badgeColor: '#f97316', isDirect: false };
  }

  return { platform: 'other', label: 'Company Career Page', badgeColor: '#64748b', isDirect: true };
}

/**
 * Resolve direct company ATS URL from an aggregator URL, description text, or apply_url_original
 */
export function resolveDirectApplyUrl(jobUrl?: string | null, description?: string | null, applyUrlOriginal?: string | null): string {
  if (applyUrlOriginal && applyUrlOriginal.trim()) {
    return applyUrlOriginal.trim();
  }

  if (!jobUrl && !description) return '';

  const rawUrl = (jobUrl || '').trim();

  // If already a direct ATS or company URL, return it
  if (rawUrl && !rawUrl.includes('jobright.ai')) {
    return rawUrl;
  }

  // If it's a Jobright link, look inside the description for embedded direct links
  if (description) {
    const patterns = [
      /https?:\/\/(?:boards\.)?greenhouse\.io\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/jobs\.ashbyhq\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/jobs\.lever\.co\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/jobs\.smartrecruiters\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/ats\.rippling\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/[a-zA-Z0-9_\-\.]+\.applytojob\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/recruiterflow\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/[a-zA-Z0-9_\-\.]+\.workable\.com\/[a-zA-Z0-9_\-\.\/]+/i,
      /https?:\/\/[a-zA-Z0-9_\-\.]+\.icims\.com\/[a-zA-Z0-9_\-\.\/]+/i,
    ];

    for (const pat of patterns) {
      const match = description.match(pat);
      if (match) return match[0];
    }

    // Check for general URL in description
    const urlMatch = description.match(/https?:\/\/[^\s\<\>"\']+/i);
    if (urlMatch && !urlMatch[0].includes('jobright.ai')) {
      return urlMatch[0];
    }
  }

  return rawUrl || '';
}

/**
 * Returns clean dual apply URLs for a job object
 */
export function getDualApplyUrls(job: {
  source?: string | null;
  job_url?: string | null;
  apply_url?: string | null;
  apply_url_original?: string | null;
  description?: string | null;
}) {
  const isJobright = (job.source || '').toUpperCase() === 'JOBRIGHT' || (job.apply_url || '').includes('jobright.ai');
  const directAtsUrl = resolveDirectApplyUrl(job.apply_url, job.description, job.apply_url_original);
  const aggregatorUrl = isJobright ? (job.job_url || job.apply_url || '') : null;

  return {
    isDual: Boolean(isJobright && directAtsUrl && directAtsUrl !== aggregatorUrl),
    directAtsUrl: directAtsUrl || job.apply_url || job.job_url || '',
    aggregatorUrl: aggregatorUrl,
    directAtsInfo: identifyAtsPlatform(directAtsUrl),
  };
}
