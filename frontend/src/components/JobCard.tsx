"use client";

import React from "react";
import Link from "next/link";
import {
  Building2, MapPin, DollarSign, Clock, Share2,
  Sparkles, ExternalLink, Bookmark, BookmarkCheck,
  CheckSquare, Square
} from "lucide-react";
import { Job } from "@/types/job";
import { getSkillColor } from "@/lib/jobPatterns";
import { resolveDirectApplyUrl } from "@/lib/jobUrls";
import { estimateJobSalary } from "@/lib/salaryEstimator";
import { toCompanySlug } from "@/lib/slug";

interface JobCardProps {
  job: Job;
  index: number;
  isFocused: boolean;
  isSaved: boolean;
  isApplied: boolean;
  isHidden: boolean;
  isBulkMode: boolean;
  isBulkSelected: boolean;
  onSelect: () => void;
  onToggleSaved: (id: string) => void;
  onToggleBulkSelect: (id: string) => void;
  onOpenCvModal: (job: Job) => void;
  onShowToast: (msg: string, type?: "success" | "info" | "warning") => void;
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

export function SkeletonCard() {
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

export default function JobCard({
  job,
  index,
  isFocused,
  isSaved,
  isApplied,
  isHidden,
  isBulkMode,
  isBulkSelected,
  onSelect,
  onToggleSaved,
  onToggleBulkSelect,
  onOpenCvModal,
  onShowToast,
}: JobCardProps) {
  const freshness = freshnessColor(job.posted_at || job.created_at);
  const salaryEst = (!job.salary_min && !job.salary_max) ? estimateJobSalary(job.title, job.location) : null;
  const companySlug = toCompanySlug(job.company_name);
  const cardApplyUrl = resolveDirectApplyUrl(job.apply_url || job.job_url, job.description, job.apply_url_original) || job.apply_url || job.job_url || "#";

  return (
    <div
      id={`job-card-${job.id}`}
      className={`job-card ${isFocused ? "focused-job" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        border: isBulkSelected ? "1px solid #818cf8" : undefined,
        background: isBulkSelected ? "rgba(99, 102, 241, 0.06)" : undefined,
      }}
      onClick={() => {
        if (isBulkMode) {
          onToggleBulkSelect(job.id);
        } else {
          onSelect();
        }
      }}
    >
      {/* Card Body */}
      <div className="job-card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top row: checkboxes / badges + freshness */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            {isBulkMode && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBulkSelect(job.id);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
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
            {isApplied && (
              <span className="badge" style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                applied
              </span>
            )}
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
            href={`/companies/${companySlug}`}
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
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    background: `${col}18`,
                    color: col,
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
                onShowToast("Job link copied! 📋", "success");
              }
            }}
            className="btn-ghost"
            style={{ color: "var(--text-muted)", padding: "4px 6px" }}
            title="Copy direct share link"
          >
            <Share2 size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCvModal(job);
            }}
            className="btn-ghost"
            style={{ color: "#a78bfa", fontSize: 11, padding: "4px 8px" }}
            title="AI Tailor CV"
          >
            <Sparkles size={12} /> Tailor
          </button>
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved(job.id);
            }}
            className="btn-ghost"
            style={{ color: isSaved ? "var(--warning)" : "var(--text-muted)", padding: "4px 6px" }}
            title={isSaved ? "Unsave" : "Save"}
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="btn-primary"
            style={{ padding: "5px 12px", fontSize: 11, borderRadius: "var(--radius-sm)" }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
