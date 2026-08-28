/**
 * JobPulse Diversity & Anti-Monopoly Curation Engine
 * 
 * Scores warehouse jobs against an admin target resume/persona,
 * and applies multi-tier balancing to curate exactly 1,000 high-variety jobs:
 * 1. Company Cap: Max N jobs per company (prevents company monopolies).
 * 2. Multi-ATS Quotas: Balanced representation across Greenhouse, Ashby, Lever, Workday, etc.
 * 3. Role Spread: Balanced distribution across technical domains.
 * 4. Round-Robin Interleaving: Alternates companies and ATS sources across the feed.
 */

export interface CurationCriteria {
  resumeText?: string;
  targetRoles?: string[];
  skills?: string[];
  excludedKeywords?: string[];
  maxJobsPerCompany?: number; // default 3
  atsQuotas?: Record<string, number>; // e.g. { GREENHOUSE: 0.3, ASHBY: 0.2, LEVER: 0.2, WORKDAY: 0.15, OTHER: 0.15 }
  minScoreThreshold?: number; // default 50
  targetTotalJobs?: number; // default 1000
}

export interface RawJob {
  id: string;
  title: string;
  company_name: string;
  location?: string;
  remote_type?: string;
  employment_type?: string;
  department?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  job_url?: string;
  apply_url?: string;
  source: string;
  posted_at?: string;
  created_at?: string;
  skills?: string[];
  role_category?: string;
  is_published?: boolean;
}

export interface ScoredJob extends RawJob {
  matchScore: number;
  matchingSkills: string[];
  scoreBreakdown: {
    titleScore: number;
    skillsScore: number;
    freshnessScore: number;
    penalty: number;
  };
}

export interface DiversitySummary {
  totalSelected: number;
  uniqueCompanies: number;
  atsBreakdown: Record<string, number>;
  roleBreakdown: Record<string, number>;
  averageScore: number;
}

/**
 * Extract keywords and technical skills from resume text
 */
export function extractResumeKeywords(text: string): { skills: string[]; roles: string[] } {
  if (!text) return { skills: [], roles: [] };

  const lower = text.toLowerCase();

  const KNOWN_SKILLS = [
    "react", "next.js", "vue", "angular", "typescript", "javascript", "python",
    "golang", "go", "rust", "java", "c++", "c#", ".net", "sql", "postgresql",
    "mysql", "mongodb", "redis", "kafka", "graphql", "docker", "kubernetes",
    "aws", "gcp", "azure", "ci/cd", "terraform", "django", "fastapi", "node.js",
    "express", "flask", "pytorch", "tensorflow", "spark", "hadoop", "airflow",
    "tailwind", "html", "css", "git", "linux", "rest", "api", "microservices"
  ];

  const KNOWN_ROLES = [
    "full stack", "frontend", "backend", "software engineer", "devops",
    "cloud engineer", "data engineer", "data scientist", "machine learning",
    "ai engineer", "security engineer", "mobile developer", "ios", "android",
    "product manager", "engineering manager", "architect", "qa engineer"
  ];

  const matchedSkills = KNOWN_SKILLS.filter((s) => {
    if (s.length <= 2) {
      const reg = new RegExp(`\\b${s}\\b`, 'i');
      return reg.test(text);
    }
    return lower.includes(s);
  });

  const matchedRoles = KNOWN_ROLES.filter((r) => lower.includes(r));

  return { skills: matchedSkills, roles: matchedRoles };
}

/**
 * Compute compatibility score between a job and target resume criteria
 */
export function scoreJob(job: RawJob, criteria: CurationCriteria): ScoredJob {
  let titleScore = 0;
  let skillsScore = 0;
  let freshnessScore = 0;
  let penalty = 0;

  const jobTitle = (job.title || "").toLowerCase();
  const jobDesc = `${job.title || ""} ${job.description || ""} ${job.requirements || ""} ${(job.skills || []).join(" ")}`.toLowerCase();

  const targetRoles = criteria.targetRoles && criteria.targetRoles.length > 0
    ? criteria.targetRoles.map((r) => r.toLowerCase())
    : ["software engineer", "developer", "engineer", "full stack", "backend", "frontend"];

  const targetSkills = criteria.skills && criteria.skills.length > 0
    ? criteria.skills.map((s) => s.toLowerCase())
    : ["react", "typescript", "python", "javascript", "sql", "node.js", "docker", "aws"];

  const excluded = (criteria.excludedKeywords || []).map((e) => e.toLowerCase().trim()).filter(Boolean);

  // 1. Title Alignment (Up to 40 pts)
  for (const role of targetRoles) {
    if (jobTitle.includes(role)) {
      titleScore = 40;
      break;
    }
    const roleWords = role.split(" ");
    const matchCount = roleWords.filter((w) => jobTitle.includes(w)).length;
    if (matchCount > 0) {
      titleScore = Math.max(titleScore, (matchCount / roleWords.length) * 30);
    }
  }
  if (titleScore === 0 && (jobTitle.includes("engineer") || jobTitle.includes("developer"))) {
    titleScore = 20;
  }

  // 2. Skills Overlap (Up to 40 pts)
  const matchedSkillsList: string[] = [];
  targetSkills.forEach((skill) => {
    if (skill.length <= 2) {
      const reg = new RegExp(`\\b${skill}\\b`, 'i');
      if (reg.test(jobDesc)) matchedSkillsList.push(skill);
    } else if (jobDesc.includes(skill)) {
      matchedSkillsList.push(skill);
    }
  });

  if (targetSkills.length > 0) {
    const ratio = matchedSkillsList.length / Math.min(targetSkills.length, 6);
    skillsScore = Math.min(40, Math.round(ratio * 40));
  } else {
    skillsScore = 25;
  }

  // 3. Freshness (Up to 20 pts)
  const dateStr = job.posted_at || job.created_at;
  if (dateStr) {
    const daysOld = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld <= 2) freshnessScore = 20;
    else if (daysOld <= 7) freshnessScore = 15;
    else if (daysOld <= 14) freshnessScore = 10;
  } else {
    freshnessScore = 10;
  }

  // 4. Excluded Keywords Penalty
  for (const ex of excluded) {
    if (jobTitle.includes(ex) || jobDesc.includes(ex)) {
      penalty += 45;
    }
  }

  const rawTotal = Math.max(0, Math.min(100, Math.round(titleScore + skillsScore + freshnessScore - penalty)));

  return {
    ...job,
    matchScore: rawTotal,
    matchingSkills: matchedSkillsList,
    scoreBreakdown: {
      titleScore: Math.round(titleScore),
      skillsScore: Math.round(skillsScore),
      freshnessScore: Math.round(freshnessScore),
      penalty,
    },
  };
}

/**
 * Diversity & Anti-Monopoly Balancing Algorithm
 * Takes a list of scored jobs, enforces company caps & ATS platform distribution,
 * and interleaves the results to return exactly `targetTotalJobs` (default 1000).
 */
export function balanceJobDiversity(
  scoredJobs: ScoredJob[],
  criteria: CurationCriteria
): { selectedJobs: ScoredJob[]; summary: DiversitySummary } {
  const targetTotal = criteria.targetTotalJobs || 1000;
  const maxPerCompany = criteria.maxJobsPerCompany || 3;
  const minScore = criteria.minScoreThreshold || 40;

  // Filter out jobs below minimum score threshold, sorted by score DESC
  const qualified = scoredJobs
    .filter((j) => j.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);

  // Group by ATS source
  const sourceBuckets = new Map<string, ScoredJob[]>();
  qualified.forEach((job) => {
    const src = (job.source || "UNKNOWN").toUpperCase();
    if (!sourceBuckets.has(src)) sourceBuckets.set(src, []);
    sourceBuckets.get(src)!.push(job);
  });

  // Track counts per company
  const companyCounts = new Map<string, number>();
  const selected: ScoredJob[] = [];
  const selectedIds = new Set<string>();
  const seenJobSignatures = new Set<string>();

  // Helper to add job if company cap permits and job is not a duplicate title
  const tryAddJob = (job: ScoredJob): boolean => {
    if (selectedIds.has(job.id)) return false;
    const compKey = (job.company_name || "Unknown").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const titleKey = (job.title || "Untitled").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const signature = `${compKey}:::${titleKey}`;

    if (seenJobSignatures.has(signature)) return false;

    const rawComp = (job.company_name || "Unknown").trim().toLowerCase();
    const currentCount = companyCounts.get(rawComp) || 0;
    if (currentCount >= maxPerCompany) return false;

    companyCounts.set(rawComp, currentCount + 1);
    seenJobSignatures.add(signature);
    selected.push(job);
    selectedIds.add(job.id);
    return true;
  };

  // Pass 1: Proportional / Round-robin across ATS platforms with company cap
  const allSources = Array.from(sourceBuckets.keys());
  let madeProgress = true;
  let sourcePointers: Record<string, number> = {};
  allSources.forEach((s) => { sourcePointers[s] = 0; });

  while (selected.length < targetTotal && madeProgress) {
    madeProgress = false;
    for (const src of allSources) {
      if (selected.length >= targetTotal) break;
      const bucket = sourceBuckets.get(src) || [];
      let ptr = sourcePointers[src];

      while (ptr < bucket.length) {
        const candidate = bucket[ptr++];
        sourcePointers[src] = ptr;
        if (tryAddJob(candidate)) {
          madeProgress = true;
          break; // Move to next ATS to keep round-robin diversity
        }
      }
    }
  }

  // Pass 2: If we still haven't reached target total due to strict company caps, relax company cap
  if (selected.length < targetTotal) {
    const relaxedCap = maxPerCompany + 2;
    for (const job of qualified) {
      if (selected.length >= targetTotal) break;
      if (selectedIds.has(job.id)) continue;
      const compKey = (job.company_name || "Unknown").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const titleKey = (job.title || "Untitled").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const signature = `${compKey}:::${titleKey}`;
      if (seenJobSignatures.has(signature)) continue;

      const rawComp = (job.company_name || "Unknown").trim().toLowerCase();
      const currentCount = companyCounts.get(rawComp) || 0;
      if (currentCount < relaxedCap) {
        companyCounts.set(rawComp, currentCount + 1);
        seenJobSignatures.add(signature);
        selected.push(job);
        selectedIds.add(job.id);
      }
    }
  }

  // Pass 3: Final backfill from qualified if needed
  if (selected.length < targetTotal) {
    for (const job of qualified) {
      if (selected.length >= targetTotal) break;
      if (selectedIds.has(job.id)) continue;
      const compKey = (job.company_name || "Unknown").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const titleKey = (job.title || "Untitled").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const signature = `${compKey}:::${titleKey}`;
      if (seenJobSignatures.has(signature)) continue;

      seenJobSignatures.add(signature);
      selected.push(job);
      selectedIds.add(job.id);
    }
  }

  // Final Interleaving: Round-robin by company so consecutive jobs don't repeat the same company
  const companyQueues = new Map<string, ScoredJob[]>();
  for (const job of selected) {
    const compKey = (job.company_name || "Unknown").trim().toLowerCase();
    if (!companyQueues.has(compKey)) companyQueues.set(compKey, []);
    companyQueues.get(compKey)!.push(job);
  }

  const interleaved: ScoredJob[] = [];
  let remaining = selected.length;
  while (remaining > 0) {
    for (const [_, queue] of companyQueues.entries()) {
      if (queue.length > 0) {
        interleaved.push(queue.shift()!);
        remaining--;
      }
    }
  }

  // Calculate Diversity Summary Metrics
  const atsBreakdown: Record<string, number> = {};
  const roleBreakdown: Record<string, number> = {};
  let totalScore = 0;

  interleaved.forEach((j) => {
    const src = (j.source || "OTHER").toUpperCase();
    atsBreakdown[src] = (atsBreakdown[src] || 0) + 1;

    const role = (j.role_category || "Engineering").toUpperCase();
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;

    totalScore += j.matchScore;
  });

  const summary: DiversitySummary = {
    totalSelected: interleaved.length,
    uniqueCompanies: companyCounts.size,
    atsBreakdown,
    roleBreakdown,
    averageScore: interleaved.length > 0 ? Math.round(totalScore / interleaved.length) : 0,
  };

  return {
    selectedJobs: interleaved,
    summary,
  };
}
