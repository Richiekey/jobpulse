/**
 * Utility functions for resolving direct ATS application URLs,
 * detecting ATS platforms, and cleaning aggregator redirect URLs.
 */

export interface ATSInfo {
  platform: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'applytojob' | 'jobvite' | 'icims' | 'smartrecruiters' | 'workable' | 'jobright' | 'other';
  label: string;
  badgeColor: string;
  isDirect: boolean;
}

/**
 * Identify the ATS platform from a given URL
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
  if (u.includes('workable.com') || u.includes('apply.workable.com')) {
    return { platform: 'workable', label: 'Workable', badgeColor: '#6366f1', isDirect: true };
  }
  if (u.includes('jobright.ai')) {
    return { platform: 'jobright', label: 'Jobright Aggregator', badgeColor: '#f97316', isDirect: false };
  }

  return { platform: 'other', label: 'Company Career Page', badgeColor: '#64748b', isDirect: true };
}

/**
 * Resolve direct company ATS URL from an aggregator URL or description text
 */
export function resolveDirectApplyUrl(jobUrl?: string | null, description?: string | null): string {
  if (!jobUrl && !description) return '';

  const rawUrl = (jobUrl || '').trim();

  // If already a direct ATS or company URL, return it
  if (rawUrl && !rawUrl.includes('jobright.ai')) {
    return rawUrl;
  }

  // If it's a Jobright link, look inside the description or URL params for embedded direct links
  if (description) {
    // Check for Greenhouse link in description
    const ghMatch = description.match(/https?:\/\/(?:boards\.)?greenhouse\.io\/[a-zA-Z0-9_\-\.\/]+/i);
    if (ghMatch) return ghMatch[0];

    // Check for Ashby link in description
    const ashbyMatch = description.match(/https?:\/\/jobs\.ashbyhq\.com\/[a-zA-Z0-9_\-\.\/]+/i);
    if (ashbyMatch) return ashbyMatch[0];

    // Check for Lever link in description
    const leverMatch = description.match(/https?:\/\/jobs\.lever\.co\/[a-zA-Z0-9_\-\.\/]+/i);
    if (leverMatch) return leverMatch[0];

    // Check for Workday link in description
    const wdMatch = description.match(/https?:\/\/[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com\/[a-zA-Z0-9_\-\.\/]+/i);
    if (wdMatch) return wdMatch[0];

    // Check for SmartRecruiters link in description
    const srMatch = description.match(/https?:\/\/jobs\.smartrecruiters\.com\/[a-zA-Z0-9_\-\.\/]+/i);
    if (srMatch) return srMatch[0];

    // Check for general URL in description
    const urlMatch = description.match(/https?:\/\/[^\s\<\>"\']+/i);
    if (urlMatch && !urlMatch[0].includes('jobright.ai')) {
      return urlMatch[0];
    }
  }

  return rawUrl || '';
}
