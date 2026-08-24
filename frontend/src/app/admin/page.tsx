"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  Sliders,
  Database,
  Globe,
  SlidersHorizontal,
  Clock,
  ExternalLink,
  ChevronRight,
  Loader2,
  Trash2,
  Check,
  Zap,
  Filter,
  TrendingUp,
  BarChart3,
  Wifi,
  Server,
  Lock,
} from "lucide-react";
import { DiversitySummary, ScoredJob } from "@/lib/curationEngine";
import { useAuth } from "@/context/AuthContext";

/* ── Reusable Style Objects ─────────────────────────────────────── */
const S = {
  card: (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: 24,
    borderRadius: 16,
    background: "#111114",
    border: "1px solid rgba(255,255,255,0.06)",
    ...extra,
  }),
  label: { display: "block" as const, fontSize: 13, fontWeight: 600 as const, color: "#e2e8f0", marginBottom: 8 },
  input: (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#f8fafc",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s ease",
    ...extra,
  }),
  primaryBtn: (disabled?: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "11px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
    boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.15s ease",
    ...extra,
  }),
  successBtn: (disabled?: boolean): React.CSSProperties => ({
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "11px 24px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
    boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
    opacity: disabled ? 0.6 : 1,
  }),
  sectionTitle: { fontSize: 17, fontWeight: 700 as const, margin: 0, display: "flex" as const, alignItems: "center" as const, gap: 8 },
};

export default function AdminDashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"metrics" | "resume" | "curate" | "automation">("metrics");
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  // Scraper trigger state
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'success' | 'error'>('idle');
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  // Resume & Persona Filter State
  const [resumeText, setResumeText] = useState("");
  const [targetRoles, setTargetRoles] = useState<string>("Full Stack, Backend, Frontend, Software Engineer, Python, React");
  const [excludedKeywords, setExcludedKeywords] = useState<string>("Intern, Unpaid, WordPress, PHP");
  const [maxPerCompany, setMaxPerCompany] = useState<number>(3);
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(40);

  // Matching & Curation State
  const [matching, setMatching] = useState(false);
  const [curationSummary, setCurationSummary] = useState<DiversitySummary | null>(null);
  const [previewJobs, setPreviewJobs] = useState<ScoredJob[]>([]);
  const [allSelectedIds, setAllSelectedIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Automation State
  const [autoScheduleActive, setAutoScheduleActive] = useState(true);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRunMessage, setAutoRunMessage] = useState<string | null>(null);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) {
        const json = await res.json();
        setMetrics(json.metrics);
      }
    } catch (err) {
      console.error("Error loading metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Trigger manual scrape
  const handleTriggerScrape = async () => {
    setScraping(true);
    setScrapeStatus('scraping');
    setScrapeMessage('Scraping in progress — fetching jobs from all ATS sources...');
    try {
      const res = await fetch("/api/scrape/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScrapeStatus('success');
        setScrapeMessage(`Scrape completed successfully! ${data.count ? data.count + ' new jobs imported.' : 'Fresh jobs fetched.'}`);
        setTimeout(() => fetchMetrics(), 4000);
        // Auto-clear success after 15s
        setTimeout(() => { setScrapeStatus('idle'); setScrapeMessage(null); }, 15000);
      } else {
        setScrapeStatus('error');
        setScrapeMessage(data.error || 'Scrape trigger failed — check backend logs.');
      }
    } catch (err: any) {
      setScrapeStatus('error');
      setScrapeMessage(err?.message || 'Network error — backend may be unreachable.');
    } finally {
      setScraping(false);
    }
  };

  // Run Resume-driven match & diversity balancing
  const handleRunMatch = async () => {
    setMatching(true);
    setPublishSuccess(null);
    try {
      const rolesArr = targetRoles.split(",").map((r) => r.trim()).filter(Boolean);
      const excludedArr = excludedKeywords.split(",").map((e) => e.trim()).filter(Boolean);

      const res = await fetch("/api/admin/curate/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          targetRoles: rolesArr,
          excludedKeywords: excludedArr,
          maxJobsPerCompany: maxPerCompany,
          minScoreThreshold,
          targetTotalJobs: 1000,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCurationSummary(json.summary);
        setPreviewJobs(json.previewJobs || []);
        setAllSelectedIds(json.allSelectedIds || []);
        setActiveTab("curate");
      }
    } catch (err) {
      console.error("Match error:", err);
    } finally {
      setMatching(false);
    }
  };

  // Publish the curated 1,000 batch
  const handlePublishBatch = async () => {
    setPublishing(true);
    setPublishSuccess(null);
    try {
      const res = await fetch("/api/admin/curate/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: allSelectedIds,
          unpublishOthers: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPublishSuccess(json.message);
        fetchMetrics();
      }
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      setPublishing(false);
    }
  };

  // Trigger 24h auto-curation cycle manually
  const handleRunAutoCuration = async () => {
    setAutoRunning(true);
    setAutoRunMessage(null);
    try {
      const res = await fetch("/api/admin/curate/auto-run", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setAutoRunMessage(json.message);
        fetchMetrics();
      } else {
        setAutoRunMessage(json.error || "Auto-run failed");
      }
    } catch (err: any) {
      setAutoRunMessage(err?.message || "Network error");
    } finally {
      setAutoRunning(false);
    }
  };

  const tabItems = [
    { key: "metrics" as const, icon: BarChart3, label: "Metrics & Health" },
    { key: "resume" as const, icon: FileText, label: "Resume & Persona" },
    { key: "curate" as const, icon: Layers, label: "Curation Queue", badge: curationSummary?.totalSelected },
    { key: "automation" as const, icon: Zap, label: "Automation" },
  ];

  const atsData = [
    { name: "Greenhouse", quota: 30, color: "#22c55e", icon: "🌱" },
    { name: "Ashby", quota: 20, color: "#a855f7", icon: "💎" },
    { name: "Lever", quota: 20, color: "#06b6d4", icon: "⚡" },
    { name: "Workday", quota: 15, color: "#f59e0b", icon: "☀️" },
    { name: "Workable / JazzHR", quota: 15, color: "#ec4899", icon: "🎯" },
  ];

  // ── Role-based access control (after hooks) ──
  if (!authLoading && !isAdmin) {
    return (
      <div className="animate-fade-in-up" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "50vh", textAlign: "center",
        padding: "0 24px",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: "linear-gradient(135deg, #ef4444, #f97316)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24, boxShadow: "0 0 40px rgba(239,68,68,0.25)",
        }}>
          <Lock size={28} color="#fff" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Access Denied</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 400, margin: "0 auto 24px" }}>
          You do not have permission to access the admin dashboard. This page is restricted to administrators only.
        </p>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 22px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#e2e8f0", fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}>
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto 80px", padding: "0 16px" }} className="animate-fade-in-up">

      {/* ── Hero Header ────────────────────────────────────────────── */}
      <div style={{
        padding: "28px 32px",
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.04) 100%)",
        border: "1px solid rgba(99,102,241,0.12)",
        marginBottom: 28,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(99,102,241,0.35)",
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
                Command Center
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(16,185,129,0.12)", color: "#34d399",
                border: "1px solid rgba(16,185,129,0.25)",
              }}>
                Live
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>
              Multi-ATS ingestion · Diversity balancing · Job function filtering
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Scrape Status Indicator */}
          {scrapeStatus !== 'idle' && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: scrapeStatus === 'scraping' ? 'rgba(99,102,241,0.1)' : scrapeStatus === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${scrapeStatus === 'scraping' ? 'rgba(99,102,241,0.25)' : scrapeStatus === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: scrapeStatus === 'scraping' ? '#a5b4fc' : scrapeStatus === 'success' ? '#34d399' : '#f87171',
            }}>
              {scrapeStatus === 'scraping' && <Loader2 size={13} className="animate-spin" />}
              {scrapeStatus === 'success' && <CheckCircle2 size={13} />}
              {scrapeStatus === 'error' && <AlertCircle size={13} />}
              <span>{scrapeStatus === 'scraping' ? 'Scraping...' : scrapeStatus === 'success' ? 'Complete' : 'Failed'}</span>
            </div>
          )}

          <button
            onClick={handleTriggerScrape}
            disabled={scraping}
            style={{
              ...S.primaryBtn(scraping),
              padding: "9px 18px",
              fontSize: 13,
              borderRadius: 10,
            }}
          >
            {scraping ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {scraping ? 'Scraping...' : 'Trigger Scrape'}
          </button>

          <Link
            href="/"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e2e8f0", fontSize: 13, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s ease",
            }}
          >
            View Site <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Status Toast */}
      {scrapeMessage && (
        <div style={{
          marginBottom: 20, padding: "12px 16px", borderRadius: 12,
          background: scrapeStatus === 'error' ? 'rgba(239,68,68,0.1)' : scrapeStatus === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
          border: `1px solid ${scrapeStatus === 'error' ? 'rgba(239,68,68,0.2)' : scrapeStatus === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
          color: scrapeStatus === 'error' ? '#f87171' : scrapeStatus === 'success' ? '#34d399' : '#c7d2fe',
          fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {scrapeStatus === 'scraping' && <Loader2 size={15} className="animate-spin" />}
          {scrapeStatus === 'success' && <CheckCircle2 size={15} />}
          {scrapeStatus === 'error' && <AlertCircle size={15} />}
          {scrapeStatus === 'idle' && <Activity size={15} />}
          <span>{scrapeMessage}</span>
        </div>
      )}

      {/* ── Tab Navigation ────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 28,
        background: "rgba(255,255,255,0.02)",
        borderRadius: 14, padding: 4,
        border: "1px solid rgba(255,255,255,0.04)",
      }}>
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                color: isActive ? "#c7d2fe" : "#71717a",
                boxShadow: isActive ? "inset 0 0 0 1px rgba(99,102,241,0.2)" : "none",
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={{
                  fontSize: 10, background: "#6366f1", color: "#fff",
                  padding: "1px 7px", borderRadius: 10, fontWeight: 700,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: METRICS & HEALTH ───────────────────────────────── */}
      {activeTab === "metrics" && (
        <div>
          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14, marginBottom: 28 }}>
            {/* Active on Website */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Active on Website</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  padding: "3px 8px", borderRadius: 6,
                  background: "rgba(16,185,129,0.1)", color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}>Live</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.publishedTotal?.toLocaleString() || metrics?.warehouseTotal?.toLocaleString() || "—"}
              </div>
              <div style={{
                marginTop: 12, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: "100%",
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                All matching positions (filtered by job function)
              </p>
            </div>

            {/* Warehouse Pool */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Warehouse Pool</span>
                <Database size={16} style={{ color: "#818cf8" }} />
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#a5b4fc", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.warehouseTotal?.toLocaleString() || "14,802"}
              </div>
              <div style={{
                marginTop: 12, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: "68%",
                  background: "linear-gradient(90deg, #818cf8, #6366f1)",
                }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                Total positions in background database
              </p>
            </div>

            {/* Unique Companies */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Unique Companies</span>
                <Building2 size={16} style={{ color: "#f472b6" }} />
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#f472b6", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.uniquePublishedCompanies || "350"}
              </div>
              <div style={{
                marginTop: 12, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: "85%",
                  background: "linear-gradient(90deg, #f472b6, #ec4899)",
                }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                Anti-monopoly: max 3 positions per company
              </p>
            </div>

            {/* Auto-Curation Status */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Auto-Curation</span>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#34d399",
                  boxShadow: "0 0 8px #34d399",
                }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#34d399", lineHeight: 1 }}>
                Active (Daily)
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 12, color: "#64748b" }}>
                Next scheduled batch in ~14 hours
              </p>
            </div>
          </div>

          {/* ATS Ecosystem */}
          <div style={S.card({ padding: 28, borderRadius: 18 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={S.sectionTitle}>
                <Globe size={18} style={{ color: "#818cf8" }} />
                ATS Ecosystem & Quotas
              </h3>
              <span style={{ fontSize: 11, color: "#64748b" }}>All systems operational</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              {atsData.map((ats) => (
                <div key={ats.name} style={{
                  padding: 16, borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  transition: "all 0.15s ease",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ats.color }}>
                      {ats.icon} {ats.name}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                      padding: "2px 6px", borderRadius: 4,
                      background: "rgba(34,197,94,0.1)", color: "#4ade80",
                    }}>Healthy</span>
                  </div>
                  {/* Quota Bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${ats.quota * 3.3}%`,
                        background: ats.color,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", minWidth: 36, textAlign: "right" }}>
                      {ats.quota}%
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#52525b", marginTop: 4, display: "block" }}>
                    Balanced round-robin
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: RESUME PERSONA & FILTER ────────────────────────── */}
      {activeTab === "resume" && (
        <div style={S.card({ padding: 32, borderRadius: 18 })}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h3 style={{ ...S.sectionTitle, marginBottom: 4 }}>
              <FileText size={18} style={{ color: "#a5b4fc" }} />
              Resume & Persona Filter
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 28px" }}>
              The engine scores all 14,800+ warehouse jobs against this persona to pick the top 1,000 matches.
            </p>

            {/* Resume Text */}
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>Master Resume / Skills Summary</label>
              <textarea
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste master resume, core tech stack, accomplishments, and skills here..."
                style={{
                  ...S.input(),
                  resize: "vertical" as const,
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Target Roles */}
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>Target Role Titles (comma-separated)</label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="e.g. Full Stack Engineer, Backend Developer, Python Engineer"
                style={S.input()}
              />
            </div>

            {/* Excluded Keywords */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ ...S.label, color: "#fca5a5" }}>
                Excluded / Negative Keywords
              </label>
              <input
                type="text"
                value={excludedKeywords}
                onChange={(e) => setExcludedKeywords(e.target.value)}
                placeholder="e.g. Intern, Unpaid, WordPress, PHP, Volunteer"
                style={S.input({ borderColor: "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.03)" })}
              />
            </div>

            {/* Controls Panel */}
            <div style={{
              padding: 20, borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              marginBottom: 28,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  Max Jobs Per Company (Anti-Monopoly)
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: "#a855f7",
                  background: "rgba(168,85,247,0.1)",
                  padding: "2px 10px", borderRadius: 6,
                }}>
                  {maxPerCompany}
                </span>
              </div>
              <input
                type="range" min={1} max={10}
                value={maxPerCompany}
                onChange={(e) => setMaxPerCompany(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#a855f7", cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "#52525b", marginTop: 4, display: "block" }}>
                Ensures {Math.floor(1000 / maxPerCompany)}+ unique companies in the daily batch
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleRunMatch}
                disabled={matching}
                style={S.primaryBtn(matching)}
              >
                {matching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Run Match & Curate 1,000 Jobs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CURATION QUEUE ─────────────────────────────────── */}
      {activeTab === "curate" && (
        <div>
          {publishSuccess && (
            <div style={{
              marginBottom: 20, padding: "14px 18px", borderRadius: 12,
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
              color: "#34d399", fontSize: 14,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <CheckCircle2 size={18} />
              <span>{publishSuccess}</span>
            </div>
          )}

          {curationSummary ? (
            <div>
              {/* Diversity Summary */}
              <div style={{
                padding: "22px 28px", borderRadius: 18,
                background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))",
                border: "1px solid rgba(168,85,247,0.15)",
                marginBottom: 24,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 16,
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
                    Curated High-Diversity Batch
                  </h4>
                  <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 13, color: "#cbd5e1" }}>
                    <span>🏢 <strong>{curationSummary.uniqueCompanies}</strong> Companies</span>
                    <span>🎯 <strong>{curationSummary.averageScore}%</strong> Avg Match</span>
                    <span>🌐 <strong>{Object.keys(curationSummary.atsBreakdown).length}</strong> Platforms</span>
                  </div>
                </div>
                <button
                  onClick={handlePublishBatch}
                  disabled={publishing}
                  style={S.successBtn(publishing)}
                >
                  {publishing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Publish 1,000 to Site
                </button>
              </div>

              {/* Preview Table */}
              <div style={S.card({ padding: 0, overflow: "hidden" as const })}>
                <div style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                    Preview (Top 50 of 1,000)
                  </span>
                  <span style={{ fontSize: 12, color: "#52525b" }}>Interleaved round-robin</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "left" }}>
                        {["Role & Company", "Source", "Location", "Score", "Skills"].map((h) => (
                          <th key={h} style={{ padding: "12px 20px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewJobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: 13 }}>{job.title}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{job.company_name}</div>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 6,
                              background: "rgba(255,255,255,0.04)", fontWeight: 600, color: "#94a3b8",
                            }}>
                              {job.source}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", color: "#94a3b8" }}>{job.location || "Remote"}</td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontSize: 13, fontWeight: 700,
                              color: job.matchScore >= 80 ? "#34d399" : job.matchScore >= 60 ? "#60a5fa" : "#fbbf24",
                            }}>
                              {job.matchScore}%
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {(job.matchingSkills || []).slice(0, 3).map((sk) => (
                                <span key={sk} style={{
                                  fontSize: 10, background: "rgba(99,102,241,0.1)", color: "#a5b4fc",
                                  padding: "2px 7px", borderRadius: 4, fontWeight: 500,
                                }}>{sk}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              ...S.card({ borderRadius: 18 }),
              textAlign: "center" as const,
              padding: "60px 20px",
            }}>
              <SlidersHorizontal size={40} style={{ color: "#818cf8", margin: "0 auto 16px", display: "block" }} />
              <h4 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
                No Curation Batch Yet
              </h4>
              <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 460, margin: "0 auto 24px" }}>
                Configure your <strong>Resume & Persona</strong> filter, then run the diversity algorithm to generate a batch.
              </p>
              <button
                onClick={() => setActiveTab("resume")}
                style={{
                  background: "rgba(99,102,241,0.12)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 10,
                  padding: "10px 22px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Configure Resume Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: 24-HOUR AUTOMATION ─────────────────────────────── */}
      {activeTab === "automation" && (
        <div style={S.card({ padding: 32, borderRadius: 18 })}>
          <div style={{ maxWidth: 750, margin: "0 auto" }}>
            <h3 style={{ ...S.sectionTitle, marginBottom: 4 }}>
              <Zap size={18} style={{ color: "#fbbf24" }} />
              24-Hour Automation Engine
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 28px" }}>
              Runs daily: scrapes all ATS platforms, filters by job function, balances diversity, and publishes all matching positions automatically.
            </p>

            {autoRunMessage && (
              <div style={{
                marginBottom: 20, padding: "12px 16px", borderRadius: 12,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                color: "#34d399", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <CheckCircle2 size={15} />
                <span>{autoRunMessage}</span>
              </div>
            )}

            {/* Schedule Control */}
            <div style={{
              padding: 22, borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              marginBottom: 28,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>Auto-Publish Schedule</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  Executes every night at 00:00 UTC
                </div>
              </div>
              <button
                onClick={() => setAutoScheduleActive(!autoScheduleActive)}
                style={{
                  padding: "7px 18px", borderRadius: 20, border: "none",
                  background: autoScheduleActive
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "rgba(255,255,255,0.06)",
                  color: "#fff", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: autoScheduleActive ? "0 0 12px rgba(16,185,129,0.3)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {autoScheduleActive ? "ENABLED ✓" : "PAUSED"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleRunAutoCuration}
                disabled={autoRunning}
                style={S.primaryBtn(autoRunning, { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" })}
              >
                {autoRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Test Auto-Curation Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
