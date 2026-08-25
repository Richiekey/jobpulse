"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Clock,
  ExternalLink,
  Loader2,
  Trash2,
  Plus,
  Zap,
  Filter,
  TrendingUp,
  BarChart3,
  Wifi,
  Server,
  Lock,
  Search,
  Check,
  RotateCcw,
  ArrowUpRight,
  Upload,
  Cpu,
  Terminal,
  BrainCircuit,
  ShieldAlert,
  Palette,
  LineChart,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ── Reusable Theme & Glassmorphic Styles ───────────────────────── */
const S = {
  card: (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: 24,
    borderRadius: 16,
    background: "#111114",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
    ...extra,
  }),
  label: {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 700 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#94a3b8",
    marginBottom: 8,
  },
  input: (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%",
    padding: "10px 14px",
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
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
    boxShadow: "0 4px 16px rgba(99,102,241,0.25)",
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.15s ease",
    ...extra,
  }),
  secondaryBtn: (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "rgba(255,255,255,0.04)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "inherit",
    transition: "all 0.15s ease",
    ...extra,
  }),
  badge: (color = "#818cf8", bg = "rgba(99,102,241,0.1)"): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color,
    background: bg,
    border: `1px solid ${color}33`,
  }),
};

interface JobFunctionCategory {
  id: string;
  categoryName: string;
  iconName?: string;
  subFunctions: string[];
  patterns: string[];
}

export default function AdminDashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "functions" | "automation">("dashboard");
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  // Scraper Trigger & Status State
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "scraping" | "success" | "error">("idle");
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  // Job Functions Editor State
  const [categories, setCategories] = useState<JobFunctionCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoriesSavedMessage, setCategoriesSavedMessage] = useState<string | null>(null);
  const [searchFilterQuery, setSearchFilterQuery] = useState("");
  const [newSubFunctionInputs, setNewSubFunctionInputs] = useState<Record<string, string>>({});
  const [newPatternInputs, setNewPatternInputs] = useState<Record<string, string>>({});

  // Fetch metrics data
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) {
        const json = await res.json();
        setMetrics(json.metrics);
      }
    } catch (err) {
      console.error("Error loading admin metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch job functions
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/admin/job-functions");
      if (res.ok) {
        const json = await res.json();
        if (json.categories) {
          setCategories(json.categories);
        }
      }
    } catch (err) {
      console.error("Error loading job functions:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchCategories();
  }, [fetchMetrics, fetchCategories]);

  // Handle Manual Scraper Execution
  const handleTriggerScrape = async () => {
    setScraping(true);
    setScrapeStatus("scraping");
    setScrapeMessage("Scraping in progress — ingesting active jobs from all connected ATS sources...");
    try {
      const res = await fetch("/api/scrape/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScrapeStatus("success");
        setScrapeMessage(
          data.message || `Scrape successfully triggered! Running ingest pipeline.`
        );
        // Refresh metrics after a short wait for new rows
        setTimeout(() => fetchMetrics(), 4000);
        setTimeout(() => {
          setScrapeStatus("idle");
          setScrapeMessage(null);
        }, 15000);
      } else {
        setScrapeStatus("error");
        setScrapeMessage(data.error || "Scrape trigger returned an error response.");
      }
    } catch (err: any) {
      setScrapeStatus("error");
      setScrapeMessage(err?.message || "Network error when attempting to contact scraper.");
    } finally {
      setScraping(false);
    }
  };

  // Job Functions Helpers: Add & Remove SubFunctions / Patterns
  const handleAddSubFunction = (catId: string) => {
    const text = (newSubFunctionInputs[catId] || "").trim();
    if (!text) return;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId && !c.subFunctions.includes(text)) {
          return { ...c, subFunctions: [...c.subFunctions, text] };
        }
        return c;
      })
    );
    setNewSubFunctionInputs((prev) => ({ ...prev, [catId]: "" }));
  };

  const handleRemoveSubFunction = (catId: string, item: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          return { ...c, subFunctions: c.subFunctions.filter((s) => s !== item) };
        }
        return c;
      })
    );
  };

  const handleAddPattern = (catId: string) => {
    let text = (newPatternInputs[catId] || "").trim();
    if (!text) return;
    if (!text.startsWith("*")) text = `*${text}`;
    if (!text.endsWith("*")) text = `${text}*`;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId && !c.patterns.includes(text)) {
          return { ...c, patterns: [...c.patterns, text] };
        }
        return c;
      })
    );
    setNewPatternInputs((prev) => ({ ...prev, [catId]: "" }));
  };

  const handleRemovePattern = (catId: string, pattern: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          return { ...c, patterns: c.patterns.filter((p) => p !== pattern) };
        }
        return c;
      })
    );
  };

  const handleSaveCategories = async () => {
    setSavingCategories(true);
    setCategoriesSavedMessage(null);
    try {
      const res = await fetch("/api/admin/job-functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      if (res.ok) {
        setCategoriesSavedMessage("Job functions and keyword patterns saved successfully!");
        setTimeout(() => setCategoriesSavedMessage(null), 6000);
      }
    } catch (err: any) {
      console.error("Error saving categories:", err);
    } finally {
      setSavingCategories(false);
    }
  };

  const handleResetCategories = async () => {
    if (!confirm("Are you sure you want to reset all job functions to system defaults?")) return;
    setSavingCategories(true);
    try {
      const res = await fetch("/api/admin/job-functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        setCategoriesSavedMessage("Reset to default categories!");
        setTimeout(() => setCategoriesSavedMessage(null), 6000);
      }
    } catch (err) {
      console.error("Error resetting categories:", err);
    } finally {
      setSavingCategories(false);
    }
  };

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchFilterQuery.trim()) return categories;
    const q = searchFilterQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.categoryName.toLowerCase().includes(q) ||
        c.subFunctions.some((s) => s.toLowerCase().includes(q)) ||
        c.patterns.some((p) => p.toLowerCase().includes(q))
    );
  }, [categories, searchFilterQuery]);

  // Auth Guard
  if (authLoading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "#818cf8" }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 480, margin: "100px auto", textAlign: "center", padding: 32, ...S.card() }}>
        <Lock size={40} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Administrator Access Required</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 24px" }}>
          You must be signed in as an administrator to access the Command Center.
        </p>
        <Link href="/" style={S.primaryBtn()}>
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const tabItems = [
    { key: "dashboard" as const, label: "Overview & Ecosystem", icon: BarChart3 },
    {
      key: "functions" as const,
      label: "Job Functions & Filter Rules",
      icon: Sliders,
      badge: categories.reduce((acc, c) => acc + c.subFunctions.length, 0),
    },
    { key: "automation" as const, label: "Ingestion & Automation", icon: Zap },
  ];

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* ── Command Center Header ────────────────────────────────────── */}
      <div
        style={{
          padding: "24px 28px",
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(99,102,241,0.09) 0%, rgba(168,85,247,0.04) 100%)",
          border: "1px solid rgba(99,102,241,0.14)",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 25px rgba(99,102,241,0.3)",
            }}
          >
            <ShieldCheck size={26} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
                Command Center
              </h1>
              <span style={S.badge("#34d399", "rgba(16,185,129,0.12)")}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#34d399",
                    boxShadow: "0 0 6px #34d399",
                  }}
                />
                Live System
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>
              Multi-ATS Job Aggregator · Real-Time Ingestion · Function-Filtered Liquidity
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Dynamic Scrape Progress Indicator */}
          {scrapeStatus !== "idle" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                background:
                  scrapeStatus === "scraping"
                    ? "rgba(99,102,241,0.12)"
                    : scrapeStatus === "success"
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(239,68,68,0.12)",
                border: `1px solid ${
                  scrapeStatus === "scraping"
                    ? "rgba(99,102,241,0.25)"
                    : scrapeStatus === "success"
                    ? "rgba(16,185,129,0.25)"
                    : "rgba(239,68,68,0.25)"
                }`,
                color:
                  scrapeStatus === "scraping"
                    ? "#a5b4fc"
                    : scrapeStatus === "success"
                    ? "#34d399"
                    : "#f87171",
              }}
            >
              {scrapeStatus === "scraping" && <Loader2 size={14} className="animate-spin" />}
              {scrapeStatus === "success" && <CheckCircle2 size={14} />}
              {scrapeStatus === "error" && <AlertCircle size={14} />}
              <span>
                {scrapeStatus === "scraping"
                  ? "Scraping ATS..."
                  : scrapeStatus === "success"
                  ? "Scrape Triggered"
                  : "Scrape Failed"}
              </span>
            </div>
          )}

          <button
            onClick={handleTriggerScrape}
            disabled={scraping}
            style={S.primaryBtn(scraping, {
              padding: "9px 18px",
              fontSize: 13,
            })}
          >
            {scraping ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {scraping ? "Scraping..." : "Trigger Scrape"}
          </button>

          <Link href="/import" style={S.secondaryBtn()}>
            <Upload size={13} /> Import
          </Link>

          <Link href="/" style={S.secondaryBtn()}>
            View Site <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Scrape Toast Notification */}
      {scrapeMessage && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 12,
            background:
              scrapeStatus === "error"
                ? "rgba(239,68,68,0.1)"
                : scrapeStatus === "success"
                ? "rgba(16,185,129,0.1)"
                : "rgba(99,102,241,0.1)",
            border: `1px solid ${
              scrapeStatus === "error"
                ? "rgba(239,68,68,0.2)"
                : scrapeStatus === "success"
                ? "rgba(16,185,129,0.2)"
                : "rgba(99,102,241,0.2)"
            }`,
            color:
              scrapeStatus === "error"
                ? "#f87171"
                : scrapeStatus === "success"
                ? "#34d399"
                : "#c7d2fe",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {scrapeStatus === "scraping" && <Loader2 size={16} className="animate-spin" />}
            {scrapeStatus === "success" && <CheckCircle2 size={16} />}
            {scrapeStatus === "error" && <AlertCircle size={16} />}
            <span>{scrapeMessage}</span>
          </div>
          <button
            onClick={() => setScrapeMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              opacity: 0.7,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Navigation Tabs ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 24,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 14,
          padding: 5,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
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
                gap: 8,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                color: isActive ? "#c7d2fe" : "#71717a",
                boxShadow: isActive ? "inset 0 0 0 1px rgba(99,102,241,0.25)" : "none",
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background: isActive ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
                    color: isActive ? "#fff" : "#a1a1aa",
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & ECOSYSTEM ────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* 4 Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {/* Active on Website */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={S.label}>Active Live Jobs</span>
                <span style={S.badge("#34d399", "rgba(16,185,129,0.1)")}>Live</span>
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.activeTotal ? metrics.activeTotal.toLocaleString() : metrics?.warehouseTotal?.toLocaleString() || "..."}
              </div>
              <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ height: "100%", borderRadius: 2, width: "100%", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                Filtered tech & business roles visible on marketplace
              </p>
            </div>

            {/* Warehouse Pool */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={S.label}>Total Warehouse Pool</span>
                <Database size={15} style={{ color: "#818cf8" }} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#a5b4fc", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.warehouseTotal ? metrics.warehouseTotal.toLocaleString() : "..."}
              </div>
              <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ height: "100%", borderRadius: 2, width: "100%", background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                Total accumulated jobs across all raw ATS ingestions
              </p>
            </div>

            {/* Unique Companies */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={S.label}>Hiring Employers</span>
                <Building2 size={15} style={{ color: "#f472b6" }} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#f472b6", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.uniqueCompanies ? metrics.uniqueCompanies.toLocaleString() : "..."}
              </div>
              <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ height: "100%", borderRadius: 2, width: "100%", background: "linear-gradient(90deg, #ec4899, #f472b6)" }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                Distinct company brands hiring across all active roles
              </p>
            </div>

            {/* Ingestion Channels */}
            <div style={S.card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={S.label}>Active Ingestion Channels</span>
                <Wifi size={15} style={{ color: "#38bdf8" }} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#38bdf8", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {metrics?.sourceBreakdown ? Object.keys(metrics.sourceBreakdown).length : 6} Sources
              </div>
              <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ height: "100%", borderRadius: 2, width: "100%", background: "linear-gradient(90deg, #0284c7, #38bdf8)" }} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                All ATS connectors operating normally
              </p>
            </div>
          </div>

          {/* ATS Ecosystem & Quotas */}
          <div style={S.card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Globe size={18} style={{ color: "#818cf8" }} />
                  ATS Ecosystem & Live Source Breakdown
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                  Active job distributions and health status per ATS board
                </p>
              </div>
              <button onClick={fetchMetrics} style={S.secondaryBtn({ padding: "6px 12px", fontSize: 12 })}>
                <RefreshCw size={12} className={loadingMetrics ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {/* Grid of Sources */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {[
                { name: "JOBRIGHT", label: "Jobright Direct", color: "#3b82f6" },
                { name: "GREENHOUSE", label: "Greenhouse", color: "#10b981" },
                { name: "ASHBY", label: "Ashby", color: "#a855f7" },
                { name: "LEVER", label: "Lever", color: "#06b6d4" },
                { name: "WORKDAY", label: "Workday", color: "#f59e0b" },
                { name: "WORKABLE", label: "Workable / JazzHR", color: "#ef4444" },
                { name: "APPLYTOJOB", label: "ApplyToJob", color: "#ec4899" },
                { name: "JOBVITE", label: "Jobvite", color: "#14b8a6" },
              ].map((src) => {
                const count = metrics?.sourceBreakdown?.[src.name] || 0;
                const allSourcesTotal = Object.values(metrics?.sourceBreakdown || {}).reduce((a: any, b: any) => a + Number(b), 0) as number || metrics?.activeTotal || 1;
                const pct = Math.min(100, Math.round((count / Math.max(allSourcesTotal, 1)) * 100)) || (count > 0 ? 1 : 0);
                const health = metrics?.sourcesHealth?.[src.name];
                const isHealthy = count > 0 || health?.status === "HEALTHY";

                return (
                  <div
                    key={src.name}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{src.label}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: isHealthy ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                          color: isHealthy ? "#34d399" : "#94a3b8",
                          border: `1px solid ${isHealthy ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        {isHealthy ? "ACTIVE" : "IDLE"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                        {count.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{pct}%</span>
                    </div>

                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          width: `${Math.min(pct, 100)}%`,
                          background: src.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real Scraper Runs Execution History */}
          <div style={S.card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={18} style={{ color: "#38bdf8" }} />
                  Live Ingestion Run History
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                  Chronological log of recent scraper execution runs recorded in database
                </p>
              </div>
              <span style={S.badge("#38bdf8", "rgba(56,189,248,0.1)")}>
                {metrics?.recentRuns?.length || 0} Recent Runs
              </span>
            </div>

            {metrics?.recentRuns && metrics.recentRuns.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600 }}>Source</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600 }}>Started At</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>Jobs Found</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>Jobs Inserted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentRuns.map((run: any, idx: number) => {
                      const isSuccess = run.status === "SUCCESS";
                      return (
                        <tr
                          key={run.id || idx}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.1s ease",
                          }}
                        >
                          <td style={{ padding: "12px 14px", fontWeight: 700, color: "#f8fafc" }}>
                            {run.source}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: isSuccess ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                                color: isSuccess ? "#34d399" : "#f87171",
                                border: `1px solid ${isSuccess ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                              }}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#94a3b8" }}>
                            {new Date(run.started_at).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", color: "#e2e8f0", fontWeight: 600 }}>
                            {run.jobs_found}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", color: "#34d399", fontWeight: 700 }}>
                            +{run.jobs_inserted}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
                No recent source runs recorded. Trigger a scrape to log runs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: JOB FUNCTIONS & FILTER RULES (EDITABLE) ─────────── */}
      {activeTab === "functions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              ...S.card(),
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                <Sliders size={20} style={{ color: "#818cf8" }} />
                Configurable Job Functions & Relevance Patterns
              </h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                Configure the active job roles, sub-functions, and title match patterns that drive the website&apos;s auto-filtering.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 240 }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Search rules & roles..."
                  value={searchFilterQuery}
                  onChange={(e) => setSearchFilterQuery(e.target.value)}
                  style={S.input({ paddingLeft: 34 })}
                />
              </div>

              <button onClick={handleResetCategories} style={S.secondaryBtn()}>
                <RotateCcw size={13} /> Reset Defaults
              </button>

              <button onClick={handleSaveCategories} disabled={savingCategories} style={S.primaryBtn(savingCategories)}>
                {savingCategories ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Filter Rules
              </button>
            </div>
          </div>

          {/* Success message */}
          {categoriesSavedMessage && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#34d399",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} />
              <span>{categoriesSavedMessage}</span>
            </div>
          )}

          {/* Categories Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
            {filteredCategories.map((cat) => (
              <div key={cat.id} style={S.card({ display: "flex", flexDirection: "column", gap: 16 })}>
                {/* Category Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: "rgba(99,102,241,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#818cf8",
                      }}
                    >
                      <Terminal size={17} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                        {cat.categoryName}
                      </h4>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {cat.subFunctions.length} roles · {cat.patterns.length} match patterns
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-functions / Titles */}
                <div>
                  <span style={S.label}>Active Sub-Functions & Titles:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {cat.subFunctions.map((sub) => (
                      <span
                        key={sub}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#e2e8f0",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {sub}
                        <button
                          onClick={() => handleRemoveSubFunction(cat.id, sub)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add SubFunction input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Add role (e.g. Rust Developer)..."
                      value={newSubFunctionInputs[cat.id] || ""}
                      onChange={(e) =>
                        setNewSubFunctionInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSubFunction(cat.id);
                      }}
                      style={S.input({ fontSize: 12, padding: "7px 10px" })}
                    />
                    <button
                      onClick={() => handleAddSubFunction(cat.id)}
                      style={S.secondaryBtn({ padding: "7px 12px", fontSize: 12 })}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>

                {/* Title Wildcard Match Patterns */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                  <span style={S.label}>SQL Wildcard Patterns (*Keyword*):</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {cat.patterns.map((pat) => (
                      <span
                        key={pat}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(99,102,241,0.1)",
                          border: "1px solid rgba(99,102,241,0.2)",
                          color: "#c7d2fe",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {pat}
                        <button
                          onClick={() => handleRemovePattern(cat.id, pat)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#818cf8",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Pattern input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Add pattern (e.g. *Rust*)..."
                      value={newPatternInputs[cat.id] || ""}
                      onChange={(e) =>
                        setNewPatternInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddPattern(cat.id);
                      }}
                      style={S.input({ fontSize: 12, padding: "7px 10px", fontFamily: "monospace" })}
                    />
                    <button
                      onClick={() => handleAddPattern(cat.id)}
                      style={S.secondaryBtn({ padding: "7px 12px", fontSize: 12 })}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: INGESTION & AUTOMATION ──────────────────────────── */}
      {activeTab === "automation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* GitHub Actions Scheduled Ingestion Engine */}
          <div style={S.card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={20} style={{ color: "#fbbf24" }} />
                  Automated Multi-ATS Ingestion Engine
                </h3>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                  Automated scraping workflow executing across all supported ATS boards on a 6-hour cron schedule.
                </p>
              </div>
              <span style={S.badge("#34d399", "rgba(16,185,129,0.12)")}>
                <CheckCircle2 size={12} /> Scheduled (0 */6 * * *)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Clock size={16} style={{ color: "#818cf8" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>GitHub Actions Cron</span>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Workflow <code>.github/workflows/scrape.yml</code> runs automatically every 6 hours to fetch fresh postings.
                </p>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  Schedule: <strong>00:00, 06:00, 12:00, 18:00 UTC</strong>
                </div>
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Server size={16} style={{ color: "#38bdf8" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>On-Demand Dispatch</span>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Trigger an immediate scrape pass via GitHub Actions dispatch or backend webhook.
                </p>
                <button
                  onClick={handleTriggerScrape}
                  disabled={scraping}
                  style={S.primaryBtn(scraping, { padding: "7px 14px", fontSize: 12 })}
                >
                  {scraping ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  Run Scrape Now
                </button>
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Upload size={16} style={{ color: "#f472b6" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>Direct CSV / JSON Import</span>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Manually upload batch job listings or paste JSON directly into Supabase.
                </p>
                <Link href="/import" style={S.secondaryBtn({ padding: "7px 14px", fontSize: 12 })}>
                  Open Importer <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
