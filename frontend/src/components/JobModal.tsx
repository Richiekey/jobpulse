"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X, Building2, MapPin, DollarSign, Sparkles, Mail, MessageSquare,
  Camera, ExternalLink, CheckCircle2, ThumbsDown, Bookmark, BookmarkCheck,
  Share2, Loader2
} from "lucide-react";
import { Job } from "@/types/job";
import { getSkillColor } from "@/lib/jobPatterns";
import { identifyAtsPlatform, resolveDirectApplyUrl } from "@/lib/jobUrls";
import { estimateJobSalary } from "@/lib/salaryEstimator";
import { toCompanySlug } from "@/lib/slug";
import { sanitizeHtml } from "@/lib/sanitize";

interface JobModalProps {
  job: Job;
  isLoadingFullDetails?: boolean;
  appliedSet: Set<string>;
  hiddenSet: Set<string>;
  savedSet: Set<string>;
  onClose: () => void;
  onToggleApplied: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onOpenCv?: (job: Job) => void;
  onOpenCoverLetter?: (job: Job) => void;
  onOpenQa?: (job: Job) => void;
  onOpenProof?: (job: Job) => void;
  onShowToast?: (msg: string, type?: "success" | "info" | "warning") => void;
}

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

export default function JobModal({
  job,
  isLoadingFullDetails,
  appliedSet,
  hiddenSet,
  savedSet,
  onClose,
  onToggleApplied,
  onToggleHidden,
  onToggleSaved,
  onOpenCv,
  onOpenCoverLetter,
  onOpenQa,
  onOpenProof,
  onShowToast,
}: JobModalProps) {
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
  const companySlug = toCompanySlug(job.company_name);

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
                href={`/companies/${companySlug}`}
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

                {/* Company Careers Page */}
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

                {/* Show Jobright listing link when we have a direct URL */}
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

              {/* Description (XSS Sanitized) */}
              <div style={{ padding: "20px 28px", fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                {isLoadingFullDetails && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "var(--accent-glow)", fontSize: 13 }}>
                    <Loader2 size={15} className="animate-spin" /> Loading full role specification...
                  </div>
                )}

                {job.description ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description.replace(/\n/g, "<br/>")) }} />
                ) : (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description available</p>
                )}

                {job.requirements && (
                  <>
                    <h4 style={{ color: "var(--text-primary)", fontWeight: 600, marginTop: 20, marginBottom: 8, fontSize: 15 }}>Requirements</h4>
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.requirements.replace(/\n/g, "<br/>")) }} />
                  </>
                )}

                {job.responsibilities && (
                  <>
                    <h4 style={{ color: "var(--text-primary)", fontWeight: 600, marginTop: 20, marginBottom: 8, fontSize: 15 }}>Responsibilities</h4>
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.responsibilities.replace(/\n/g, "<br/>")) }} />
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
