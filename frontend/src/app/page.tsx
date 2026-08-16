"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import LocationFilterPopover, { LocationFilterState } from "@/components/LocationFilterPopover";
import JobFunctionFilterPopover from "@/components/JobFunctionFilterPopover";
import {
  Search, Download, Briefcase, MapPin, Building2, ExternalLink,
  Loader2, ChevronLeft, ChevronRight, DollarSign, Clock, X,
  Bookmark, BookmarkCheck, CheckCircle2, ThumbsDown, Eye, EyeOff,
  Filter, Tag, Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  remote_type: string;
  employment_type: string;
  department?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  job_url: string;
  apply_url: string;
  source: string;
  posted_at?: string;
  created_at?: string;
  skills?: string[];
  role_category?: string;
}

const API_BASE = "/api";

// ── Skill color mapping ────────────────────────────────────────
const SKILL_COLORS: Record<string, string> = {
  Python: "#3776AB", JavaScript: "#F7DF1E", TypeScript: "#3178C6",
  React: "#61DAFB", "Next.js": "#000", Go: "#00ADD8", Rust: "#CE422B",
  Java: "#ED8B00", "C++": "#00599C", SQL: "#336791", Docker: "#2496ED",
  Kubernetes: "#326CE5", AWS: "#FF9900", GCP: "#4285F4", Azure: "#0078D4",
  PostgreSQL: "#336791", MongoDB: "#47A248", Redis: "#DC382D",
  GraphQL: "#E10098", Terraform: "#7B42BC", Git: "#F05032",
  Linux: "#FCC624", Kafka: "#231F20", Spark: "#E25A1C",
  TensorFlow: "#FF6F00", PyTorch: "#EE4C2C",
};

function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] || "#6366f1";
}

// ── Helpers ────────────────────────────────────────────────────
function formatSalary(min?: number, max?: number, currency?: string, period?: string) {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
    return n.toLocaleString();
  };
  const curr = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency || "$";
  const p = (period || "").toLowerCase();
  const suffix = p === "yearly" || p === "annual" || p === "year" ? "/yr"
    : p === "monthly" || p === "month" ? "/mo"
    : p === "weekly" || p === "week" ? "/wk"
    : p === "hourly" || p === "hour" ? "/hr"
    : "";
  if (min && max) {
    if (min === max) return `${curr}${fmt(min)}${suffix}`;
    return `${curr}${fmt(min)}${suffix} – ${curr}${fmt(max)}${suffix}`;
  }
  if (min) return `${curr}${fmt(min)}${suffix}+`;
  return `Up to ${curr}${fmt(max!)}${suffix}`;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function freshnessColor(dateStr?: string): { dot: string; label: string } {
  if (!dateStr) return { dot: "var(--text-muted)", label: "Unknown" };
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 2) return { dot: "#34d399", label: "New" };
  if (days <= 7) return { dot: "#fbbf24", label: "Recent" };
  return { dot: "#f87171", label: "Aging" };
}

function remoteBadgeClass(type: string) {
  if (type === "REMOTE") return "badge badge-remote";
  if (type === "HYBRID") return "badge badge-hybrid";
  return "badge badge-onsite";
}

function sourceBadgeClass(source: string) {
  const s = source?.toLowerCase();
  if (s === "greenhouse") return "badge badge-greenhouse";
  if (s === "ashby") return "badge badge-ashby";
  if (s === "lever") return "badge badge-lever";
  if (s === "workday") return "badge badge-workday";
  if (s === "workable") return "badge badge-workable";
  if (s === "applytojob") return "badge badge-applytojob";
  if (s === "jobvite") return "badge badge-jobvite";
  if (s === "icims") return "badge badge-icims";
  if (s === "jobright") return "badge badge-jobright";
  return "badge";
}

// ── LocalStorage helpers ───────────────────────────────────────
function getStoredSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function saveStoredSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

// ── Role categories ────────────────────────────────────────────
const ROLE_CATEGORIES = [
  "Software Engineer", "Data Engineer", "Data Analyst", "Data Scientist",
  "DevOps / SRE", "Product Manager", "Designer", "QA / Testing",
  "Security", "Mobile",
];

// ── Popular skills for filter ──────────────────────────────────
const POPULAR_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "SQL", "AWS",
  "Docker", "Kubernetes", "Java", "Go", "PostgreSQL", "Node.js",
  "Machine Learning", "GraphQL", "Terraform", "MongoDB",
];

// ── Skeleton ───────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="skeleton" style={{ width: "65%", height: 18 }} />
        <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 100, height: 14 }} />
        <div className="skeleton" style={{ width: 120, height: 14 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <div className="skeleton" style={{ width: 50, height: 20, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 45, height: 20, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
        <div className="skeleton" style={{ width: 60, height: 14 }} />
        <div className="skeleton" style={{ width: 80, height: 30, borderRadius: 8 }} />
      </div>
    </div>
  );
}

// ── Job Detail Modal ───────────────────────────────────────────
function JobModal({
  job, onClose, appliedSet, hiddenSet, savedSet,
  onToggleApplied, onToggleHidden, onToggleSaved,
}: {
  job: Job;
  onClose: () => void;
  appliedSet: Set<string>;
  hiddenSet: Set<string>;
  savedSet: Set<string>;
  onToggleApplied: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleSaved: (id: string) => void;
}) {
  const isApplied = appliedSet.has(job.id);
  const isHidden = hiddenSet.has(job.id);
  const isSaved = savedSet.has(job.id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const freshness = freshnessColor(job.posted_at || job.created_at);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border-medium)",
          borderRadius: 20, width: "100%", maxWidth: 720,
          maxHeight: "85vh", overflow: "auto",
          animation: "fadeInUp 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.3 }}>
              {job.title}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10, fontSize: 14, color: "var(--text-secondary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Building2 size={15} style={{ color: "var(--accent-glow)" }} /> {job.company_name}
              </span>
              {job.location && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={15} style={{ color: "var(--text-muted)" }} /> {job.location}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: freshness.dot }} />
                {timeAgo(job.posted_at || job.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
              padding: 8, cursor: "pointer", color: "var(--text-secondary)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Badges row */}
        <div style={{ padding: "12px 28px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span className={sourceBadgeClass(job.source)}>{job.source}</span>
          {job.remote_type && job.remote_type !== "UNKNOWN" && (
            <span className={remoteBadgeClass(job.remote_type)}>{job.remote_type}</span>
          )}
          {job.employment_type && (
            <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>
              {job.employment_type.replace("_", " ")}
            </span>
          )}
          {job.department && (
            <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
              {job.department}
            </span>
          )}
        </div>

        {/* Salary */}
        {(job.salary_min || job.salary_max) && (
          <div style={{ padding: "0 28px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700, color: "var(--salary)" }}>
            <DollarSign size={16} />
            {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
          </div>
        )}

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div style={{ padding: "0 28px 16px", display: "flex", flexWrap: "wrap", gap: 5 }}>
            {job.skills.map((skill) => (
              <span
                key={skill}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: `${getSkillColor(skill)}18`, color: getSkillColor(skill),
                  border: `1px solid ${getSkillColor(skill)}30`,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Links Box */}
        <div style={{ margin: "16px 28px 0", padding: "14px 18px", borderRadius: 12, background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>
              Original Apply (Company / ATS Board)
            </div>
            <a
              href={job.apply_url || job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "var(--accent-glow)", wordBreak: "break-all", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {job.apply_url || job.job_url} <ExternalLink size={12} />
            </a>
          </div>

          {job.source === "JOBRIGHT" && job.job_url && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>
                Jobright Listing
              </div>
              <a
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#60a5fa", wordBreak: "break-all", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {job.job_url} <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border-subtle)", margin: "16px 28px 0" }} />

        {/* Description */}
        <div style={{ padding: "20px 28px", fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
          {job.description ? (
            <div dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, "<br/>") }} />
          ) : (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description available</p>
          )}

          {job.requirements && (
            <>
              <h4 style={{ color: "var(--text-primary)", fontWeight: 600, marginTop: 20, marginBottom: 8, fontSize: 15 }}>Requirements</h4>
              <div dangerouslySetInnerHTML={{ __html: job.requirements.replace(/\n/g, "<br/>") }} />
            </>
          )}

          {job.responsibilities && (
            <>
              <h4 style={{ color: "var(--text-primary)", fontWeight: 600, marginTop: 20, marginBottom: 8, fontSize: 15 }}>Responsibilities</h4>
              <div dangerouslySetInnerHTML={{ __html: job.responsibilities.replace(/\n/g, "<br/>") }} />
            </>
          )}
        </div>

        {/* Actions bar matching Screenshot 2 */}
        <div style={{
          padding: "16px 28px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
          position: "sticky", bottom: 0, background: "var(--bg-card)",
          borderRadius: "0 0 20px 20px",
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <a
              href={job.apply_url || job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ padding: "8px 18px", fontSize: 13, background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              Apply on company site <ExternalLink size={13} />
            </a>

            {job.source === "JOBRIGHT" && job.job_url && (
              <a
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: "8px 14px", fontSize: 13, color: "#60a5fa", borderColor: "rgba(96,165,250,0.3)" }}
              >
                Jobright <ExternalLink size={12} />
              </a>
            )}

            <button
              className={isApplied ? "btn-primary" : "btn-secondary"}
              onClick={() => onToggleApplied(job.id)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                background: isApplied ? "rgba(52,211,153,0.15)" : undefined,
                color: isApplied ? "var(--success)" : undefined,
                borderColor: isApplied ? "rgba(52,211,153,0.4)" : undefined,
              }}
            >
              <CheckCircle2 size={15} /> {isApplied ? "Applied ✓" : "Mark Applied"}
            </button>

            <button
              className="btn-secondary"
              onClick={() => onToggleHidden(job.id)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: isHidden ? "var(--danger)" : "var(--text-muted)",
                borderColor: isHidden ? "rgba(248,113,113,0.4)" : undefined,
              }}
            >
              <ThumbsDown size={14} /> {isHidden ? "Hidden" : "Not suitable"}
            </button>

            <button
              className="btn-secondary"
              onClick={() => onToggleSaved(job.id)}
              style={{ padding: "8px 12px", color: isSaved ? "var(--warning)" : "var(--text-muted)" }}
              title={isSaved ? "Saved" : "Save for later"}
            >
              {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Global in-memory query cache for instant (0ms) pagination & filter returns
const jobsMemoryCache = new Map<string, { items: Job[]; total: number; timestamp: number }>();

// ── Main Dashboard ─────────────────────────────────────────────
export default function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [locationState, setLocationState] = useState<LocationFilterState>({
    country: "ALL",
    allLocationsInCountry: true,
    cityOrState: "",
  });
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [remoteType, setRemoteType] = useState("");
  const [source, setSource] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // In-flight request controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Job modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [fullJobData, setFullJobData] = useState<Job | null>(null);

  // Auth context for Google Sheets sync & user tracking
  const { user, syncAppliedJobToSheet } = useAuth();

  // Tracking sets
  const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set());
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [showApplied, setShowApplied] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Load tracking from localStorage
  useEffect(() => {
    setAppliedSet(getStoredSet("jp_applied"));
    setHiddenSet(getStoredSet("jp_hidden"));
    setSavedSet(getStoredSet("jp_saved"));
  }, []);

  const toggleApplied = (id: string) => {
    const isNowApplied = !appliedSet.has(id);

    setAppliedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveStoredSet("jp_applied", next);
      return next;
    });

    // If marked as applied and user is logged in, auto-sync to Google Sheet & cloud applications
    if (isNowApplied && syncAppliedJobToSheet) {
      const targetJob = jobs.find((j) => j.id === id) || (fullJobData?.id === id ? fullJobData : selectedJob);
      if (targetJob) {
        syncAppliedJobToSheet({
          id: targetJob.id,
          company_name: targetJob.company_name,
          title: targetJob.title,
          location: targetJob.location,
          job_url: targetJob.job_url,
          apply_url: targetJob.apply_url,
          salary: targetJob.salary_min ? `${targetJob.salary_min}-${targetJob.salary_max} ${targetJob.salary_currency || "USD"}` : "",
          source: targetJob.source,
        });
      }
    }
  };

  const toggleHidden = (id: string) => {
    setHiddenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveStoredSet("jp_hidden", next);
      return next;
    });
  };

  const toggleSaved = (id: string) => {
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveStoredSet("jp_saved", next);
      return next;
    });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill); else next.add(skill);
      return next;
    });
  };

  const PAGE_SIZE = 12;

  const fetchJobs = useCallback(async (p = page) => {
    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cacheKey = `${p}_${query}_${locationState.country}_${locationState.cityOrState}_${selectedFunctions.sort().join(",")}_${remoteType}_${source}_${[...selectedSkills].sort().join(",")}`;
    const cached = jobsMemoryCache.get(cacheKey);
    const isCacheValid = cached && (Date.now() - cached.timestamp < 60000); // 60s cache

    // If valid in cache, render immediately (0ms latency)
    if (cached) {
      setJobs(cached.items);
      setTotal(cached.total);
      setTotalPages(Math.ceil((cached.total || 0) / PAGE_SIZE));
      setLoading(false);
      setError(null);
      if (isCacheValid) {
        return; // Cache is fresh, skip network
      }
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", "24");
      if (query) params.set("q", query);
      if (locationState.country) params.set("country", locationState.country);
      if (locationState.cityOrState) params.set("location", locationState.cityOrState);
      if (selectedFunctions.length > 0) params.set("functions", selectedFunctions.join(","));
      if (remoteType) params.set("remote_type", remoteType);
      if (source) params.set("source", source);
      if (selectedSkills.size > 0) params.set("skills", [...selectedSkills].join(","));

      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${API_BASE}/jobs?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const tot = data.total || 0;

        jobsMemoryCache.set(cacheKey, { items, total: tot, timestamp: Date.now() });

        setJobs(items);
        setTotal(tot);
        setTotalPages(Math.ceil(tot / PAGE_SIZE));
      } else {
        if (!cached) setError(`Server error (${res.status})`);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      if (!cached) setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, [query, locationState, selectedFunctions, remoteType, source, selectedSkills, page]);

  useEffect(() => { setPage(1); fetchJobs(1); }, [remoteType, source, locationState, selectedFunctions, selectedSkills]);
  useEffect(() => { fetchJobs(page); }, [page]);

  const handleSearch = () => { setPage(1); fetchJobs(1); };

  // Filter out applied/hidden jobs
  const visibleJobs = jobs.filter((job) => {
    if (!showApplied && appliedSet.has(job.id)) return false;
    if (!showHidden && hiddenSet.has(job.id)) return false;
    return true;
  });

  // Display exactly PAGE_SIZE jobs on the current view
  const displayedJobs = visibleJobs.slice(0, PAGE_SIZE);

  // Background auto-replenish: when visible jobs drop below buffer threshold, pull the next batch
  useEffect(() => {
    if (loading || visibleJobs.length >= PAGE_SIZE + 6 || jobs.length === 0 || jobs.length >= total) {
      return;
    }

    const replenishNextJobs = async () => {
      try {
        const nextBatchPage = Math.floor(jobs.length / 12) + 1;
        const params = new URLSearchParams();
        params.set("page", String(nextBatchPage));
        params.set("per_page", "12");
        if (query) params.set("q", query);
        if (locationState.country) params.set("country", locationState.country);
        if (locationState.cityOrState) params.set("location", locationState.cityOrState);
        if (selectedFunctions.length > 0) params.set("functions", selectedFunctions.join(","));
        if (remoteType) params.set("remote_type", remoteType);
        if (source) params.set("source", source);
        if (selectedSkills.size > 0) params.set("skills", [...selectedSkills].join(","));

        const res = await fetch(`${API_BASE}/jobs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const newItems: Job[] = data.items || [];
          if (newItems.length > 0) {
            setJobs((prev) => {
              const existingIds = new Set(prev.map((j) => j.id));
              const uniqueNew = newItems.filter((j) => !existingIds.has(j.id));
              return [...prev, ...uniqueNew];
            });
          }
        }
      } catch {
        // Silently ignore background replenishment error
      }
    };

    replenishNextJobs();
  }, [visibleJobs.length, loading, jobs.length, total, query, locationState, selectedFunctions, remoteType, source, selectedSkills]);

  // Fetch full job for modal
  const openJobModal = async (job: Job) => {
    setSelectedJob(job);
    try {
      const res = await fetch(`${API_BASE}/jobs/${job.id}`);
      if (res.ok) {
        setFullJobData(await res.json());
      } else {
        setFullJobData(job);
      }
    } catch {
      setFullJobData(job);
    }
  };

  const appliedCount = jobs.filter((j) => appliedSet.has(j.id)).length;
  const hiddenCount = jobs.filter((j) => hiddenSet.has(j.id)).length;

  return (
    <div>
      {/* ── Hero Header ────────────────── */}
      <div className="animate-fade-in-up" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>
              Discover Jobs
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--accent-glow)" }}>
                {total.toLocaleString()}
              </span>{" "}
              positions aggregated across ATS platforms
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={15} /> Filters {selectedSkills.size > 0 && <span style={{ background: "var(--accent-main)", color: "white", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{selectedSkills.size}</span>}
            </button>
            <button className="btn-secondary" onClick={() => window.open(`${API_BASE}/export/csv`, "_blank")}>
              <Download size={15} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Row Matching Jobright ─────────────────── */}
      <div
        className="animate-fade-in-up"
        style={{
          animationDelay: "60ms",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          padding: "16px 18px",
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        {/* Search Input with Clear Button */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search keywords, job titles, companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="input-field"
            style={{ paddingLeft: 40, paddingRight: query ? 36 : 14 }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white p-1 rounded-md cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Jobright-style Country & Location Popover (Screenshot 1) */}
        <LocationFilterPopover
          value={locationState}
          onChange={(newLoc) => setLocationState(newLoc)}
        />

        {/* Jobright-style Categorized & Subcategorized Job Function Multi-select (Screenshot 2) */}
        <JobFunctionFilterPopover
          selectedFunctions={selectedFunctions}
          onChange={(fns) => setSelectedFunctions(fns)}
        />

        {/* Remote Type */}
        <select
          value={remoteType}
          onChange={(e) => setRemoteType(e.target.value)}
          className="select-field cursor-pointer font-medium"
          style={{ flex: "0 1 130px" }}
        >
          <option value="">All Types</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">Onsite</option>
        </select>

        {/* ATS Source */}
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="select-field cursor-pointer font-medium"
          style={{ flex: "0 1 170px" }}
        >
          <option value="">All Sources ({total > 0 && !source ? `${total.toLocaleString()}` : "13.5k+"})</option>
          <option value="JOBRIGHT">Jobright (9.7k+)</option>
          <option value="GREENHOUSE">Greenhouse (3.3k+)</option>
          <option value="ASHBY">Ashby (440+)</option>
          <option value="WORKDAY">Workday (29)</option>
          <option value="LEVER">Lever (24)</option>
        </select>

        {/* Search Action Button */}
        <button
          className="btn-primary flex items-center gap-1.5 font-bold cursor-pointer"
          onClick={handleSearch}
          style={{ flexShrink: 0, padding: "10px 18px" }}
        >
          <Search size={14} /> Search
        </button>

        {/* Clear All Filters button if active */}
        {(query || locationState.cityOrState || locationState.country !== "ALL" || selectedFunctions.length > 0 || remoteType || source || selectedSkills.size > 0) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setLocationState({ country: "ALL", allLocationsInCountry: true, cityOrState: "" });
              setSelectedFunctions([]);
              setRemoteType("");
              setSource("");
              setSelectedSkills(new Set());
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer border"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              borderColor: "rgba(239, 68, 68, 0.3)",
              color: "#f87171",
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Quick Filter Presets Row ─────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide text-xs animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <span className="text-muted text-[11px] font-bold uppercase tracking-wider whitespace-nowrap pl-1" style={{ color: "var(--text-muted)" }}>
          Quick Filters:
        </span>

        {/* Remote Preset */}
        <button
          type="button"
          onClick={() => setRemoteType(remoteType === "REMOTE" ? "" : "REMOTE")}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: remoteType === "REMOTE" ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.03)",
            borderColor: remoteType === "REMOTE" ? "rgba(99, 102, 241, 0.5)" : "var(--border-subtle)",
            color: remoteType === "REMOTE" ? "var(--accent-glow)" : "var(--text-secondary)",
          }}
        >
          <span>🌐</span> Remote Only
        </button>

        {/* Full Stack Preset */}
        <button
          type="button"
          onClick={() => {
            const tag = "Full Stack Engineer";
            setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
          }}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: selectedFunctions.includes("Full Stack Engineer") ? "rgba(0, 240, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
            borderColor: selectedFunctions.includes("Full Stack Engineer") ? "rgba(0, 240, 160, 0.45)" : "var(--border-subtle)",
            color: selectedFunctions.includes("Full Stack Engineer") ? "#00f0a0" : "var(--text-secondary)",
          }}
        >
          <span>💻</span> Full Stack
        </button>

        {/* Backend Preset */}
        <button
          type="button"
          onClick={() => {
            const tag = "Backend Engineer";
            setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
          }}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: selectedFunctions.includes("Backend Engineer") ? "rgba(0, 240, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
            borderColor: selectedFunctions.includes("Backend Engineer") ? "rgba(0, 240, 160, 0.45)" : "var(--border-subtle)",
            color: selectedFunctions.includes("Backend Engineer") ? "#00f0a0" : "var(--text-secondary)",
          }}
        >
          <span>⚙️</span> Backend
        </button>

        {/* Frontend Preset */}
        <button
          type="button"
          onClick={() => {
            const tag = "Frontend Software Engineer";
            setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
          }}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: selectedFunctions.includes("Frontend Software Engineer") ? "rgba(0, 240, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
            borderColor: selectedFunctions.includes("Frontend Software Engineer") ? "rgba(0, 240, 160, 0.45)" : "var(--border-subtle)",
            color: selectedFunctions.includes("Frontend Software Engineer") ? "#00f0a0" : "var(--text-secondary)",
          }}
        >
          <span>🎨</span> Frontend
        </button>

        {/* AI & ML Preset */}
        <button
          type="button"
          onClick={() => {
            const tag = "Machine Learning Engineer";
            setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
          }}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: selectedFunctions.includes("Machine Learning Engineer") ? "rgba(0, 240, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
            borderColor: selectedFunctions.includes("Machine Learning Engineer") ? "rgba(0, 240, 160, 0.45)" : "var(--border-subtle)",
            color: selectedFunctions.includes("Machine Learning Engineer") ? "#00f0a0" : "var(--text-secondary)",
          }}
        >
          <span>🤖</span> AI / ML
        </button>

        {/* Data Analyst Preset */}
        <button
          type="button"
          onClick={() => {
            const tag = "Data Analyst";
            setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
          }}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: selectedFunctions.includes("Data Analyst") ? "rgba(0, 240, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
            borderColor: selectedFunctions.includes("Data Analyst") ? "rgba(0, 240, 160, 0.45)" : "var(--border-subtle)",
            color: selectedFunctions.includes("Data Analyst") ? "#00f0a0" : "var(--text-secondary)",
          }}
        >
          <span>📊</span> Data Analyst
        </button>

        {/* Security Preset */}
        <button
          type="button"
          onClick={() => {
            const tag = "Cyber Security Engineer";
            setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
          }}
          className="px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1"
          style={{
            background: selectedFunctions.includes("Cyber Security Engineer") ? "rgba(0, 240, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
            borderColor: selectedFunctions.includes("Cyber Security Engineer") ? "rgba(0, 240, 160, 0.45)" : "var(--border-subtle)",
            color: selectedFunctions.includes("Cyber Security Engineer") ? "#00f0a0" : "var(--text-secondary)",
          }}
        >
          <span>🛡️</span> Cyber Security
        </button>
      </div>

      {/* ── Skills Filter Panel ─────────── */}
      {showFilters && (
        <div
          className="animate-fade-in-up"
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
            borderRadius: 14, padding: 16, marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            <Tag size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />
            Filter by Skills / Tech Stack
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {POPULAR_SKILLS.map((skill) => {
              const active = selectedSkills.has(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  style={{
                    padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                    background: active ? `${getSkillColor(skill)}20` : "transparent",
                    color: active ? getSkillColor(skill) : "var(--text-muted)",
                    borderColor: active ? `${getSkillColor(skill)}40` : "var(--border-subtle)",
                  }}
                >
                  {skill}
                </button>
              );
            })}
          </div>
          {selectedSkills.size > 0 && (
            <button
              onClick={() => setSelectedSkills(new Set())}
              style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Visibility Toggles ──────────── */}
      {(appliedCount > 0 || hiddenCount > 0) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, fontSize: 12 }}>
          {appliedCount > 0 && (
            <button className="btn-secondary" onClick={() => setShowApplied(!showApplied)} style={{ padding: "6px 12px", fontSize: 12 }}>
              {showApplied ? <Eye size={13} /> : <EyeOff size={13} />}
              {showApplied ? "Showing" : "Hidden"}: {appliedSet.size} applied
            </button>
          )}
          {hiddenCount > 0 && (
            <button className="btn-secondary" onClick={() => setShowHidden(!showHidden)} style={{ padding: "6px 12px", fontSize: 12 }}>
              {showHidden ? <Eye size={13} /> : <EyeOff size={13} />}
              {showHidden ? "Showing" : "Hidden"}: {hiddenSet.size} not suitable
            </button>
          )}
        </div>
      )}

      {/* ── Job Grid ───────────────────── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="animate-fade-in-up" style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-card)", borderRadius: 16, border: "1px solid rgba(248,113,113,0.2)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <X size={24} style={{ color: "var(--danger)" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>{error}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>Check that the backend is running and try again</p>
          <button className="btn-primary" onClick={() => fetchJobs(page)} style={{ marginTop: 16 }}>
            Retry
          </button>
        </div>
      ) : visibleJobs.length === 0 ? (
        <div className="animate-fade-in-up" style={{ textAlign: "center", padding: "70px 20px", background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)", maxWidth: 580, margin: "0 auto" }}>
          <Briefcase size={44} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
            {source ? `No active jobs from ${source} yet` : "No jobs found"}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
            {source
              ? `We currently aggregate 14,000+ live jobs from Jobright, Greenhouse, Ashby, Lever, and Workday. You can also import any company career board URL directly.`
              : "Try adjusting your search keywords, location, or clearing applied/hidden filters."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {source && (
              <button
                className="btn-primary"
                onClick={() => setSource("")}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                Show All Sources
              </button>
            )}
            <a
              href="/import"
              className="btn-secondary"
              style={{ padding: "8px 16px", fontSize: 13, textDecoration: "none" }}
            >
              Import Company Board
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {displayedJobs.map((job) => {
              const freshness = freshnessColor(job.posted_at || job.created_at);
              const isSaved = savedSet.has(job.id);
              const isApplied = appliedSet.has(job.id);
              const isHidden = hiddenSet.has(job.id);

              return (
                <div
                  key={job.id}
                  className="glass-card job-card"
                  style={{ padding: 22, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative" }}
                  onClick={() => openJobModal(job)}
                >
                  {/* Freshness dot */}
                  <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 5 }}>
                    {isApplied && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--success)", background: "var(--success-soft)", padding: "2px 8px", borderRadius: 999 }}>Applied</span>}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: freshness.dot }} title={freshness.label} />
                  </div>

                  {/* Title + source */}
                  <div style={{ paddingRight: 60, marginBottom: 10 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.01em", margin: 0 }}>
                      {job.title}
                    </h3>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Building2 size={14} style={{ color: "var(--accent-glow)" }} /> {job.company_name}
                    </span>
                    {job.location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={14} style={{ color: "var(--text-muted)" }} />
                        {job.location.length > 30 ? job.location.slice(0, 30) + "…" : job.location}
                      </span>
                    )}
                  </div>

                  {/* Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    <span className={sourceBadgeClass(job.source)}>{job.source}</span>
                    {job.remote_type && job.remote_type !== "UNKNOWN" && (
                      <span className={remoteBadgeClass(job.remote_type)}>{job.remote_type}</span>
                    )}
                  </div>

                  {/* Skills pills */}
                  {job.skills && job.skills.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {job.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          style={{
                            padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                            background: `${getSkillColor(skill)}15`, color: getSkillColor(skill),
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 5 && (
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, color: "var(--text-muted)" }}>
                          +{job.skills.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Salary */}
                  {(job.salary_min || job.salary_max) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--salary)", marginBottom: 4 }}>
                      <DollarSign size={13} />
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {timeAgo(job.posted_at || job.created_at)}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleApplied(job.id); }}
                        style={{
                          background: isApplied ? "var(--success-soft)" : "rgba(255,255,255,0.04)",
                          color: isApplied ? "var(--success)" : "var(--text-muted)",
                          border: `1px solid ${isApplied ? "rgba(52,211,153,0.3)" : "var(--border-subtle)"}`,
                          padding: "4px 8px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          transition: "all 0.15s",
                        }}
                        title={isApplied ? "Marked as Applied" : "Mark as Applied"}
                      >
                        <CheckCircle2 size={13} />
                        {isApplied ? "Applied" : "Apply"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSaved(job.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: isSaved ? "var(--warning)" : "var(--text-muted)", padding: 4, transition: "color 0.15s" }}
                        title={isSaved ? "Unsave" : "Save for later"}
                      >
                        {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openJobModal(job); }}
                        className="btn-primary"
                        style={{ padding: "5px 12px", fontSize: 11 }}
                      >
                        Details <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ─────────────────── */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 32, fontSize: 13, color: "var(--text-secondary)" }}>
              <button className="btn-secondary" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} style={{ padding: "8px 14px" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                Page <strong style={{ color: "var(--text-primary)" }}>{page}</strong> of <strong style={{ color: "var(--text-primary)" }}>{totalPages}</strong>
              </span>
              <button className="btn-secondary" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} style={{ padding: "8px 14px" }}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Job Modal ──────────────────── */}
      {selectedJob && fullJobData && (
        <JobModal
          job={fullJobData}
          onClose={() => { setSelectedJob(null); setFullJobData(null); }}
          appliedSet={appliedSet}
          hiddenSet={hiddenSet}
          savedSet={savedSet}
          onToggleApplied={toggleApplied}
          onToggleHidden={toggleHidden}
          onToggleSaved={toggleSaved}
        />
      )}
    </div>
  );
}
