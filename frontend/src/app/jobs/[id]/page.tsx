"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Building2, MapPin, DollarSign, Calendar, ArrowLeft, ExternalLink,
  Sparkles, Bookmark, BookmarkCheck, Share2, Check, ShieldCheck, Briefcase, Tag, Clock
} from "lucide-react";
import { resolveDirectApplyUrl } from "@/lib/jobUrls";
import { estimateJobSalary } from "@/lib/salaryEstimator";
import { ResumeData } from "@/lib/pdfGenerator";
import CvGeneratorModal from "@/components/CvGeneratorModal";
import CoverLetterModal from "@/components/CoverLetterModal";

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
  description?: string;
  requirements?: string;
  responsibilities?: string;
  skills?: string[];
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI Copilot Modals
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [activeResume, setActiveResume] = useState<ResumeData | null>(null);

  useEffect(() => {
    // Check saved state
    try {
      const savedSet = new Set(JSON.parse(localStorage.getItem("jp_saved") || "[]"));
      setSaved(savedSet.has(id));
    } catch {}

    async function fetchJob() {
      try {
        setLoading(true);
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Job not found or has expired" : "Failed to load job details");
          return;
        }
        const data = await res.json();
        setJob(data);
      } catch (err: any) {
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [id]);

  const toggleSave = () => {
    try {
      const savedList: string[] = JSON.parse(localStorage.getItem("jp_saved") || "[]");
      const set = new Set(savedList);
      if (set.has(id)) {
        set.delete(id);
        setSaved(false);
      } else {
        set.add(id);
        setSaved(true);
      }
      localStorage.setItem("jp_saved", JSON.stringify([...set]));
    } catch {}
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
        <div className="skeleton" style={{ width: 120, height: 20, marginBottom: 24, borderRadius: 8 }} />
        <div className="glass-card" style={{ padding: 36 }}>
          <div className="skeleton" style={{ width: "60%", height: 32, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: "40%", height: 20, marginBottom: 32 }} />
          <div className="skeleton" style={{ width: "100%", height: 200, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ maxWidth: 640, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: 40, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <Briefcase size={40} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
            {error || "Job Unavailable"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            This opportunity might have expired or been fulfilled on the company's ATS board.
          </p>
          <Link href="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
            <ArrowLeft size={16} style={{ marginRight: 6 }} /> Browse Live Jobs
          </Link>
        </div>
      </div>
    );
  }

  const directApplyUrl = resolveDirectApplyUrl(job.apply_url || job.job_url, job.description, job.apply_url_original) || job.apply_url || job.job_url;
  const salaryEstimate = (!job.salary_min && !job.salary_max) ? estimateJobSalary(job.title, job.location) : null;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Back button & share */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
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

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleShare}
            className="btn-secondary"
            style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }}
          >
            {copied ? <Check size={14} style={{ color: "var(--success)" }} /> : <Share2 size={14} />}
            {copied ? "Link Copied!" : "Share Job"}
          </button>
          <button
            onClick={toggleSave}
            className="btn-secondary"
            style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6, color: saved ? "var(--warning)" : "var(--text-primary)" }}
          >
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Main Job Card */}
      <div className="glass-card" style={{ padding: 32, borderRadius: 20, border: "1px solid var(--border-subtle)", position: "relative" }}>
        {/* Badges row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <span className={`badge badge-${job.source.toLowerCase()}`}>{job.source}</span>
          {job.remote_type && job.remote_type !== "UNKNOWN" && (
            <span className={`badge badge-${job.remote_type.toLowerCase()}`}>{job.remote_type}</span>
          )}
          {job.employment_type && (
            <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
              {job.employment_type.replace("_", " ")}
            </span>
          )}
          {job.is_staffing_agency && (
            <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              Staffing Agency
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 12px", lineHeight: 1.25 }}>
          {job.title}
        </h1>

        {/* Company, location, date */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
          <Link
            href={`/companies/${encodeURIComponent(job.company_name)}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent-glow)", textDecoration: "none", fontWeight: 600 }}
          >
            <Building2 size={16} /> {job.company_name}
          </Link>
          {job.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
              <MapPin size={16} /> {job.location}
            </span>
          )}
          {(job.posted_at || job.created_at) && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-dimmed)" }}>
              <Clock size={16} /> Posted {new Date(job.posted_at || job.created_at!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>

        {/* Salary Banner */}
        {(job.salary_min || job.salary_max) ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 12,
            background: "rgba(167, 139, 250, 0.12)", color: "#c4b5fd",
            border: "1px solid rgba(167, 139, 250, 0.25)",
            fontSize: 16, fontWeight: 700, marginBottom: 24,
          }}>
            <DollarSign size={18} />
            {job.salary_min && job.salary_max
              ? `$${job.salary_min.toLocaleString()} – $${job.salary_max.toLocaleString()} / ${job.salary_period || "yr"}`
              : `$${(job.salary_min || job.salary_max)!.toLocaleString()} / ${job.salary_period || "yr"}`}
          </div>
        ) : salaryEstimate ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 12,
            background: "rgba(99, 102, 241, 0.08)", color: "#a5b4fc",
            border: "1px dashed rgba(165, 180, 252, 0.35)",
            fontSize: 14, fontWeight: 600, marginBottom: 24,
          }}>
            <DollarSign size={16} />
            Est. ${salaryEstimate.min.toLocaleString()} – ${salaryEstimate.max.toLocaleString()} / {salaryEstimate.period}
            <span className="estimate-badge">AI Estimate</span>
          </div>
        ) : null}

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 28 }}>
            {job.skills.map((skill) => (
              <span
                key={skill}
                style={{
                  padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: "rgba(99, 102, 241, 0.12)", color: "#a5b4fc",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
          padding: "18px 20px", background: "rgba(0,0,0,0.25)", borderRadius: 14,
          border: "1px solid var(--border-subtle)", marginBottom: 32,
        }}>
          <a
            href={directApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              padding: "10px 24px", fontSize: 14, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            }}
          >
            Apply Directly <ExternalLink size={15} />
          </a>

          <button
            onClick={() => setCvModalOpen(true)}
            className="btn-secondary"
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
              borderColor: "rgba(168, 85, 247, 0.35)", color: "#d8b4fe",
            }}
          >
            <Sparkles size={15} /> Tailor CV (AI)
          </button>

          <button
            onClick={() => setCoverLetterOpen(true)}
            className="btn-secondary"
            style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Generate Cover Letter
          </button>
        </div>

        {/* Job Description */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            About the Role
          </h2>
          {job.description ? (
            <div
              style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Full description available on official applicant board.
            </p>
          )}
        </div>
      </div>

      {/* AI CV Tailor Modal */}
      <CvGeneratorModal
        isOpen={cvModalOpen}
        job={job}
        onClose={() => setCvModalOpen(false)}
        onOpenCoverLetter={(j, resData) => {
          setActiveResume(resData);
          setCvModalOpen(false);
          setCoverLetterOpen(true);
        }}
      />

      {/* AI Cover Letter Modal */}
      <CoverLetterModal
        isOpen={coverLetterOpen}
        job={job}
        tailoredResume={activeResume}
        onClose={() => setCoverLetterOpen(false)}
      />
    </div>
  );
}
