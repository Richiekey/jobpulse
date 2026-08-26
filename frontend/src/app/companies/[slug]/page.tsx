"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Globe, ArrowLeft, ExternalLink, Briefcase,
  Layers, Clock, DollarSign, Sparkles, Bookmark, BookmarkCheck, Share2, Check
} from "lucide-react";
import { resolveDirectApplyUrl } from "@/lib/jobUrls";
import { estimateJobSalary } from "@/lib/salaryEstimator";
import { ResumeData } from "@/lib/pdfGenerator";
import CvGeneratorModal from "@/components/CvGeneratorModal";
import CoverLetterModal from "@/components/CoverLetterModal";

interface CompanyMeta {
  name: string;
  website?: string | null;
  career_url?: string | null;
  ats?: string | null;
  country?: string | null;
}

interface Job {
  id: string;
  title: string;
  company_name: string;
  location?: string;
  remote_type?: string;
  employment_type?: string;
  department?: string;
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
}

export default function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const companyName = decodeURIComponent(slug);

  const [company, setCompany] = useState<CompanyMeta | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [cvModalJob, setCvModalJob] = useState<Job | null>(null);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setSavedSet(new Set(JSON.parse(localStorage.getItem("jp_saved") || "[]")));
    } catch {}

    async function fetchCompanyData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/companies/${encodeURIComponent(companyName)}`);
        if (!res.ok) {
          setError("Company not found or has no active listings");
          return;
        }
        const data = await res.json();
        setCompany(data.company);
        setJobs(data.jobs || []);
      } catch (err) {
        setError("Failed to load company profile");
      } finally {
        setLoading(false);
      }
    }

    fetchCompanyData();
  }, [companyName]);

  const toggleSave = (jobId: string) => {
    try {
      const next = new Set(savedSet);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      setSavedSet(next);
      localStorage.setItem("jp_saved", JSON.stringify([...next]));
    } catch {}
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Navigation & Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "var(--text-muted)",
            textDecoration: "none", transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-glow)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={16} /> Back to Search
        </Link>

        <button
          onClick={handleShare}
          className="btn-secondary"
          style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
        >
          {copied ? <Check size={14} style={{ color: "var(--success)" }} /> : <Share2 size={14} />}
          {copied ? "Link Copied!" : "Share Profile"}
        </button>
      </div>

      {/* Company Banner Card */}
      <div className="glass-card" style={{ padding: "32px", borderRadius: 20, marginBottom: 32, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{
              width: 58, height: 58, borderRadius: 16,
              background: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)",
              border: "1px solid rgba(168,85,247,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "#c084fc",
            }}>
              <Building2 size={28} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
                  {company?.name || companyName}
                </h1>
                {company?.ats && (
                  <span className={`badge badge-${company.ats.toLowerCase()}`}>
                    {company.ats}
                  </span>
                )}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
                <span>Verified ATS Source</span>
                {company?.country && <span>• {company.country}</span>}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {company?.website && (
              <a
                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ fontSize: 12, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                <Globe size={14} /> Website <ExternalLink size={12} />
              </a>
            )}
            {company?.career_url && (
              <a
                href={company.career_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ fontSize: 12, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                Career Board <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)",
        }}>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Open Positions</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-glow)", marginTop: 2 }}>{jobs.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Remote Roles</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#a5b4fc", marginTop: 2 }}>
              {jobs.filter((j) => (j.remote_type || "").toUpperCase() === "REMOTE" || (j.location || "").toLowerCase().includes("remote")).length}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Avg Freshness</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)", marginTop: 2 }}>&lt; 14 Days</div>
          </div>
        </div>
      </div>

      {/* Active Jobs Section */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Active Opportunities at {company?.name || companyName}
        </h2>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{jobs.length} roles found</span>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: 24, height: 180 }}>
              <div className="skeleton" style={{ width: "70%", height: 20, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "40%", height: 14, marginBottom: 20 }} />
              <div className="skeleton" style={{ width: "30%", height: 24, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <Briefcase size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>No active openings right now</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
            Check back soon or explore our full catalog of 14,000+ open tech opportunities.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {jobs.map((job) => {
            const isSaved = savedSet.has(job.id);
            const applyUrl = resolveDirectApplyUrl(job.apply_url || job.job_url, undefined, job.apply_url_original) || job.apply_url || job.job_url;
            const salaryEst = (!job.salary_min && !job.salary_max) ? estimateJobSalary(job.title, job.location) : null;

            return (
              <div
                key={job.id}
                className="job-card"
                style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
                onClick={() => setSelectedJob(job)}
              >
                <div className="job-card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      <span className={`badge badge-${job.source.toLowerCase()}`}>{job.source.toLowerCase()}</span>
                      {job.remote_type && job.remote_type !== "UNKNOWN" && (
                        <span className={`badge badge-${job.remote_type.toLowerCase()}`}>{job.remote_type.toLowerCase()}</span>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, margin: "0 0 8px", color: "var(--text-primary)" }}>
                    {job.title}
                  </h3>

                  {job.location && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
                      <MapPin size={13} style={{ flexShrink: 0 }} /> {job.location}
                    </div>
                  )}

                  {/* Salary Tag */}
                  {(job.salary_min || job.salary_max) ? (
                    <div className="salary-tag" style={{ marginBottom: 10, alignSelf: "flex-start" }}>
                      <DollarSign size={12} />
                      {job.salary_min && job.salary_max ? `$${job.salary_min / 1000}k–$${job.salary_max / 1000}k` : `$${(job.salary_min || job.salary_max)! / 1000}k`}
                    </div>
                  ) : salaryEst ? (
                    <div className="salary-tag salary-estimated" style={{ marginBottom: 10, alignSelf: "flex-start" }}>
                      <DollarSign size={11} />
                      Est. ${salaryEst.min / 1000}k–${salaryEst.max / 1000}k/yr
                      <span className="estimate-badge">AI</span>
                    </div>
                  ) : null}
                </div>

                <div className="job-card-footer">
                  <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} /> {job.posted_at ? new Date(job.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCvModalJob(job); }}
                      className="btn-ghost"
                      style={{ color: "#a78bfa", fontSize: 11, padding: "4px 8px" }}
                      title="AI Tailor CV"
                    >
                      <Sparkles size={12} /> Tailor
                    </button>
                    <a
                      href={applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn-ghost"
                      style={{ color: "var(--text-muted)", fontSize: 11, padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                    >
                      <ExternalLink size={12} /> Apply
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(job.id); }}
                      className="btn-ghost"
                      style={{ color: isSaved ? "var(--warning)" : "var(--text-muted)", padding: "4px 6px" }}
                    >
                      {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI CV Modal */}
      <CvGeneratorModal
        isOpen={!!cvModalJob}
        job={cvModalJob}
        onClose={() => setCvModalJob(null)}
        onOpenCoverLetter={(j, resData) => {
          setCvModalJob(null);
          setCoverLetterJob(j);
        }}
      />

      {/* AI Cover Letter Modal */}
      <CoverLetterModal
        isOpen={!!coverLetterJob}
        job={coverLetterJob}
        onClose={() => setCoverLetterJob(null)}
      />
    </div>
  );
}
