"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Bookmark, BookmarkCheck, Search, Filter, ExternalLink,
  CheckCircle2, Trash2, Edit3, Save, X, Building2, MapPin,
  Clock, DollarSign, Download, ArrowLeft, Briefcase, Share2, Sparkles, FileText
} from "lucide-react";

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
  apply_url?: string;
  source: string;
  posted_at?: string;
  created_at: string;
  skills?: string[];
  role_category?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

function getStoredSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

function getStoredNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("jp_saved_notes");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredNotes(notes: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("jp_saved_notes", JSON.stringify(notes));
  } catch {}
}

export default function SavedJobsPage() {
  const { user, profile, syncAppliedJobToSheet } = useAuth();

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NOT_APPLIED" | "APPLIED">("ALL");
  const [sourceFilter, setSourceFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const initialSaved = getStoredSet("jp_saved");
    const initialApplied = getStoredSet("jp_applied");
    const initialNotes = getStoredNotes();

    setSavedIds(initialSaved);
    setAppliedIds(initialApplied);
    setNotes(initialNotes);

    if (initialSaved.size === 0) {
      setLoading(false);
      return;
    }

    // Fetch details for saved IDs
    fetchSavedJobs(initialSaved);
  }, []);

  const fetchSavedJobs = async (idsSet: Set<string>) => {
    if (idsSet.size === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idArray = [...idsSet];
      // Chunk requests if needed (up to 50)
      const res = await fetch(`${API_BASE}/jobs?ids=${idArray.slice(0, 50).join(",")}&per_page=50`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.items || []);
      } else {
        setError("Could not load saved job details.");
      }
    } catch {
      setError("Network error loading saved jobs.");
    } finally {
      setLoading(false);
    }
  };

  const removeSaved = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveStoredSet("jp_saved", next);
      return next;
    });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const toggleApplied = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isNowApplied = !appliedIds.has(id);

    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveStoredSet("jp_applied", next);
      return next;
    });

    if (isNowApplied && syncAppliedJobToSheet) {
      const job = jobs.find((j) => j.id === id);
      if (job) {
        syncAppliedJobToSheet({
          id: job.id,
          company_name: job.company_name,
          title: job.title,
          location: job.location,
          job_url: job.job_url,
          apply_url: job.apply_url,
          salary: job.salary_min ? `${job.salary_min}-${job.salary_max} ${job.salary_currency || "USD"}` : "",
          source: job.source,
        });
      }
    }
  };

  const handleSaveNote = (jobId: string) => {
    const updated = { ...notes, [jobId]: tempNoteText.trim() };
    if (!tempNoteText.trim()) {
      delete updated[jobId];
    }
    setNotes(updated);
    saveStoredNotes(updated);
    setEditingNoteId(null);
    setTempNoteText("");
  };

  const handleCopyLink = (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = job.apply_url || job.job_url;
    navigator.clipboard.writeText(link);
    setCopiedId(job.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Status filter
      const isApplied = appliedIds.has(job.id);
      if (statusFilter === "APPLIED" && !isApplied) return false;
      if (statusFilter === "NOT_APPLIED" && isApplied) return false;

      // Source filter
      if (sourceFilter && job.source !== sourceFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company_name.toLowerCase().includes(q);
        const matchesLocation = (job.location || "").toLowerCase().includes(q);
        const matchesNote = (notes[job.id] || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesNote) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, appliedIds, statusFilter, sourceFilter, searchQuery, notes]);

  const appliedCount = jobs.filter((j) => appliedIds.has(j.id)).length;
  const notAppliedCount = jobs.length - appliedCount;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
      {/* ── Top Header ─────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-white mb-2 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} /> Back to Discover Jobs
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
            Saved Jobs Catalogue
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Organize, prioritize, and track applications for your bookmarked opportunities.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {jobs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const rows = [
                  ["Title", "Company", "Location", "Status", "Apply URL", "Jobright URL", "Notes"],
                  ...jobs.map((j) => [
                    `"${j.title.replace(/"/g, '""')}"`,
                    `"${j.company_name.replace(/"/g, '""')}"`,
                    `"${(j.location || "").replace(/"/g, '""')}"`,
                    appliedIds.has(j.id) ? "Applied" : "Saved",
                    `"${j.apply_url || j.job_url}"`,
                    `"${j.job_url}"`,
                    `"${(notes[j.id] || "").replace(/"/g, '""')}"`,
                  ]),
                ];
                const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `jobpulse_saved_jobs_${new Date().toISOString().split("T")[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} /> Export CSV ({jobs.length})
            </button>
          )}

          {profile?.google_sheet_url && (
            <a
              href={profile.google_sheet_url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs flex items-center gap-1.5"
              style={{ color: "#34d399", borderColor: "rgba(52, 211, 153, 0.3)" }}
            >
              <FileText size={14} /> View Google Sheet
            </a>
          )}
        </div>
      </div>

      {/* ── Stats Metric Cards ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4 rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Total Bookmarked
          </div>
          <div className="text-2xl font-black" style={{ color: "var(--accent-glow)" }}>
            {jobs.length}
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Ready to Apply
          </div>
          <div className="text-2xl font-black text-amber-400">
            {notAppliedCount}
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Submitted / Applied
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {appliedCount}
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            With Personal Notes
          </div>
          <div className="text-2xl font-black text-sky-400">
            {Object.keys(notes).length}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────── */}
      <div
        className="glass-card p-3.5 rounded-2xl border mb-6 flex items-center gap-3 flex-wrap"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search saved titles, companies, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white p-1"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            style={{
              background: statusFilter === "ALL" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: statusFilter === "ALL" ? "var(--accent-glow)" : "var(--text-muted)",
            }}
          >
            All ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("NOT_APPLIED")}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            style={{
              background: statusFilter === "NOT_APPLIED" ? "rgba(245, 158, 11, 0.15)" : "transparent",
              color: statusFilter === "NOT_APPLIED" ? "#fbbf24" : "var(--text-muted)",
            }}
          >
            Ready ({notAppliedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("APPLIED")}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            style={{
              background: statusFilter === "APPLIED" ? "rgba(16, 185, 129, 0.15)" : "transparent",
              color: statusFilter === "APPLIED" ? "#34d399" : "var(--text-muted)",
            }}
          >
            Applied ({appliedCount})
          </button>
        </div>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="select-field text-xs cursor-pointer"
          style={{ flex: "0 1 140px" }}
        >
          <option value="">All Sources</option>
          <option value="JOBRIGHT">Jobright</option>
          <option value="GREENHOUSE">Greenhouse</option>
          <option value="ASHBY">Ashby</option>
          <option value="WORKDAY">Workday</option>
          <option value="LEVER">Lever</option>
        </select>
      </div>

      {/* ── Content Area ─────────────────── */}
      {loading ? (
        <div className="text-center py-24 glass-card rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted" style={{ color: "var(--text-muted)" }}>Loading your saved opportunities...</p>
        </div>
      ) : jobs.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 glass-card rounded-3xl border p-8" style={{ borderColor: "var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <Bookmark size={28} />
          </div>
          <h2 className="text-xl font-bold mb-2">No Saved Jobs Yet</h2>
          <p className="text-xs text-secondary max-w-md mx-auto mb-6" style={{ color: "var(--text-secondary)" }}>
            When you discover interesting roles on JobPulse, click the bookmark icon on any card to save it here for easy tracking and application.
          </p>
          <Link href="/" className="btn-primary text-xs py-2.5 px-6 rounded-xl font-bold inline-flex items-center gap-2">
            <Sparkles size={14} /> Explore Open Positions
          </Link>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border p-6" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-sm font-semibold mb-2">No saved jobs match your current filters</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setSourceFilter(""); }}
            className="text-xs text-indigo-400 underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Grid of Saved Jobs */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const isApplied = appliedIds.has(job.id);
            const userNote = notes[job.id];
            const isEditing = editingNoteId === job.id;

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="job-card group cursor-pointer relative flex flex-col justify-between"
                style={{
                  background: isApplied ? "rgba(16, 185, 129, 0.03)" : "var(--bg-card)",
                  borderColor: isApplied ? "rgba(16, 185, 129, 0.25)" : "var(--border-subtle)",
                }}
              >
                <div>
                  {/* Top Bar: Company + Source + Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="source-badge">{job.source}</span>
                      {isApplied && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Applied
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Copy Link */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(job, e)}
                        className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        title="Copy direct apply link"
                      >
                        <Share2 size={13} style={{ color: copiedId === job.id ? "#34d399" : "var(--text-muted)" }} />
                      </button>

                      {/* Remove Saved */}
                      <button
                        type="button"
                        onClick={(e) => removeSaved(job.id, e)}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remove from saved"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Company */}
                  <h3 className="text-sm font-bold leading-snug mb-1 group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-secondary mb-3" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold text-primary" style={{ color: "var(--text-primary)" }}>{job.company_name}</span>
                    <span>•</span>
                    <span className="truncate">{job.location || "Remote"}</span>
                  </div>

                  {/* Salary & Remote badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3.5">
                    {job.remote_type && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                        {job.remote_type}
                      </span>
                    )}
                    {job.salary_min ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ${job.salary_min.toLocaleString()} - ${job.salary_max?.toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  {/* Personal Note Box */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-xl mb-3 text-xs border"
                    style={{
                      background: userNote ? "rgba(99, 102, 241, 0.06)" : "rgba(255, 255, 255, 0.02)",
                      borderColor: userNote ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempNoteText}
                          onChange={(e) => setTempNoteText(e.target.value)}
                          placeholder="Add notes (e.g. Referral from John, applied with tailored CV)..."
                          className="w-full bg-black/40 border border-indigo-500/40 rounded-lg p-2 text-xs text-white focus:outline-none resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2 py-1 text-[11px] text-muted hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNote(job.id)}
                            className="btn-primary text-[11px] py-1 px-3 rounded-lg"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {userNote ? (
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                              <span className="font-semibold text-indigo-400 mr-1">Note:</span>
                              {userNote}
                            </p>
                          ) : (
                            <span className="text-[11px] text-muted italic" style={{ color: "var(--text-muted)" }}>
                              + Add note / follow-up reminder
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(job.id);
                            setTempNoteText(userNote || "");
                          }}
                          className="text-muted hover:text-white p-1 transition-colors"
                          title="Edit note"
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                  {/* Mark Applied Toggle */}
                  <button
                    type="button"
                    onClick={(e) => toggleApplied(job.id, e)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5"
                    style={{
                      background: isApplied ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      borderColor: isApplied ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)",
                      color: isApplied ? "#34d399" : "var(--text-secondary)",
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>{isApplied ? "Applied ✓" : "Mark Applied"}</span>
                  </button>

                  {/* Primary Direct Apply */}
                  <a
                    href={job.apply_url || job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs py-1.5 px-3.5 rounded-xl font-bold flex items-center gap-1"
                  >
                    <span>Apply</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Job Details Modal ─────────────────── */}
      {selectedJob && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedJob(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            className="modal-content animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border-medium)",
              borderRadius: 20, maxWidth: 680, width: "100%", maxHeight: "88vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="source-badge">{selectedJob.source}</span>
                  {appliedIds.has(selectedJob.id) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Applied ✓
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold mb-1">{selectedJob.title}</h2>
                <div className="text-xs text-secondary flex items-center gap-2">
                  <span className="font-bold text-primary">{selectedJob.company_name}</span>
                  <span>•</span>
                  <span>{selectedJob.location || "Remote"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-xl text-muted hover:text-white bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-secondary leading-relaxed">
              {notes[selectedJob.id] && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  <div className="font-bold text-[11px] mb-1">Your Personal Note:</div>
                  <p>{notes[selectedJob.id]}</p>
                </div>
              )}

              {selectedJob.description && (
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">About the Role</h4>
                  <div className="whitespace-pre-wrap">{selectedJob.description}</div>
                </div>
              )}

              {selectedJob.requirements && (
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Requirements</h4>
                  <div className="whitespace-pre-wrap">{selectedJob.requirements}</div>
                </div>
              )}

              {/* Direct Links section */}
              {(() => {
                const isJobright = selectedJob.source === "JOBRIGHT";
                const hasDistinctAts = selectedJob.apply_url && selectedJob.job_url && selectedJob.apply_url !== selectedJob.job_url && !selectedJob.apply_url.includes("jobright.ai");

                let atsName = "Company Site";
                const linkToCheck = selectedJob.apply_url || selectedJob.job_url || "";
                if (selectedJob.source === "GREENHOUSE" || linkToCheck.includes("greenhouse.io")) {
                  atsName = "Greenhouse";
                } else if (selectedJob.source === "ASHBY" || linkToCheck.includes("ashbyhq.com")) {
                  atsName = "Ashby";
                } else if (selectedJob.source === "WORKDAY" || linkToCheck.includes("myworkdayjobs.com")) {
                  atsName = "Workday";
                } else if (selectedJob.source === "LEVER" || linkToCheck.includes("lever.co")) {
                  atsName = "Lever";
                } else if (selectedJob.source === "WORKABLE" || linkToCheck.includes("workable.com")) {
                  atsName = "Workable";
                } else if (selectedJob.source === "APPLYTOJOB" || linkToCheck.includes("applytojob.com")) {
                  atsName = "JazzHR";
                } else if (selectedJob.source === "ICIMS" || linkToCheck.includes("icims.com")) {
                  atsName = "iCIMS";
                } else if (selectedJob.source === "JOBVITE" || linkToCheck.includes("jobvite.com")) {
                  atsName = "Jobvite";
                }

                const primaryApplyUrl = hasDistinctAts ? selectedJob.apply_url : (selectedJob.apply_url || selectedJob.job_url);
                const primaryButtonText = hasDistinctAts 
                  ? `Apply on ${atsName}` 
                  : (isJobright ? "Apply on Jobright" : `Apply on ${atsName}`);

                return (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                      {hasDistinctAts ? `Direct ATS Application Link (${atsName})` : (isJobright ? "Job Application Link (via Jobright)" : `${atsName} Application Link`)}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={primaryApplyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center justify-between p-2 rounded-lg bg-black/30"
                      >
                        <span className="truncate">{primaryApplyUrl}</span>
                        <ExternalLink size={12} className="shrink-0 ml-2" />
                      </a>
                      {hasDistinctAts && isJobright && selectedJob.job_url && (
                        <a
                          href={selectedJob.job_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted hover:text-white flex items-center justify-between p-2 rounded-lg bg-black/20"
                        >
                          <span className="truncate">Jobright Listing: {selectedJob.job_url}</span>
                          <ExternalLink size={12} className="shrink-0 ml-2" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            {(() => {
              const isJobright = selectedJob.source === "JOBRIGHT";
              const hasDistinctAts = selectedJob.apply_url && selectedJob.job_url && selectedJob.apply_url !== selectedJob.job_url && !selectedJob.apply_url.includes("jobright.ai");

              let atsName = "Company Site";
              const linkToCheck = selectedJob.apply_url || selectedJob.job_url || "";
              if (selectedJob.source === "GREENHOUSE" || linkToCheck.includes("greenhouse.io")) {
                atsName = "Greenhouse";
              } else if (selectedJob.source === "ASHBY" || linkToCheck.includes("ashbyhq.com")) {
                atsName = "Ashby";
              } else if (selectedJob.source === "WORKDAY" || linkToCheck.includes("myworkdayjobs.com")) {
                atsName = "Workday";
              } else if (selectedJob.source === "LEVER" || linkToCheck.includes("lever.co")) {
                atsName = "Lever";
              }

              const primaryApplyUrl = hasDistinctAts ? selectedJob.apply_url : (selectedJob.apply_url || selectedJob.job_url);
              const primaryButtonText = hasDistinctAts 
                ? `Apply on ${atsName}` 
                : (isJobright ? "Apply on Jobright" : `Apply on ${atsName}`);

              return (
                <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
                  <button
                    type="button"
                    onClick={() => {
                      toggleApplied(selectedJob.id);
                      setSelectedJob(null);
                    }}
                    className="text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5"
                    style={{
                      background: appliedIds.has(selectedJob.id) ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      borderColor: appliedIds.has(selectedJob.id) ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)",
                      color: appliedIds.has(selectedJob.id) ? "#34d399" : "var(--text-secondary)",
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{appliedIds.has(selectedJob.id) ? "Marked as Applied ✓" : "Mark as Applied"}</span>
                  </button>

                  <a
                    href={primaryApplyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs py-2 px-5 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <span>{primaryButtonText}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
