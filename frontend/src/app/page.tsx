"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import LocationFilterPopover from "@/components/LocationFilterPopover";
import JobFunctionFilterPopover from "@/components/JobFunctionFilterPopover";
import DatePostedFilterPopover from "@/components/DatePostedFilterPopover";
import CustomDropdown from "@/components/CustomDropdown";
import CvGeneratorModal from "@/components/CvGeneratorModal";
import CoverLetterModal from "@/components/CoverLetterModal";
import JobQaModal from "@/components/JobQaModal";
import ScreenshotProofModal from "@/components/ScreenshotProofModal";
import JobCard, { SkeletonCard } from "@/components/JobCard";
import JobModal from "@/components/JobModal";
import JobPagination from "@/components/JobPagination";
import BulkActionDock from "@/components/BulkActionDock";

import { Job, LocationFilterState } from "@/types/job";
import { POPULAR_SKILLS, getSkillColor } from "@/lib/jobPatterns";
import { ALL_ATS_PLATFORMS, resolveDirectApplyUrl } from "@/lib/jobUrls";
import { ResumeData } from "@/lib/pdfGenerator";
import { API_BASE, DEFAULT_PAGE_SIZE } from "@/lib/constants";

import {
  Search, Download, Briefcase, X,
  Bookmark, Eye, EyeOff,
  Filter, Tag, RotateCcw, Globe,
  Code, Server, Monitor, BrainCircuit, LineChart, ShieldAlert, AlertCircle,
  Wifi, Database, Zap, CheckCircle2
} from "lucide-react";

// ── LocalStorage Helpers ───────────────────────────────────────
function getStoredSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
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

// ── Global In-Memory Cache (60s SWR for instant 0ms transitions) ──
const jobsMemoryCache = new Map<string, { items: Job[]; total: number; timestamp: number }>();

export default function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
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

  // Pagination State
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Abort Controller Reference
  const abortControllerRef = useRef<AbortController | null>(null);

  // Tracking Sets (Applied, Hidden, Saved)
  const [appliedSet, setAppliedSet] = useState<Set<string>>(() => getStoredSet("jp_applied"));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => getStoredSet("jp_hidden"));
  const [savedSet, setSavedSet] = useState<Set<string>>(() => getStoredSet("jp_saved"));
  const [showApplied, setShowApplied] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modals & Active Selections
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [fullJobData, setFullJobData] = useState<Job | null>(null);
  const [isLoadingFullJob, setIsLoadingFullJob] = useState(false);

  // AI Copilot & Proof Modals
  const [cvModalJob, setCvModalJob] = useState<Job | null>(null);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [activeTailoredResume, setActiveTailoredResume] = useState<ResumeData | null>(null);
  const [qaModalJob, setQaModalJob] = useState<Job | null>(null);
  const [proofModalJob, setProofModalJob] = useState<Job | null>(null);

  // Keyboard Navigation & Bulk Apply Mode
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

  // Auth Context & Notifications
  const { user, profile, syncAppliedJobToSheet } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch Source Breakdown on Mount
  useEffect(() => {
    fetch(`${API_BASE}/jobs/source-counts`)
      .then((r) => r.json())
      .then((data) => {
        if (data.counts) setSourceCounts(data.counts);
      })
      .catch(() => {});
  }, []);

  // 2. Debounce Search Input (350ms)
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query) return;
    const timer = setTimeout(() => {
      setQuery(trimmed);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, query]);

  // 3. Synchronize tracking sets on focus or external storage updates
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

  // Refs for tracking sets
  const appliedSetRef = useRef(appliedSet);
  const hiddenSetRef = useRef(hiddenSet);
  const showAppliedRef = useRef(showApplied);
  const showHiddenRef = useRef(showHidden);
  useEffect(() => { appliedSetRef.current = appliedSet; }, [appliedSet]);
  useEffect(() => { hiddenSetRef.current = hiddenSet; }, [hiddenSet]);
  useEffect(() => { showAppliedRef.current = showApplied; }, [showApplied]);
  useEffect(() => { showHiddenRef.current = showHidden; }, [showHidden]);

  // ── Raw Job Pool for Dynamic 12-Card Page Backfilling ─────────────────
  const [rawJobPool, setRawJobPool] = useState<Job[]>([]);
  const rawPageRef = useRef<number>(1);
  const hasMoreRawRef = useRef<boolean>(true);
  const isFetchingMoreRef = useRef<boolean>(false);
  const rawJobPoolRef = useRef<Job[]>([]);
  useEffect(() => { rawJobPoolRef.current = rawJobPool; }, [rawJobPool]);

  // Dynamic filtered pool (all unapplied/unhidden jobs currently buffered)
  const filteredPool = useMemo(() => {
    return rawJobPool.filter((job) => {
      if (!showApplied && appliedSet.has(job.id)) return false;
      if (!showHidden && hiddenSet.has(job.id)) return false;
      return true;
    });
  }, [rawJobPool, showApplied, showHidden, appliedSet, hiddenSet]);

  const effectiveTotal = useMemo(() => {
    if (total === 0) return 0;
    let excluded = 0;
    if (!showApplied) excluded += appliedSet.size;
    if (!showHidden) excluded += hiddenSet.size;
    return Math.max(filteredPool.length, total - excluded);
  }, [total, showApplied, showHidden, appliedSet.size, hiddenSet.size, filteredPool.length]);

  const totalPages = Math.max(1, Math.ceil(effectiveTotal / DEFAULT_PAGE_SIZE));

  // Current page's exact 12-card slice
  const startIndex = (page - 1) * DEFAULT_PAGE_SIZE;
  const endIndex = startIndex + DEFAULT_PAGE_SIZE;
  const displayedJobs = filteredPool.slice(startIndex, endIndex);

  // 4. Primary Job Fetch Function with Auto-Backfilling
  const fetchJobs = useCallback(async (targetPage: number, reset: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentPool = reset ? [] : rawJobPoolRef.current;
    let currentRawPage = reset ? 1 : rawPageRef.current;
    let canFetch = reset ? true : hasMoreRawRef.current;

    const countFiltered = (pool: Job[]) => {
      return pool.filter((job) => {
        if (!showAppliedRef.current && appliedSetRef.current.has(job.id)) return false;
        if (!showHiddenRef.current && hiddenSetRef.current.has(job.id)) return false;
        return true;
      }).length;
    };

    const targetNeeded = targetPage * DEFAULT_PAGE_SIZE;
    const hasEnough = countFiltered(currentPool) >= targetNeeded;

    if (reset || !hasEnough) {
      setLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (locationState.country) params.set("country", locationState.country);
      if (locationState.cityOrState) params.set("location", locationState.cityOrState);
      if (selectedFunctions.length > 0) params.set("functions", selectedFunctions.join(","));
      if (datePosted) params.set("date_posted", datePosted);
      if (remoteType) params.set("remote_type", remoteType);
      if (source) params.set("source", source);
      if (selectedSkills.size > 0) params.set("skills", [...selectedSkills].join(","));

      while (countFiltered(currentPool) < targetNeeded && canFetch) {
        params.set("page", String(currentRawPage));
        params.set("per_page", "48");

        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(`${API_BASE}/jobs?${params.toString()}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          if (currentPool.length === 0) setError(`Server error (${res.status})`);
          break;
        }

        const data = await res.json();
        const items: Job[] = data.items || [];
        const tot = data.total || 0;
        if (tot > 0) setTotal(tot);

        if (items.length === 0) {
          canFetch = false;
          hasMoreRawRef.current = false;
          break;
        }

        const existingIds = new Set(currentPool.map((j) => j.id));
        const uniqueItems = items.filter((j) => !existingIds.has(j.id));
        currentPool = [...currentPool, ...uniqueItems];
        currentRawPage += 1;
        rawPageRef.current = currentRawPage;
        rawJobPoolRef.current = currentPool;
        setRawJobPool(currentPool);

        if (items.length < 48 || currentPool.length >= tot) {
          canFetch = false;
          hasMoreRawRef.current = false;
          break;
        }
      }

      // Background buffer replenishment: keep reserve jobs ready for next page & instant replacement
      const reserveCount = countFiltered(currentPool) - targetNeeded;
      if (reserveCount < DEFAULT_PAGE_SIZE && canFetch && !isFetchingMoreRef.current) {
        isFetchingMoreRef.current = true;
        const nextRawP = currentRawPage;
        const bgParams = new URLSearchParams(params);
        bgParams.set("page", String(nextRawP));
        bgParams.set("per_page", "48");

        fetch(`${API_BASE}/jobs?${bgParams.toString()}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((nextData) => {
            if (nextData?.items?.length > 0) {
              const prev = rawJobPoolRef.current;
              const prevIds = new Set(prev.map((j) => j.id));
              const fresh = nextData.items.filter((j: Job) => !prevIds.has(j.id));
              if (fresh.length > 0) {
                const combined = [...prev, ...fresh];
                rawJobPoolRef.current = combined;
                rawPageRef.current = nextRawP + 1;
                setRawJobPool(combined);
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            isFetchingMoreRef.current = false;
          });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      if (currentPool.length === 0) setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }, [query, locationState, selectedFunctions, datePosted, remoteType, source, selectedSkills]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
    rawPageRef.current = 1;
    hasMoreRawRef.current = true;
    setRawJobPool([]);
    fetchJobs(1, true);
  }, [fetchJobs]);

  // Re-fetch on user auth change
  useEffect(() => {
    if (user) {
      jobsMemoryCache.clear();
      setPage(1);
      rawPageRef.current = 1;
      hasMoreRawRef.current = true;
      setRawJobPool([]);
      fetchJobs(1, true);
    }
  }, [user, fetchJobs]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    fetchJobs(newPage, false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  };

  // 5. Tracking Action Handlers
  const toggleApplied = async (id: string) => {
    const isNowApplied = !appliedSet.has(id);

    if (!isNowApplied) {
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

    try {
      const targetJob = rawJobPool.find((j) => j.id === id) || (fullJobData?.id === id ? fullJobData : selectedJob);
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

        if (result.success) {
          showToast(`Applied & synced to Google Sheets! 📊`, "success");
        } else if (!user) {
          showToast(`Marked as applied. Sign in on /profile to auto-sync to Google Sheet.`, "info");
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
    } catch {}
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

  // Open modal with instant loading feedback
  const openJobModal = async (job: Job) => {
    setSelectedJob(job);
    setFullJobData(job);
    setIsLoadingFullJob(true);

    try {
      const res = await fetch(`${API_BASE}/jobs/${job.id}`);
      if (res.ok) {
        const full = await res.json();
        setFullJobData(full);
      }
    } catch {
      setFullJobData(job);
    } finally {
      setIsLoadingFullJob(false);
    }
  };

  // 6. Bulk Apply Handlers
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

  const appliedCount = appliedSet.size;
  const hiddenCount = hiddenSet.size;

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
                {effectiveTotal.toLocaleString()}
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
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Search keywords, job titles, companies..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQuery(searchInput.trim())}
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

        <LocationFilterPopover
          value={locationState}
          onChange={(newLoc) => setLocationState(newLoc)}
        />

        <JobFunctionFilterPopover
          selectedFunctions={selectedFunctions}
          onChange={(fns) => setSelectedFunctions(fns)}
        />

        <DatePostedFilterPopover
          value={datePosted}
          onChange={(val) => setDatePosted(val)}
        />

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
            }).sort((a, b) => b.count - a.count),
          ]}
        />

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
          setSelectedFunctions(selectedFunctions.includes(tag) ? selectedFunctions.filter((f) => f !== tag) : [...selectedFunctions, tag]);
        };

        const isAiMlActive = selectedFunctions.includes("Machine Learning Engineer") || selectedFunctions.includes("AI Engineer");
        const toggleAiMl = () => {
          if (isAiMlActive) {
            setSelectedFunctions(selectedFunctions.filter((f) => f !== "Machine Learning Engineer" && f !== "AI Engineer"));
          } else {
            setSelectedFunctions([...selectedFunctions.filter((f) => f !== "Machine Learning Engineer" && f !== "AI Engineer"), "Machine Learning Engineer", "AI Engineer"]);
          }
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

            <button type="button" onClick={toggleAiMl} style={pillStyle(isAiMlActive)}>
              <BrainCircuit size={13} style={iconColor(isAiMlActive)} />
              AI / ML
            </button>

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
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
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
                    padding: "5px 14px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    cursor: "pointer",
                    transition: "all 0.15s",
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
              ? `We currently aggregate live jobs from Jobright, Greenhouse, Ashby, Lever, and Workday. You can also import any company career board URL directly.`
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
            <Link
              href="/import"
              className="btn-secondary"
              style={{ padding: "8px 16px", fontSize: 13, textDecoration: "none" }}
            >
              Import Company Board
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {displayedJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                index={index}
                isFocused={focusedIndex === index}
                isSaved={savedSet.has(job.id)}
                isApplied={appliedSet.has(job.id)}
                isHidden={hiddenSet.has(job.id)}
                isBulkMode={bulkMode}
                isBulkSelected={bulkSelectedIds.has(job.id)}
                onSelect={() => openJobModal(job)}
                onToggleSaved={toggleSaved}
                onToggleBulkSelect={toggleBulkSelect}
                onOpenCvModal={(j) => setCvModalJob(j)}
                onShowToast={showToast}
              />
            ))}
          </div>

          {bulkMode && (
            <BulkActionDock
              selectedCount={bulkSelectedIds.size}
              totalOnPage={displayedJobs.length}
              onSelectAll={handleSelectAllOnPage}
              onApplyAll={handleBulkApplyAll}
              onCancel={() => { setBulkMode(false); setBulkSelectedIds(new Set()); }}
            />
          )}
        </>
      )}

      {/* ── Persistent Pagination Bar (Stays visible across page transitions) ── */}
      {(totalPages > 1 || effectiveTotal > DEFAULT_PAGE_SIZE || page > 1) && !error && (
        <JobPagination
          page={page}
          totalPages={totalPages}
          totalJobs={effectiveTotal}
          loading={loading}
          onPageChange={handlePageChange}
        />
      )}

      {/* ── Job Modal ──────────────────── */}
      {selectedJob && (
        <JobModal
          job={fullJobData || selectedJob}
          isLoadingFullDetails={isLoadingFullJob}
          appliedSet={appliedSet}
          hiddenSet={hiddenSet}
          savedSet={savedSet}
          onClose={() => { setSelectedJob(null); setFullJobData(null); }}
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

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(16px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            background: toast.type === "success" ? "rgba(16, 185, 129, 0.18)" : toast.type === "warning" ? "rgba(245, 158, 11, 0.18)" : "rgba(59, 130, 246, 0.18)",
            border: `1px solid ${toast.type === "success" ? "rgba(16, 185, 129, 0.4)" : toast.type === "warning" ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.4)"}`,
            color: toast.type === "success" ? "#34d399" : toast.type === "warning" ? "#fbbf24" : "#60a5fa",
          }}
          className="animate-fade-in-up"
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
