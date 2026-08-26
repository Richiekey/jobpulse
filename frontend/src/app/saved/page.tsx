"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Bookmark, Search, ExternalLink,
  CheckCircle2, Trash2, Edit3, X, Building2, MapPin,
  Download, ArrowLeft, Sparkles, FileText, Clock, Share2, Briefcase
} from "lucide-react";
import { identifyAtsPlatform, resolveDirectApplyUrl } from "@/lib/jobUrls";

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
  apply_url_original?: string;
  is_staffing_agency?: boolean;
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

function formatPostingDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SavedJobsPage() {
  const { user, profile, syncAppliedJobToSheet } = useAuth();

  const [savedIds, setSavedIds] = useState<Set<string>>(() => getStoredSet("jp_saved"));
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => getStoredSet("jp_applied"));
  const [notes, setNotes] = useState<Record<string, string>>(() => getStoredNotes());
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

  // Fetch on mount
  useEffect(() => {
    if (savedIds.size === 0) {
      setLoading(false);
      return;
    }
    fetchSavedJobs(savedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!isNowApplied) {
      try {
        const hiddenList: string[] = JSON.parse(localStorage.getItem("jp_hidden") || "[]");
        const nextHidden = hiddenList.filter((hid) => hid !== id);
        localStorage.setItem("jp_hidden", JSON.stringify(nextHidden));
        window.dispatchEvent(new Event("jp_storage_update"));
      } catch {}
    }

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
    if (!tempNoteText.trim()) delete updated[jobId];
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
      const isApplied = appliedIds.has(job.id);
      if (statusFilter === "APPLIED" && !isApplied) return false;
      if (statusFilter === "NOT_APPLIED" && isApplied) return false;
      if (sourceFilter && job.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company_name.toLowerCase().includes(q);
        const matchesLocation = (job.location || "").toLowerCase().includes(q);
        const matchesNote = (notes[job.id] || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesNote) return false;
      }
      return true;
    });
  }, [jobs, appliedIds, statusFilter, sourceFilter, searchQuery, notes]);

  const appliedCount = jobs.filter((j) => appliedIds.has(j.id)).length;
  const notAppliedCount = jobs.length - appliedCount;
  const notesCount = jobs.filter((j) => notes[j.id]).length;

  // Unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const set = new Set(jobs.map((j) => j.source));
    return [...set].sort();
  }, [jobs]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
      {/* ── Header ─────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: "#71717a",
            textDecoration: "none", marginBottom: 12, transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e4e4e7")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
        >
          <ArrowLeft size={14} /> Back to Jobs
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em",
              margin: 0, background: "linear-gradient(135deg, #e0e7ff, #c7d2fe 60%, #a5b4fc)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Saved Jobs
            </h1>
            <p style={{ color: "#71717a", fontSize: 13, marginTop: 4 }}>
              Track, organize, and manage your bookmarked opportunities.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {jobs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const rows = [
                    ["Title", "Company", "Location", "Status", "Apply URL", "Notes"],
                    ...jobs.map((j) => [
                      `"${j.title.replace(/"/g, '""')}"`,
                      `"${j.company_name.replace(/"/g, '""')}"`,
                      `"${(j.location || "").replace(/"/g, '""')}"`,
                      appliedIds.has(j.id) ? "Applied" : "Saved",
                      `"${j.apply_url || j.job_url}"`,
                      `"${(notes[j.id] || "").replace(/"/g, '""')}"`,
                    ]),
                  ];
                  const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
                  const link = document.createElement("a");
                  link.setAttribute("href", encodeURI(csvContent));
                  link.setAttribute("download", `jobpulse_saved_${new Date().toISOString().split("T")[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                  color: "#a1a1aa", fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                <Download size={13} /> Export CSV
              </button>
            )}

            {profile?.google_sheet_url && (
              <a
                href={profile.google_sheet_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  height: 36, padding: "0 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  border: "1px solid rgba(52, 211, 153, 0.3)", background: "rgba(52, 211, 153, 0.06)",
                  color: "#34d399", textDecoration: "none", fontFamily: "inherit",
                }}
              >
                <FileText size={13} /> Google Sheet
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Saved", value: jobs.length, color: "#818cf8", icon: <Bookmark size={18} /> },
          { label: "Ready to Apply", value: notAppliedCount, color: "#fbbf24", icon: <Clock size={18} /> },
          { label: "Applied", value: appliedCount, color: "#34d399", icon: <CheckCircle2 size={18} /> },
          { label: "With Notes", value: notesCount, color: "#38bdf8", icon: <Edit3 size={18} /> },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "18px 20px", borderRadius: 16,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${stat.color}12`, border: `1px solid ${stat.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: stat.color, flexShrink: 0,
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1.1, marginTop: 2 }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ─────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "12px 16px", borderRadius: 14, marginBottom: 24,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#52525b" }} />
          <input
            type="text"
            placeholder="Search saved titles, companies, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", height: 38, paddingLeft: 34, paddingRight: searchQuery ? 34 : 12,
              borderRadius: 10, fontSize: 12, fontFamily: "inherit",
              background: "rgba(255,255,255,0.04)", border: "1px solid transparent",
              color: "#f4f4f5", outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 4,
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div style={{
          display: "flex", alignItems: "center", gap: 2, padding: 3,
          borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {([
            { key: "ALL" as const, label: `All (${jobs.length})`, color: "#818cf8" },
            { key: "NOT_APPLIED" as const, label: `Ready (${notAppliedCount})`, color: "#fbbf24" },
            { key: "APPLIED" as const, label: `Applied (${appliedCount})`, color: "#34d399" },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "none", fontFamily: "inherit",
                background: statusFilter === tab.key ? `${tab.color}18` : "transparent",
                color: statusFilter === tab.key ? tab.color : "#71717a",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        {uniqueSources.length > 1 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              height: 38, padding: "0 12px", borderRadius: 10, fontSize: 12, fontFamily: "inherit",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              color: sourceFilter ? "#c7d2fe" : "#71717a", cursor: "pointer", outline: "none",
            }}
          >
            <option value="">All Sources</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Content ─────────────────── */}
      {loading ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: "rgba(255,255,255,0.02)", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            width: 36, height: 36, border: "3px solid rgba(99,102,241,0.3)",
            borderTopColor: "#6366f1", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
          }} />
          <p style={{ fontSize: 13, color: "#71717a" }}>Loading saved opportunities...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: "rgba(255,255,255,0.02)", borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", color: "#818cf8",
          }}>
            <Bookmark size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", color: "#f4f4f5" }}>
            No Saved Jobs Yet
          </h2>
          <p style={{ color: "#71717a", fontSize: 13, maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Click the bookmark icon on any job card to save it here for easy tracking and application management.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", textDecoration: "none",
              boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
            }}
          >
            <Sparkles size={14} /> Explore Open Positions
          </Link>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "rgba(255,255,255,0.02)", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f4f4f5", marginBottom: 8 }}>
            No saved jobs match your filters
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setSourceFilter(""); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#818cf8", fontSize: 13, fontWeight: 600, textDecoration: "underline",
            }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filteredJobs.map((job) => {
            const isApplied = appliedIds.has(job.id);
            const userNote = notes[job.id];
            const isEditing = editingNoteId === job.id;
            const postDate = formatPostingDate(job.posted_at || job.created_at);

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                style={{
                  position: "relative", display: "flex", flexDirection: "column",
                  padding: 20, borderRadius: 18, cursor: "pointer",
                  background: isApplied ? "rgba(16,185,129,0.03)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isApplied ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isApplied ? "rgba(16,185,129,0.4)" : "rgba(99,102,241,0.3)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 30px -8px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isApplied ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Top row: source + status + actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.2)", textTransform: "lowercase",
                    }}>
                      {job.source}
                    </span>
                    {isApplied && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        background: "rgba(16,185,129,0.12)", color: "#34d399",
                        border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <CheckCircle2 size={10} /> Applied
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(job, e)}
                      style={{
                        padding: 6, borderRadius: 8, background: "none", border: "none",
                        cursor: "pointer", color: copiedId === job.id ? "#34d399" : "#52525b",
                        transition: "color 0.15s",
                      }}
                      title="Copy link"
                    >
                      <Share2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeSaved(job.id, e)}
                      style={{
                        padding: 6, borderRadius: 8, background: "none", border: "none",
                        cursor: "pointer", color: "#52525b", transition: "color 0.15s",
                      }}
                      title="Remove"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Title & Meta */}
                <h3 style={{
                  fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: "0 0 6px",
                  color: "#f4f4f5",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {job.title}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a1a1aa", marginBottom: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Building2 size={12} style={{ color: "#52525b" }} />
                    <span style={{ fontWeight: 600, color: "#d4d4d8" }}>{job.company_name}</span>
                  </span>
                  <span style={{ color: "#3f3f46" }}>•</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <MapPin size={12} style={{ color: "#52525b", flexShrink: 0 }} />
                    {job.location || "Remote"}
                  </span>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {job.remote_type && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa",
                    }}>
                      {job.remote_type}
                    </span>
                  )}
                  {job.salary_min ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399",
                    }}>
                      ${job.salary_min.toLocaleString()} – ${job.salary_max?.toLocaleString()}
                    </span>
                  ) : null}
                  {postDate && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 6,
                      background: "rgba(255,255,255,0.03)", color: "#71717a",
                    }}>
                      <Clock size={9} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
                      {postDate}
                    </span>
                  )}
                </div>

                {/* Note */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: "10px 12px", borderRadius: 10, marginBottom: 14, fontSize: 12,
                    background: userNote ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${userNote ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)"}`,
                  }}
                >
                  {isEditing ? (
                    <div>
                      <textarea
                        value={tempNoteText}
                        onChange={(e) => setTempNoteText(e.target.value)}
                        placeholder="Add a note (referral contact, custom CV used, follow-up date)..."
                        style={{
                          width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(99,102,241,0.3)",
                          borderRadius: 8, padding: 8, fontSize: 11, color: "#e4e4e7", outline: "none",
                          resize: "none", fontFamily: "inherit",
                        }}
                        rows={2}
                        autoFocus
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          style={{ background: "none", border: "none", fontSize: 11, color: "#71717a", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(job.id)}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff",
                            border: "none", cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 11, color: userNote ? "#a1a1aa" : "#52525b", fontStyle: userNote ? "normal" : "italic" }}>
                        {userNote ? (
                          <><span style={{ fontWeight: 700, color: "#a5b4fc", marginRight: 4 }}>Note:</span>{userNote}</>
                        ) : (
                          "+ Add a note..."
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setEditingNoteId(job.id); setTempNoteText(userNote || ""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 2, transition: "color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#e4e4e7")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => toggleApplied(job.id, e)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                      borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${isApplied ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.06)"}`,
                      background: isApplied ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                      color: isApplied ? "#34d399" : "#a1a1aa", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    <CheckCircle2 size={12} />
                    {isApplied ? "Applied ✓" : "Mark Applied"}
                  </button>

                  <a
                    href={job.apply_url || job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 16px",
                      borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff",
                      textDecoration: "none", boxShadow: "0 2px 10px rgba(99,102,241,0.25)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Apply <ExternalLink size={11} />
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
          onClick={() => setSelectedJob(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f0f13", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, maxWidth: 680, width: "100%", maxHeight: "88vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8)",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "24px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)", textTransform: "lowercase" }}>
                    {selectedJob.source}
                  </span>
                  {appliedIds.has(selectedJob.id) && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
                      Applied ✓
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "#f4f4f5" }}>{selectedJob.title}</h2>
                <div style={{ fontSize: 13, color: "#a1a1aa", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "#d4d4d8" }}>{selectedJob.company_name}</span>
                  <span style={{ color: "#3f3f46" }}>•</span>
                  <span>{selectedJob.location || "Remote"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                style={{
                  padding: 6, borderRadius: 10, background: "rgba(255,255,255,0.05)",
                  border: "none", cursor: "pointer", color: "#71717a", transition: "color 0.15s",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1, fontSize: 13, color: "#a1a1aa", lineHeight: 1.7 }}>
              {notes[selectedJob.id] && (
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#c7d2fe", marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, color: "#a5b4fc" }}>Your Note:</div>
                  <p style={{ margin: 0 }}>{notes[selectedJob.id]}</p>
                </div>
              )}

              {selectedJob.description && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>About the Role</h4>
                  <div style={{ whiteSpace: "pre-wrap" }}>{selectedJob.description}</div>
                </div>
              )}

              {selectedJob.requirements && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Requirements</h4>
                  <div style={{ whiteSpace: "pre-wrap" }}>{selectedJob.requirements}</div>
                </div>
              )}

              {/* Links */}
              {(() => {
                const staticResolved = resolveDirectApplyUrl(selectedJob.apply_url || selectedJob.job_url, selectedJob.description, selectedJob.apply_url_original);
                const effectiveUrl = selectedJob.apply_url_original || (staticResolved && !staticResolved.includes("jobright.ai") ? staticResolved : null);
                const atsInfo = identifyAtsPlatform(effectiveUrl || selectedJob.apply_url || selectedJob.job_url);
                const isJobright = selectedJob.source === "JOBRIGHT" || (selectedJob.apply_url || "").includes("jobright.ai");
                const hasDirectUrl = !!effectiveUrl && effectiveUrl !== selectedJob.apply_url;
                const primaryApplyUrl = effectiveUrl || selectedJob.apply_url || selectedJob.job_url || "";

                return (
                  <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={12} />
                      {hasDirectUrl ? `Direct Apply (${atsInfo.label})` : (isJobright ? "Application Link (via Jobright)" : `${atsInfo.label} Application`)}
                    </div>
                    <a
                      href={primaryApplyUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.3)",
                        color: "#818cf8", fontSize: 12, textDecoration: "none",
                        overflow: "hidden", textOverflow: "ellipsis",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primaryApplyUrl}</span>
                      <ExternalLink size={12} style={{ flexShrink: 0, marginLeft: 8 }} />
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,0,0,0.2)",
            }}>
              <button
                type="button"
                onClick={() => { toggleApplied(selectedJob.id); setSelectedJob(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${appliedIds.has(selectedJob.id) ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)"}`,
                  background: appliedIds.has(selectedJob.id) ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                  color: appliedIds.has(selectedJob.id) ? "#34d399" : "#a1a1aa", fontFamily: "inherit",
                }}
              >
                <CheckCircle2 size={13} />
                {appliedIds.has(selectedJob.id) ? "Applied ✓" : "Mark Applied"}
              </button>

              <a
                href={selectedJob.apply_url || selectedJob.job_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px",
                  borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff",
                  textDecoration: "none", boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
                }}
              >
                Apply Now <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
