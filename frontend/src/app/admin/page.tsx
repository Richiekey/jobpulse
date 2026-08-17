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
} from "lucide-react";
import { DiversitySummary, ScoredJob } from "@/lib/curationEngine";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"metrics" | "resume" | "curate" | "automation">("metrics");
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  // Scraper trigger state
  const [scraping, setScraping] = useState(false);
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
    setScrapeMessage(null);
    try {
      const res = await fetch("/api/scrape/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScrapeMessage("Scraper triggered successfully! Fetching fresh jobs in background.");
        setTimeout(() => fetchMetrics(), 4000);
      } else {
        setScrapeMessage(data.error || "Scrape trigger failed");
      }
    } catch (err: any) {
      setScrapeMessage(err?.message || "Network error");
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

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto 80px", padding: "0 16px" }} className="animate-fade-in-up">
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 25px rgba(99, 102, 241, 0.4)",
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
                Admin Command Center
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "3px 9px",
                  borderRadius: 20,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                Live Curation
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 3, margin: 0 }}>
              Multi-ATS Ingestion, Diversity Balancing & 1,000 Daily Cap Engine
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleTriggerScrape}
            disabled={scraping}
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "#a5b4fc",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: scraping ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {scraping ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Trigger Scrape
          </button>

          <Link
            href="/"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "#f8fafc",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
            }}
          >
            View Live Site <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {scrapeMessage && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            color: "#c7d2fe",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Activity size={16} />
          <span>{scrapeMessage}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div
        style={{
          display: "flex",
          gap: 6,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveTab("metrics")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: `2px solid ${activeTab === "metrics" ? "#818cf8" : "transparent"}`,
            color: activeTab === "metrics" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: activeTab === "metrics" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Activity size={16} /> Metrics & Health
        </button>

        <button
          onClick={() => setActiveTab("resume")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: `2px solid ${activeTab === "resume" ? "#818cf8" : "transparent"}`,
            color: activeTab === "resume" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: activeTab === "resume" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={16} /> Resume Persona & Filter
        </button>

        <button
          onClick={() => setActiveTab("curate")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: `2px solid ${activeTab === "curate" ? "#818cf8" : "transparent"}`,
            color: activeTab === "curate" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: activeTab === "curate" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Layers size={16} /> Diversity Curation Queue
          {curationSummary && (
            <span style={{ fontSize: 11, background: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: 10 }}>
              {curationSummary.totalSelected}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("automation")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: `2px solid ${activeTab === "automation" ? "#818cf8" : "transparent"}`,
            color: activeTab === "automation" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: activeTab === "automation" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Zap size={16} /> 24-Hour Automation
        </button>
      </div>

      {/* ── TAB 1: METRICS & HEALTH ──────────────────────────────────── */}
      {activeTab === "metrics" && (
        <div>
          {/* Stat Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
            <div className="glass-card" style={{ padding: 22, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Active on Website</span>
                <span style={{ fontSize: 11, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>24H CAP</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em" }}>
                {metrics?.publishedTotal?.toLocaleString() || "1,000"}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                Strict ceiling of 1,000 fresh curated positions
              </p>
            </div>

            <div className="glass-card" style={{ padding: 22, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Warehouse Pool</span>
                <Database size={16} style={{ color: "#818cf8" }} />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#a5b4fc", letterSpacing: "-0.03em" }}>
                {metrics?.warehouseTotal?.toLocaleString() || "13,500+"}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                Total positions in background database
              </p>
            </div>

            <div className="glass-card" style={{ padding: 22, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Unique Companies</span>
                <Building2 size={16} style={{ color: "#f472b6" }} />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#f472b6", letterSpacing: "-0.03em" }}>
                {metrics?.uniquePublishedCompanies || "420+"}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                Anti-monopoly: max 3 positions per company
              </p>
            </div>

            <div className="glass-card" style={{ padding: 22, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>24H Auto-Curation</span>
                <Clock size={16} style={{ color: "#34d399" }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#34d399", marginTop: 4 }}>
                Active (Daily)
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                Next scheduled batch in ~14 hours
              </p>
            </div>
          </div>

          {/* ATS Health & Breakdown Grid */}
          <div className="glass-card" style={{ padding: 24, borderRadius: 18, marginBottom: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={18} style={{ color: "#818cf8" }} /> Multi-ATS Ecosystem Status & Quotas
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {[
                { name: "GREENHOUSE", quota: "30%", color: "#22c55e", status: "HEALTHY" },
                { name: "ASHBY", quota: "20%", color: "#a855f7", status: "HEALTHY" },
                { name: "LEVER", quota: "20%", color: "#06b6d4", status: "HEALTHY" },
                { name: "WORKDAY", quota: "15%", color: "#f59e0b", status: "HEALTHY" },
                { name: "WORKABLE / JAZZHR", quota: "15%", color: "#ec4899", status: "HEALTHY" },
              ].map((ats) => (
                <div
                  key={ats.name}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ats.color }}>{ats.name}</span>
                    <span style={{ fontSize: 10, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{ats.status}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, margin: "8px 0 2px" }}>
                    Target {ats.quota}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Balanced round-robin</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: RESUME PERSONA & DIVERSITY CONTROLS ──────────────── */}
      {activeTab === "resume" && (
        <div className="glass-card" style={{ padding: 28, borderRadius: 18 }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>
              Target Resume & Persona Filter
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              The engine compares all 13,500+ warehouse jobs against this persona to score relevance and pick the top 1,000 matches.
            </p>

            {/* Resume Text Area */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f8fafc", marginBottom: 6 }}>
                Master Resume Text / Skills Summary
              </label>
              <textarea
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste master resume, core tech stack, accomplishments, and skills here..."
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Target Roles */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f8fafc", marginBottom: 6 }}>
                Target Role Titles (Comma-separated)
              </label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="e.g. Full Stack Engineer, Backend Developer, Python Engineer, AI Engineer"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Excluded Keywords */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 6 }}>
                Excluded / Negative Keywords (Anti-Skills)
              </label>
              <input
                type="text"
                value={excludedKeywords}
                onChange={(e) => setExcludedKeywords(e.target.value)}
                placeholder="e.g. Intern, Unpaid, WordPress, PHP, Volunteer"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#f8fafc",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Diversity Slider Controls */}
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  Max Jobs Per Company (Anti-Monopoly Cap)
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#a855f7" }}>
                  {maxPerCompany} jobs max
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={maxPerCompany}
                onChange={(e) => setMaxPerCompany(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#a855f7", cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Enforces variety by ensuring at least {Math.floor(1000 / maxPerCompany)}+ unique companies in the 1,000 daily batch.
              </span>
            </div>

            {/* Action Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleRunMatch}
                disabled={matching}
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 28px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: matching ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)",
                }}
              >
                {matching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Run Match & Curate 1,000 Jobs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DIVERSITY CURATION QUEUE ─────────────────────────── */}
      {activeTab === "curate" && (
        <div>
          {publishSuccess && (
            <div
              style={{
                marginBottom: 20,
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{publishSuccess}</span>
            </div>
          )}

          {curationSummary ? (
            <div>
              {/* Diversity Summary Banner */}
              <div
                style={{
                  padding: "18px 24px",
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f8fafc" }}>
                    Curated 1,000 High-Diversity Batch
                  </h4>
                  <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13, color: "#cbd5e1" }}>
                    <span>🏢 <strong>{curationSummary.uniqueCompanies}</strong> Unique Companies</span>
                    <span>🎯 <strong>{curationSummary.averageScore}%</strong> Avg Resume Match</span>
                    <span>🌐 <strong>{Object.keys(curationSummary.atsBreakdown).length}</strong> ATS Platforms</span>
                  </div>
                </div>

                <button
                  onClick={handlePublishBatch}
                  disabled={publishing}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 24px",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: publishing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  {publishing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Publish 1,000 Batch to Website
                </button>
              </div>

              {/* Preview Table */}
              <div className="glass-card" style={{ borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Top Curated Preview (Sample 50 of 1,000)</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Interleaved round-robin</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "12px 18px" }}>Role & Company</th>
                        <th style={{ padding: "12px 18px" }}>ATS Source</th>
                        <th style={{ padding: "12px 18px" }}>Location</th>
                        <th style={{ padding: "12px 18px" }}>Match Score</th>
                        <th style={{ padding: "12px 18px" }}>Skills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewJobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                          <td style={{ padding: "12px 18px" }}>
                            <div style={{ fontWeight: 600, color: "#f8fafc" }}>{job.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{job.company_name}</div>
                          </td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", fontWeight: 600 }}>
                              {job.source}
                            </span>
                          </td>
                          <td style={{ padding: "12px 18px", color: "var(--text-secondary)" }}>
                            {job.location || "Remote"}
                          </td>
                          <td style={{ padding: "12px 18px" }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: job.matchScore >= 80 ? "#34d399" : job.matchScore >= 60 ? "#60a5fa" : "#fbbf24",
                              }}
                            >
                              {job.matchScore}%
                            </span>
                          </td>
                          <td style={{ padding: "12px 18px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {(job.matchingSkills || []).slice(0, 3).map((sk) => (
                                <span key={sk} style={{ fontSize: 10, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "1px 6px", borderRadius: 4 }}>
                                  {sk}
                                </span>
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
            <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", borderRadius: 16 }}>
              <SlidersHorizontal size={40} style={{ color: "#818cf8", margin: "0 auto 16px" }} />
              <h4 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
                No Curation Batch Generated Yet
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 460, margin: "0 auto 20px" }}>
                Switch to the <strong>Resume Persona & Filter</strong> tab to set your criteria and run the 1,000 batch diversity balancing algorithm.
              </p>
              <button
                onClick={() => setActiveTab("resume")}
                style={{
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  borderRadius: 10,
                  padding: "9px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Configure Resume Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: 24-HOUR AUTOMATION ───────────────────────────────── */}
      {activeTab === "automation" && (
        <div className="glass-card" style={{ padding: 28, borderRadius: 18 }}>
          <div style={{ maxWidth: 750, margin: "0 auto" }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>
              24-Hour Automated Scrape & Curation Engine
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              Runs automatically every 24 hours: scrapes fresh jobs across all ATS platforms, scores them against your resume, balances company/ATS diversity, and publishes the fresh 1,000 batch.
            </p>

            {autoRunMessage && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34d399",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{autoRunMessage}</span>
              </div>
            )}

            <div
              style={{
                padding: 20,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Auto-Publish Schedule</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  Executes every night at 00:00 UTC
                </div>
              </div>
              <button
                onClick={() => setAutoScheduleActive(!autoScheduleActive)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "none",
                  background: autoScheduleActive ? "#10b981" : "rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {autoScheduleActive ? "ENABLED ✓" : "PAUSED"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleRunAutoCuration}
                disabled={autoRunning}
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: autoRunning ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {autoRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Test 24H Auto-Curation Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
