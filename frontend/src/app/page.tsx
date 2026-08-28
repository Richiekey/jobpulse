"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import LocationFilterPopover, { LocationFilterState } from "@/components/LocationFilterPopover";
import JobFunctionFilterPopover from "@/components/JobFunctionFilterPopover";
import DatePostedFilterPopover from "@/components/DatePostedFilterPopover";
import CustomDropdown from "@/components/CustomDropdown";
import CvGeneratorModal from "@/components/CvGeneratorModal";
import CoverLetterModal from "@/components/CoverLetterModal";
import JobQaModal from "@/components/JobQaModal";
import ScreenshotProofModal from "@/components/ScreenshotProofModal";
import { identifyAtsPlatform, resolveDirectApplyUrl, ALL_ATS_PLATFORMS, getPlatformMeta } from "@/lib/jobUrls";
import { ResumeData } from "@/lib/pdfGenerator";
import { estimateJobSalary } from "@/lib/salaryEstimator";
import {
  Search, Download, Briefcase, MapPin, Building2, ExternalLink,
  Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, DollarSign, Clock, X,
  Bookmark, BookmarkCheck, CheckCircle2, ThumbsDown, Eye, EyeOff,
  Filter, Tag, Sparkles, RotateCcw, Globe, Mail, MessageSquare, Camera,
  Code, Server, Monitor, BrainCircuit, LineChart, ShieldAlert, AlertCircle,
  Wifi, Database, Share2, Check, Zap, CheckSquare, Square
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
  apply_url_original?: string;
  is_staffing_agency?: boolean;
  source: string;
  posted_at?: string;
  created_at?: string;
  skills?: string[];
  role_category?: string;
}

const API_BASE = "/api";

// ── Skill color mapping ────────────────────────────────────────
const SKILL_COLORS: Record<string, string> = {
  Python: "#38bdf8", JavaScript: "#facc15", TypeScript: "#60a5fa",
  React: "#38bdf8", "Next.js": "#e2e8f0", Go: "#38bdf8", Rust: "#f97316",
  Java: "#fb923c", "C++": "#3b82f6", "C#": "#a855f7", ".NET": "#8b5cf6",
  SQL: "#38bdf8", Docker: "#0ea5e9", Kubernetes: "#6366f1", AWS: "#f59e0b",
  GCP: "#38bdf8", Azure: "#0284c7", PostgreSQL: "#38bdf8", MongoDB: "#22c55e",
  Redis: "#ef4444", GraphQL: "#ec4899", Terraform: "#a855f7", Git: "#f97316",
  Linux: "#eab308", Kafka: "#cbd5e1", Spark: "#f97316", Swift: "#f97316",
  Kotlin: "#a855f7", Flutter: "#38bdf8", "React Native": "#38bdf8",
  "Node.js": "#22c55e", Ruby: "#ef4444", PHP: "#818cf8", Vue: "#4ade80",
  Angular: "#ef4444", Tailwind: "#38bdf8", "Machine Learning": "#c084fc",
  AI: "#c084fc", LLM: "#c084fc", PyTorch: "#f97316", TensorFlow: "#f59e0b",
};

function getSkillColor(skill: string): string {
  // Case-insensitive / normalized lookup
  const exact = SKILL_COLORS[skill];
  if (exact) return exact;
  const lower = skill.toLowerCase();
  for (const [k, v] of Object.entries(SKILL_COLORS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return "#818cf8"; // default modern indigo/violet
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

function formatPostingDate(dateStr?: string): string {
  if (!dateStr) return "Recent";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function getPaginationItems(current: number, total: number): (number | 'ellipsis-left' | 'ellipsis-right')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis-left', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis-left', current - 1, current, current + 1, 'ellipsis-right', total];
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
  if (s === "bamboohr") return "badge badge-bamboohr";
  if (s === "smartrecruiters") return "badge badge-smartrecruiters";
  if (s === "recruitee") return "badge badge-recruitee";
  if (s === "teamtailor") return "badge badge-teamtailor";
  if (s === "rippling") return "badge badge-rippling";
  if (s === "personio") return "badge badge-personio";
  if (s === "pinpoint") return "badge badge-pinpoint";
  if (s === "recruiterflow") return "badge badge-recruiterflow";
  if (s === "cats") return "badge badge-cats";
  if (s === "bullhorn") return "badge badge-bullhorn";
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
  onOpenCv, onOpenCoverLetter, onOpenQa, onOpenProof,
  onShowToast,
}: {
  job: Job;
  onClose: () => void;
  appliedSet: Set<string>;
  hiddenSet: Set<string>;
  savedSet: Set<string>;
  onToggleApplied: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onOpenCv?: (job: Job) => void;
  onOpenCoverLetter?: (job: Job) => void;
  onOpenQa?: (job: Job) => void;
  onOpenProof?: (job: Job) => void;
  onShowToast?: (msg: string, type?: "success" | "info" | "warning") => void;
}) {
  const isApplied = appliedSet.has(job.id);
  const isHidden = hiddenSet.has(job.id);
  const isSaved = savedSet.has(job.id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Auto-resolve direct ATS URL for Jobright jobs ──
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [companyUrl, setCompanyUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const applyUrl = job.apply_url || job.job_url || "";
    if (job.source === "JOBRIGHT" && applyUrl.includes("jobright.ai")) {
      setResolving(true);
      fetch("/api/jobs/resolve-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, jobrightUrl: applyUrl }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.directUrl && !data.directUrl.includes("jobright.ai")) {
            setResolvedUrl(data.directUrl);
          }
          if (data.companyUrl) {
            setCompanyUrl(data.companyUrl);
          }
        })
        .catch(() => {})
        .finally(() => setResolving(false));
    }
    return () => { setResolvedUrl(null); setCompanyUrl(null); setResolving(false); };
  }, [job.id, job.source, job.apply_url, job.job_url]);

  const freshness = freshnessColor(job.posted_at || job.created_at);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111114", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, width: "100%", maxWidth: 780,
          maxHeight: "85vh", overflow: "auto",
          animation: "fadeInUp 0.25s ease-out",
          boxShadow: "0 32px 80px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.3 }}>
              {job.title}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10, fontSize: 14, color: "var(--text-secondary)" }}>
              <Link
                href={`/companies/${encodeURIComponent(job.company_name)}`}
                style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent-glow)", textDecoration: "none", fontWeight: 600 }}
              >
                <Building2 size={15} /> {job.company_name}
              </Link>
              {job.location && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={15} style={{ color: "var(--text-muted)" }} /> {job.location}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: freshness.dot }} />
                {formatPostingDate(job.posted_at || job.created_at)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`);
                  onShowToast?.("Job link copied to clipboard! 📋", "success");
                }
              }}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-subtle)", borderRadius: 10,
                padding: "8px 12px", cursor: "pointer", color: "var(--text-secondary)",
                fontSize: 12, display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              title="Share job link"
            >
              <Share2 size={14} /> Share
            </button>
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
        </div>

        {/* Badges row */}
        <div style={{ padding: "12px 28px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span className={sourceBadgeClass(job.source)}>{job.source}</span>
          {job.is_staffing_agency && (
            <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              Staffing Agency
            </span>
          )}
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
        {(job.salary_min || job.salary_max) ? (
          <div style={{ padding: "0 28px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700, color: "var(--salary)" }}>
            <DollarSign size={16} />
            {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
          </div>
        ) : (() => {
          const est = estimateJobSalary(job.title, job.location);
          if (!est) return null;
          return (
            <div style={{ padding: "0 28px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <div className="salary-tag salary-estimated">
                <DollarSign size={12} />
                Est. ${est.min.toLocaleString()} – ${est.max.toLocaleString()}/{est.period}
                <span className="estimate-badge">AI Estimate</span>
              </div>
            </div>
          );
        })()}

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

        {/* AI Action Strip */}
        <div style={{
          margin: "0 28px 16px",
          padding: "12px 16px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%)",
          border: "1px solid rgba(168, 85, 247, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "#c084fc" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
              AI Application Copilot
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {onOpenCv && (
              <button
                type="button"
                onClick={() => onOpenCv(job)}
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)",
                }}
              >
                <Sparkles size={13} />
                Tailor CV (AI)
              </button>
            )}
            {onOpenCoverLetter && (
              <button
                type="button"
                onClick={() => onOpenCoverLetter(job)}
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#d8b4fe",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Mail size={13} />
                Cover Letter
              </button>
            )}
            {onOpenQa && (
              <button
                type="button"
                onClick={() => onOpenQa(job)}
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#93c5fd",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MessageSquare size={13} />
                Q&A Assistant
              </button>
            )}
          </div>
        </div>

        {/* Links Box */}
        {(() => {
          const staticResolved = resolveDirectApplyUrl(job.apply_url || job.job_url, job.description, job.apply_url_original);
          const effectiveUrl = resolvedUrl || job.apply_url_original || (staticResolved && !staticResolved.includes("jobright.ai") ? staticResolved : null);
          const atsInfo = identifyAtsPlatform(effectiveUrl || job.apply_url || job.job_url);
          const isJobright = job.source === "JOBRIGHT" || (job.apply_url || "").includes("jobright.ai");
          const hasDirectUrl = !!effectiveUrl && effectiveUrl !== job.apply_url;

          const primaryApplyUrl = effectiveUrl || job.apply_url || job.job_url;

          return (
            <>
              <div style={{ margin: "0 28px 0", padding: "14px 18px", borderRadius: 12, background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Direct ATS link (resolved or static or apply_url_original) */}
                {hasDirectUrl && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#34d399", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      ✓ Original Apply (Company / {atsInfo.label})
                    </div>
                    <a
                      href={effectiveUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: "var(--accent-glow)", wordBreak: "break-all", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {effectiveUrl} <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Resolving indicator */}
                {resolving && !hasDirectUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--accent-glow)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Resolving direct application link...
                  </div>
                )}

                {/* Fallback: original URL if no direct found */}
                {!hasDirectUrl && !resolving && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>
                      {isJobright ? "Job Application Link (via Jobright)" : `${atsInfo.label} Application Link`}
                    </div>
                    <a
                      href={primaryApplyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: "var(--accent-glow)", wordBreak: "break-all", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {primaryApplyUrl} <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Company Careers Page (fallback from resolver) */}
                {!hasDirectUrl && !resolving && companyUrl && isJobright && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#34d399", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      🏢 Company Careers Page
                    </div>
                    <a
                      href={companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: "#34d399", wordBreak: "break-all", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {companyUrl} <ExternalLink size={12} />
                    </a>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Search for this role on the company&apos;s careers page
                    </div>
                  </div>
                )}

                {/* Show Jobright listing link when we have a direct URL or company URL */}
                {isJobright && (job.job_url || job.apply_url) && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>
                      Jobright Listing
                    </div>
                    <a
                      href={job.job_url || job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: "#fb923c", wordBreak: "break-all", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {job.job_url || job.apply_url} <ExternalLink size={12} />
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

              {/* Actions bar */}
              <div style={{
                padding: "16px 28px", borderTop: "1px solid var(--border-subtle)",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                position: "sticky", bottom: 0, background: "var(--bg-card)",
                borderRadius: "0 0 20px 20px",
              }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <a
                    href={primaryApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ padding: "8px 18px", fontSize: 13, background: hasDirectUrl ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                  >
                    {hasDirectUrl ? `Apply on company site →` : `Apply on ${atsInfo.label} →`}
                  </a>

                  {isJobright && hasDirectUrl && (job.job_url || job.apply_url) && (
                    <a
                      href={job.job_url || job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: "8px 14px", fontSize: 13, borderColor: "rgba(249, 115, 22, 0.4)", color: "#fb923c" }}
                      title="View Jobright listing"
                    >
                      Jobright <ExternalLink size={12} />
                    </a>
                  )}

                  {onOpenProof && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onOpenProof(job)}
                      style={{
                        padding: "8px 14px",
                        fontSize: 13,
                        borderColor: "rgba(16, 185, 129, 0.35)",
                        color: "#34d399",
                      }}
                      title="Upload submission screenshot proof"
                    >
                      <Camera size={14} /> Add Proof / Screenshot
                    </button>
                  )}

                  <button
                    className={isApplied ? "btn-primary" : "btn-secondary"}
                    onClick={() => {
                      onToggleApplied(job.id);
                      onClose();
                    }}
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
                    onClick={() => {
                      onToggleHidden(job.id);
                      onClose();
                    }}
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
            </>
          );
        })()}
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
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [locationState, setLocationState] = useState<LocationFilterState>({
    country: "ALL",
    allLocationsInCountry: true,
    cityOrState: "",
  });
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [datePosted, setDatePosted] = useState("");
  const [remoteType, setRemoteType] = useState("");
  const [source, setSource] = useState("");
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // In-flight request controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch source counts on mount
  useEffect(() => {
    fetch("/api/jobs/source-counts")
      .then((r) => r.json())
      .then((data) => { if (data.counts) setSourceCounts(data.counts); })
      .catch(() => {});
  }, []);

  // Debounce searchInput into query (350ms)
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query) return; // no-op guard
    const timer = setTimeout(() => {
      setQuery(trimmed);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Job modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [fullJobData, setFullJobData] = useState<Job | null>(null);

  // AI Copilot & Proof Modals
  const [cvModalJob, setCvModalJob] = useState<Job | null>(null);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [activeTailoredResume, setActiveTailoredResume] = useState<ResumeData | null>(null);
  const [qaModalJob, setQaModalJob] = useState<Job | null>(null);
  const [proofModalJob, setProofModalJob] = useState<Job | null>(null);

  // Auth context for Google Sheets sync & user tracking
  const { user, profile, syncAppliedJobToSheet } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const [appliedSet, setAppliedSet] = useState<Set<string>>(() => getStoredSet("jp_applied"));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => getStoredSet("jp_hidden"));
  const [savedSet, setSavedSet] = useState<Set<string>>(() => getStoredSet("jp_saved"));
  const [uploadingJobIds, setUploadingJobIds] = useState<Set<string>>(new Set());
  const [showApplied, setShowApplied] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Keyboard Navigation & Bulk Apply Mode ──
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

  // ── Sync tracking sets on focus or storage change ──
  useEffect(() => {
    const syncTrackingSets = () => {
      setAppliedSet(getStoredSet("jp_applied"));
      setHiddenSet(getStoredSet("jp_hidden"));
      setSavedSet(getStoredSet("jp_saved"));
      jobsMemoryCache.clear();
    };

    window.addEventListener("focus", syncTrackingSets);
    window.addEventListener("jp_storage_update", syncTrackingSets);
    return () => {
      window.removeEventListener("focus", syncTrackingSets);
      window.removeEventListener("jp_storage_update", syncTrackingSets);
    };
  }, []);

  // Refs for tracking sets — used inside fetchJobs to avoid adding sets to deps
  const appliedSetRef = useRef(appliedSet);
  const hiddenSetRef = useRef(hiddenSet);
  const showAppliedRef = useRef(showApplied);
  const showHiddenRef = useRef(showHidden);
  useEffect(() => { appliedSetRef.current = appliedSet; }, [appliedSet]);
  useEffect(() => { hiddenSetRef.current = hiddenSet; }, [hiddenSet]);
  useEffect(() => { showAppliedRef.current = showApplied; }, [showApplied]);
  useEffect(() => { showHiddenRef.current = showHidden; }, [showHidden]);

  const toggleApplied = async (id: string) => {
    const isNowApplied = !appliedSet.has(id);

    if (!isNowApplied) {
      // Unmark applied
      setAppliedSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveStoredSet("jp_applied", next);
        return next;
      });
      setHiddenSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveStoredSet("jp_hidden", next);
        return next;
      });
      showToast("Unmarked application", "info");
      return;
    }

    // Set uploading state for visible spinner feedback
    setUploadingJobIds((prev) => new Set(prev).add(id));

    // If marked as applied and user is logged in, auto-sync to Google Sheet & cloud applications
    try {
      const targetJob = jobs.find((j) => j.id === id) || (fullJobData?.id === id ? fullJobData : selectedJob);
      if (targetJob && syncAppliedJobToSheet) {
        const result = await syncAppliedJobToSheet({
          id: targetJob.id,
          company_name: targetJob.company_name,
          title: targetJob.title,
          location: targetJob.location,
          job_url: targetJob.job_url,
          apply_url: targetJob.apply_url,
          salary: targetJob.salary_min ? `${targetJob.salary_min}-${targetJob.salary_max} ${targetJob.salary_currency || "USD"}` : "",
          source: targetJob.source,
        });

        // Add to appliedSet
        setAppliedSet((prev) => {
          const next = new Set(prev);
          next.add(id);
          saveStoredSet("jp_applied", next);
          return next;
        });

        // Automatically hide the card from the active feed
        setHiddenSet((prev) => {
          const next = new Set(prev);
          next.add(id);
          saveStoredSet("jp_hidden", next);
          return next;
        });

        if (result.success) {
          showToast(`Applied & synced to Google Sheets! 📊`, "success");
        } else if (!user) {
          showToast(`Marked as applied. Sign in on /profile to auto-sync to Google Sheet.`, "info");
        } else if (!profile?.google_sheet_webhook && typeof window !== "undefined" && !localStorage.getItem("jp_gsheet_webhook")) {
          showToast(`Marked as applied. Add Google Sheet in Profile to auto-sync.`, "info");
        } else {
          showToast(`Marked as applied (${result.message})`, "warning");
        }
      } else {
        setAppliedSet((prev) => {
          const next = new Set(prev);
          next.add(id);
          saveStoredSet("jp_applied", next);
          return next;
        });
        setHiddenSet((prev) => {
          const next = new Set(prev);
          next.add(id);
          saveStoredSet("jp_hidden", next);
          return next;
        });
        showToast("Marked as applied ✓", "success");
      }
    } finally {
      setUploadingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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

  const fetchJobs = useCallback(async (p: number) => {
    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build exclusion list from refs (not state — avoids dep array churn)
    const excludeIds: string[] = [];
    if (!showAppliedRef.current) appliedSetRef.current.forEach(id => excludeIds.push(id));
    if (!showHiddenRef.current) hiddenSetRef.current.forEach(id => excludeIds.push(id));

    const cacheKey = `${p}_${query}_${locationState.country}_${locationState.cityOrState}_${selectedFunctions.sort().join(",")}_${datePosted}_${remoteType}_${source}_${[...selectedSkills].sort().join(",")}_ex${excludeIds.length}`;
    const cached = jobsMemoryCache.get(cacheKey);
    const isCacheValid = cached && (cached.items?.length > 0) && (Date.now() - cached.timestamp < 60000); // 60s cache

    // If valid in cache with jobs, render immediately (0ms latency)
    if (cached && cached.items && cached.items.length > 0) {
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
      params.set("per_page", String(PAGE_SIZE));
      if (query) params.set("q", query);
      if (locationState.country) params.set("country", locationState.country);
      if (locationState.cityOrState) params.set("location", locationState.cityOrState);
      if (selectedFunctions.length > 0) params.set("functions", selectedFunctions.join(","));
      if (datePosted) params.set("date_posted", datePosted);
      if (remoteType) params.set("remote_type", remoteType);
      if (source) params.set("source", source);
      if (selectedSkills.size > 0) params.set("skills", [...selectedSkills].join(","));

      const timeoutId = setTimeout(() => controller.abort(), 12000);
      // Use POST when we have excluded IDs to avoid URL length limits
      const fetchOptions: RequestInit = { signal: controller.signal };
      if (excludeIds.length > 0) {
        fetchOptions.method = 'POST';
        fetchOptions.headers = { 'Content-Type': 'application/json' };
        fetchOptions.body = JSON.stringify({ excludeIds });
      }
      const res = await fetch(`${API_BASE}/jobs?${params.toString()}`, fetchOptions);
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const tot = data.total || 0;

        if (items.length > 0) {
          jobsMemoryCache.set(cacheKey, { items, total: tot, timestamp: Date.now() });
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, locationState, selectedFunctions, datePosted, remoteType, source, selectedSkills]);

  // Single effect: when filters change, reset to page 1 and fetch
  useEffect(() => { setPage(1); fetchJobs(1); }, [fetchJobs]);

  // Re-fetch when user authentication resolves
  useEffect(() => {
    if (user) {
      jobsMemoryCache.clear();
      fetchJobs(1);
    }
  }, [user, fetchJobs]);

  const handleSearch = () => {
    // Immediately commit the search input and let the effect handle the fetch
    setQuery(searchInput.trim());
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    fetchJobs(newPage);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  };

  // Filter out applied/hidden jobs (server already interleaves companies)
  const displayedJobs = jobs.filter((job) => {
    if (!showApplied && appliedSet.has(job.id)) return false;
    if (!showHidden && hiddenSet.has(job.id)) return false;
    return true;
  });

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

  // ── Keyboard Navigation (j/k/Enter/s/Escape) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl as HTMLElement).isContentEditable);
      if (isInputActive || selectedJob || cvModalJob || coverLetterJob || qaModalJob || proofModalJob) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, displayedJobs.length - 1);
          if (next >= 0 && displayedJobs[next]) {
            const target = document.getElementById(`job-card-${displayedJobs[next].id}`);
            target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          return next;
        });
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          if (next >= 0 && displayedJobs[next]) {
            const target = document.getElementById(`job-card-${displayedJobs[next].id}`);
            target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          return next;
        });
      } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < displayedJobs.length) {
        e.preventDefault();
        openJobModal(displayedJobs[focusedIndex]);
      } else if (e.key === "s" && focusedIndex >= 0 && focusedIndex < displayedJobs.length) {
        e.preventDefault();
        toggleSaved(displayedJobs[focusedIndex].id);
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
        if (bulkMode) setBulkMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayedJobs, focusedIndex, selectedJob, cvModalJob, coverLetterJob, qaModalJob, proofModalJob, bulkMode]);

  // ── Bulk Selection & Apply Handler ──
  const toggleBulkSelect = (id: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    if (bulkSelectedIds.size === displayedJobs.length) {
      setBulkSelectedIds(new Set());
    } else {
      setBulkSelectedIds(new Set(displayedJobs.map((j) => j.id)));
    }
  };

  const handleBulkApplyAll = () => {
    if (bulkSelectedIds.size === 0) return;
    const selectedList = displayedJobs.filter((j) => bulkSelectedIds.has(j.id));
    const toOpen = selectedList.slice(0, 10);

    showToast(`Opening ${toOpen.length} job application tabs... 🚀`, "info");

    toOpen.forEach((j, idx) => {
      setTimeout(() => {
        const url = resolveDirectApplyUrl(j.apply_url || j.job_url, j.description, j.apply_url_original) || j.apply_url || j.job_url;
        window.open(url, "_blank", "noopener,noreferrer");
      }, idx * 350);
    });

    setBulkSelectedIds(new Set());
    setBulkMode(false);
  };

  const appliedCount = jobs.filter((j) => appliedSet.has(j.id)).length;
  const hiddenCount = jobs.filter((j) => hiddenSet.has(j.id)).length;

  return (
    <div>
      {/* ── Hero Header ────────────────── */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, lineHeight: 1.1 }}>
              Discover Jobs
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                {total.toLocaleString()}
              </span>{" "}
              curated positions across ATS platforms
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Link
              href="/saved"
              className="btn-ghost"
              style={{
                color: savedSet.size > 0 ? "var(--accent-glow)" : "var(--text-muted)",
              }}
            >
              <Bookmark size={14} /> Saved {savedSet.size > 0 && <span style={{ background: "var(--accent-soft)", color: "var(--accent-glow)", borderRadius: 999, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{savedSet.size}</span>}
            </Link>
            <button className="btn-ghost" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> Filters {selectedSkills.size > 0 && <span style={{ background: "var(--accent-soft)", color: "var(--accent-glow)", borderRadius: 999, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{selectedSkills.size}</span>}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setBulkMode(!bulkMode);
                if (bulkMode) setBulkSelectedIds(new Set());
              }}
              style={{
                color: bulkMode ? "#a5b4fc" : "var(--text-muted)",
                background: bulkMode ? "rgba(99, 102, 241, 0.12)" : undefined,
                borderColor: bulkMode ? "rgba(99, 102, 241, 0.3)" : undefined,
              }}
              title="Toggle multi-select bulk apply mode"
            >
              <Zap size={14} style={{ color: bulkMode ? "#a5b4fc" : undefined }} /> Bulk Apply
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const params = new URLSearchParams();
                if (query) params.set("q", query);
                if (locationState.country) params.set("country", locationState.country);
                if (locationState.cityOrState) params.set("location", locationState.cityOrState);
                if (selectedFunctions.length > 0) params.set("functions", selectedFunctions.join(","));
                if (remoteType) params.set("remote_type", remoteType);
                if (source) params.set("source", source);
                window.open(`${API_BASE}/export/csv?${params.toString()}`, "_blank");
              }}
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ─────────────────── */}
      <div
        className="search-bar animate-fade-in-up"
        style={{ animationDelay: "60ms", marginBottom: 16, position: "relative", zIndex: 100 }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Search keywords, job titles, companies..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="input-field h-11 text-xs"
            style={{
              paddingLeft: 38,
              paddingRight: searchInput ? 36 : 14,
              background: "rgba(255, 255, 255, 0.04)",
              borderColor: "transparent",
              borderRadius: 12,
              color: "#f4f4f5",
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setQuery(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 p-1 rounded-md cursor-pointer transition-colors"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Location Filter Popover */}
        <LocationFilterPopover
          value={locationState}
          onChange={(newLoc) => setLocationState(newLoc)}
        />

        {/* Job Function Multi-select Popover */}
        <JobFunctionFilterPopover
          selectedFunctions={selectedFunctions}
          onChange={(fns) => setSelectedFunctions(fns)}
        />

        {/* Date Posted Popover */}
        <DatePostedFilterPopover
          value={datePosted}
          onChange={(val) => setDatePosted(val)}
        />

        {/* Work Type Dropdown */}
        <CustomDropdown
          value={remoteType}
          onChange={(val) => setRemoteType(val)}
          placeholder="Work Type"
          icon={Wifi}
          options={[
            { value: "", label: "All Work Types" },
            { value: "REMOTE", label: "Remote" },
            { value: "HYBRID", label: "Hybrid" },
            { value: "ONSITE", label: "On-site" },
          ]}
        />

        {/* Job Source Dropdown */}
        <CustomDropdown
          value={source}
          onChange={(val) => setSource(val)}
          placeholder="Job Source"
          icon={Database}
          options={[
            { value: "", label: `All Sources (${total > 0 && !source ? total.toLocaleString() : Object.values(sourceCounts).reduce((a, b) => a + b, 0).toLocaleString() || "..."})` },
            ...ALL_ATS_PLATFORMS.map((p) => {
              const count = sourceCounts[p.id] || 0;
              return {
                value: p.id,
                label: `${p.label} (${count.toLocaleString()})`,
                count,
              };
            })
            .sort((a, b) => b.count - a.count),
          ]}
        />



        {/* Reset Filters */}
        {(searchInput || query || locationState.cityOrState || locationState.country !== "ALL" || selectedFunctions.length > 0 || datePosted || remoteType || source || selectedSkills.size > 0) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setQuery("");
              setLocationState({ country: "ALL", allLocationsInCountry: true, cityOrState: "" });
              setSelectedFunctions([]);
              setDatePosted("");
              setRemoteType("");
              setSource("");
              setSelectedSkills(new Set());
            }}
            style={{
              height: 44,
              padding: '0 14px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              background: 'transparent',
              color: '#71717a',
              transition: 'all 0.15s ease',
            }}
            title="Clear all filters"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ── Quick Filter Presets Row ─────────────────── */}
      {(() => {
        const pillStyle = (active: boolean) => ({
          height: 32,
          padding: "0 14px",
          borderRadius: 99,
          fontSize: 12,
          fontWeight: 500 as const,
          whiteSpace: "nowrap" as const,
          cursor: "pointer" as const,
          border: "1px solid",
          display: "inline-flex",
          alignItems: "center" as const,
          gap: 6,
          transition: "all 0.15s ease",
          fontFamily: "inherit",
          background: active ? "rgba(99, 102, 241, 0.1)" : "rgba(255,255,255,0.03)",
          borderColor: active ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.06)",
          color: active ? "#c7d2fe" : "#a1a1aa",
        });
        const iconColor = (active: boolean) => ({ color: active ? "#a5b4fc" : "#52525b" });

        const toggleFn = (tag: string) => {
          setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter(f => f !== tag) : [...selectedFunctions, tag]);
        };

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", paddingLeft: 2, marginRight: 2 }}>
              Quick
            </span>

            <button type="button" onClick={() => setRemoteType(remoteType === "REMOTE" ? "" : "REMOTE")} style={pillStyle(remoteType === "REMOTE")}>
              <Globe size={13} style={iconColor(remoteType === "REMOTE")} />
              Remote Only
            </button>

            <button type="button" onClick={() => toggleFn("Full Stack Engineer")} style={pillStyle(selectedFunctions.includes("Full Stack Engineer"))}>
              <Code size={13} style={iconColor(selectedFunctions.includes("Full Stack Engineer"))} />
              Full Stack
            </button>

            <button type="button" onClick={() => toggleFn("Backend Engineer")} style={pillStyle(selectedFunctions.includes("Backend Engineer"))}>
              <Server size={13} style={iconColor(selectedFunctions.includes("Backend Engineer"))} />
              Backend
            </button>

            <button type="button" onClick={() => toggleFn("Frontend Software Engineer")} style={pillStyle(selectedFunctions.includes("Frontend Software Engineer"))}>
              <Monitor size={13} style={iconColor(selectedFunctions.includes("Frontend Software Engineer"))} />
              Frontend
            </button>

            {(() => {
              const isAiMlActive = selectedFunctions.includes("Machine Learning Engineer") || selectedFunctions.includes("AI Engineer");
              const toggleAiMl = () => {
                if (isAiMlActive) {
                  setSelectedFunctions(selectedFunctions.filter(f => f !== "Machine Learning Engineer" && f !== "AI Engineer"));
                } else {
                  setSelectedFunctions([...selectedFunctions.filter(f => f !== "Machine Learning Engineer" && f !== "AI Engineer"), "Machine Learning Engineer", "AI Engineer"]);
                }
              };
              return (
                <button type="button" onClick={toggleAiMl} style={pillStyle(isAiMlActive)}>
                  <BrainCircuit size={13} style={iconColor(isAiMlActive)} />
                  AI / ML
                </button>
              );
            })()}

            <button type="button" onClick={() => toggleFn("Data Analyst")} style={pillStyle(selectedFunctions.includes("Data Analyst"))}>
              <LineChart size={13} style={iconColor(selectedFunctions.includes("Data Analyst"))} />
              Data Analyst
            </button>

            <button type="button" onClick={() => toggleFn("Cyber Security Engineer")} style={pillStyle(selectedFunctions.includes("Cyber Security Engineer"))}>
              <ShieldAlert size={13} style={iconColor(selectedFunctions.includes("Cyber Security Engineer"))} />
              Cyber Security
            </button>
          </div>
        );
      })()}

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
      ) : displayedJobs.length === 0 ? (
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
            {displayedJobs.map((job, index) => {
              const freshness = freshnessColor(job.posted_at || job.created_at);
              const isSaved = savedSet.has(job.id);
              const isApplied = appliedSet.has(job.id);
              const isHidden = hiddenSet.has(job.id);
              const isUploading = uploadingJobIds.has(job.id);
              const isBulkSelected = bulkSelectedIds.has(job.id);
              const isFocused = focusedIndex === index;
              const salaryEst = (!job.salary_min && !job.salary_max) ? estimateJobSalary(job.title, job.location) : null;

              return (
                <div
                  key={job.id}
                  id={`job-card-${job.id}`}
                  className={`job-card ${isFocused ? "focused-job" : ""}`}
                  style={{
                    display: "flex", flexDirection: "column", cursor: "pointer",
                    border: isBulkSelected ? "1px solid #818cf8" : undefined,
                    background: isBulkSelected ? "rgba(99, 102, 241, 0.06)" : undefined,
                  }}
                  onClick={() => {
                    if (bulkMode) {
                      toggleBulkSelect(job.id);
                    } else {
                      setFocusedIndex(index);
                      openJobModal(job);
                    }
                  }}
                >
                  {/* Card Body */}
                  <div className="job-card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Top row: checkboxes / badges + freshness */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        {bulkMode && (
                          <span
                            onClick={(e) => { e.stopPropagation(); toggleBulkSelect(job.id); }}
                            style={{
                              display: "inline-flex", alignItems: "center",
                              color: isBulkSelected ? "#818cf8" : "var(--text-muted)",
                              cursor: "pointer",
                            }}
                          >
                            {isBulkSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </span>
                        )}
                        <span className={sourceBadgeClass(job.source)}>{job.source.toLowerCase()}</span>
                        {job.remote_type && job.remote_type !== "UNKNOWN" && (
                          <span className={remoteBadgeClass(job.remote_type)}>{job.remote_type.toLowerCase()}</span>
                        )}
                        {isApplied && <span className="badge" style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>applied</span>}
                      </div>
                      <span
                        className={`freshness-dot ${freshness.label === 'New' ? 'freshness-new' : freshness.label === 'Recent' ? 'freshness-recent' : 'freshness-aging'}`}
                        title={`${freshness.label} — Posted ${formatPostingDate(job.posted_at || job.created_at)}`}
                      />
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.01em", margin: "0 0 8px", color: "var(--text-primary)" }}>
                      {job.title}
                    </h3>

                    {/* Company + Location */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                      <Link
                        href={`/companies/${encodeURIComponent(job.company_name)}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-glow)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                        title={`View all jobs at ${job.company_name}`}
                      >
                        <Building2 size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} /> {job.company_name}
                      </Link>
                      {job.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                          <MapPin size={13} style={{ flexShrink: 0 }} />
                          {job.location.length > 28 ? job.location.slice(0, 28) + "…" : job.location}
                        </span>
                      )}
                    </div>

                    {/* Salary (Actual or AI Estimated) */}
                    {(job.salary_min || job.salary_max) ? (
                      <div className="salary-tag" style={{ marginBottom: 10, alignSelf: "flex-start" }}>
                        <DollarSign size={12} />
                        {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
                      </div>
                    ) : salaryEst ? (
                      <div className="salary-tag salary-estimated" style={{ marginBottom: 10, alignSelf: "flex-start" }}>
                        <DollarSign size={11} />
                        Est. ${salaryEst.min >= 1000 ? `${salaryEst.min / 1000}k` : salaryEst.min} – ${salaryEst.max >= 1000 ? `${salaryEst.max / 1000}k` : salaryEst.max}/{salaryEst.period === "yearly" ? "yr" : "hr"}
                        <span className="estimate-badge">AI</span>
                      </div>
                    ) : null}

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto", paddingTop: 4 }}>
                        {job.skills.slice(0, 4).map((skill) => {
                          const col = getSkillColor(skill);
                          return (
                            <span
                              key={skill}
                              style={{
                                padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                                background: `${col}18`, color: col,
                                border: `1px solid ${col}35`,
                              }}
                            >
                              {skill}
                            </span>
                          );
                        })}
                        {job.skills.length > 4 && (
                          <span style={{ padding: "2px 6px", fontSize: 10, color: "var(--text-dimmed)" }}>
                            +{job.skills.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="job-card-footer">
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, fontVariantNumeric: "tabular-nums" }}>
                      <Clock size={11} /> {formatPostingDate(job.posted_at || job.created_at)}
                    </span>
                    <div className="job-card-actions" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`);
                            showToast("Job link copied! 📋", "success");
                          }
                        }}
                        className="btn-ghost"
                        style={{ color: "var(--text-muted)", padding: "4px 6px" }}
                        title="Copy direct share link"
                      >
                        <Share2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCvModalJob(job); }}
                        className="btn-ghost"
                        style={{ color: "#a78bfa", fontSize: 11, padding: "4px 8px" }}
                        title="AI Tailor CV"
                      >
                        <Sparkles size={12} /> Tailor
                      </button>
                      {(() => {
                        const cardApplyUrl = resolveDirectApplyUrl(job.apply_url || job.job_url, job.description, job.apply_url_original) || job.apply_url || job.job_url || "#";
                        return (
                          <a
                            href={cardApplyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn-ghost"
                            style={{
                              color: "var(--text-muted)",
                              fontSize: 11,
                              padding: "4px 8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              textDecoration: "none",
                              transition: "color 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--accent-glow)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                            title="Open job application link in new tab"
                          >
                            <ExternalLink size={12} /> Apply
                          </a>
                        );
                      })()}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSaved(job.id); }}
                        className="btn-ghost"
                        style={{ color: isSaved ? "var(--warning)" : "var(--text-muted)", padding: "4px 6px" }}
                        title={isSaved ? "Unsave" : "Save"}
                      >
                        {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openJobModal(job); }}
                        className="btn-primary"
                        style={{ padding: "5px 12px", fontSize: 11, borderRadius: "var(--radius-sm)" }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Bulk Selection Floating Dock ─────────────────── */}
          {bulkMode && (
            <div className="bulk-floating-dock">
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                <Zap size={16} style={{ color: "#a5b4fc" }} />
                <span>{bulkSelectedIds.size} Selected</span>
              </div>

              <div style={{ height: 16, width: 1, background: "rgba(255,255,255,0.15)" }} />

              <button
                type="button"
                onClick={handleSelectAllOnPage}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999, padding: "5px 12px", color: "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {bulkSelectedIds.size === displayedJobs.length ? "Deselect All" : "Select All"}
              </button>

              <button
                type="button"
                onClick={handleBulkApplyAll}
                disabled={bulkSelectedIds.size === 0}
                className="btn-primary"
                style={{
                  padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  opacity: bulkSelectedIds.size === 0 ? 0.5 : 1,
                  cursor: bulkSelectedIds.size === 0 ? "not-allowed" : "pointer",
                }}
              >
                Open Tabs ({Math.min(bulkSelectedIds.size, 10)})
              </button>

              <button
                type="button"
                onClick={() => { setBulkMode(false); setBulkSelectedIds(new Set()); }}
                style={{
                  background: "transparent", border: "none", color: "var(--text-muted)",
                  fontSize: 12, cursor: "pointer", padding: "4px 8px",
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Sliding Window Numbered Pagination Bar ─────────────── */}
          {totalPages > 1 && (
            <div style={{ marginTop: 40, marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }} className="animate-fade-in-up">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 4, userSelect: "none" }}>
                {/* First Page Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={page <= 1}
                  className="pagination-btn"
                  style={{ paddingLeft: 8, paddingRight: 8 }}
                  title="First page"
                >
                  <ChevronsLeft size={15} />
                </button>

                {/* Previous Page Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="pagination-btn"
                  style={{ paddingLeft: 8, paddingRight: 8 }}
                  title="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Page Numbers & Ellipses */}
                {getPaginationItems(page, totalPages).map((item, idx) => {
                  if (item === 'ellipsis-left') {
                    return (
                      <button
                        key={`ellipsis-left-${idx}`}
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, page - 5))}
                        className="pagination-ellipsis"
                        title="Jump back 5 pages"
                      >
                        ···
                      </button>
                    );
                  }
                  if (item === 'ellipsis-right') {
                    return (
                      <button
                        key={`ellipsis-right-${idx}`}
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPages, page + 5))}
                        className="pagination-ellipsis"
                        title="Jump forward 5 pages"
                      >
                        ···
                      </button>
                    );
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      className={`pagination-btn ${item === page ? 'pagination-active' : ''}`}
                    >
                      {item}
                    </button>
                  );
                })}

                {/* Next Page Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="pagination-btn"
                  style={{ paddingLeft: 8, paddingRight: 8 }}
                  title="Next page"
                >
                  <ChevronRight size={15} />
                </button>

                {/* Last Page Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page >= totalPages}
                  className="pagination-btn"
                  style={{ paddingLeft: 8, paddingRight: 8 }}
                  title="Last page"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-dimmed)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                <span style={{ color: "var(--text-muted)" }}>{page}</span>
                <span style={{ margin: "0 4px" }}>/</span>
                <span style={{ color: "var(--text-muted)" }}>{totalPages}</span>
                {total > 0 && <span style={{ color: "var(--text-dimmed)", marginLeft: 8 }}>· {total.toLocaleString()} jobs</span>}
              </div>
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
          onOpenCv={(j) => setCvModalJob(j)}
          onOpenCoverLetter={(j) => setCoverLetterJob(j)}
          onOpenQa={(j) => setQaModalJob(j)}
          onOpenProof={(j) => setProofModalJob(j)}
          onShowToast={showToast}
        />
      )}

      {/* ── AI CV Generator Modal ──────────────────── */}
      <CvGeneratorModal
        isOpen={!!cvModalJob}
        onClose={() => setCvModalJob(null)}
        job={cvModalJob}
        userProfile={profile}
        onOpenCoverLetter={(j, resData) => {
          setActiveTailoredResume(resData);
          setCvModalJob(null);
          setCoverLetterJob(j);
        }}
        onOpenQaAssistant={(j, resData) => {
          setActiveTailoredResume(resData);
          setCvModalJob(null);
          setQaModalJob(j);
        }}
      />

      {/* ── AI Cover Letter Modal ──────────────────── */}
      <CoverLetterModal
        isOpen={!!coverLetterJob}
        onClose={() => setCoverLetterJob(null)}
        job={coverLetterJob}
        tailoredResume={activeTailoredResume}
        userProfile={profile}
      />

      {/* ── AI Screening Q&A Modal ──────────────────── */}
      <JobQaModal
        isOpen={!!qaModalJob}
        onClose={() => setQaModalJob(null)}
        job={qaModalJob}
        tailoredResume={activeTailoredResume}
        userProfile={profile}
      />

      {/* ── Screenshot & Proof Modal ──────────────────── */}
      <ScreenshotProofModal
        isOpen={!!proofModalJob}
        onClose={() => setProofModalJob(null)}
        job={proofModalJob}
        userProfile={profile}
        onAppliedSuccess={(jobId) => {
          setAppliedSet((prev) => {
            const next = new Set(prev);
            next.add(jobId);
            saveStoredSet("jp_applied", next);
            return next;
          });
          showToast("Proof saved & application logged!", "success");
        }}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium shadow-2xl backdrop-blur-xl animate-fade-in-up"
          style={{
            background: toast.type === "success" ? "rgba(16, 185, 129, 0.15)" : toast.type === "warning" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
            borderColor: toast.type === "success" ? "rgba(16, 185, 129, 0.35)" : toast.type === "warning" ? "rgba(245, 158, 11, 0.35)" : "rgba(59, 130, 246, 0.35)",
            color: toast.type === "success" ? "#34d399" : toast.type === "warning" ? "#fbbf24" : "#60a5fa",
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
