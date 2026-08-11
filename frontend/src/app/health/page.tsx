"use client";

import { useState, useEffect } from "react";
import { Activity, Play, CheckCircle2, XCircle, Loader2, Zap, Database, BarChart3 } from "lucide-react";

interface SourceHealthItem {
  source: string;
  last_run?: string;
  last_successful_run?: string;
  jobs_found_total: number;
  jobs_inserted_total: number;
  total_active_jobs: number;
  last_error?: string;
  error_message?: string;
}

const API_BASE = "/api";

const platformMeta: Record<string, { color: string; gradient: string }> = {
  GREENHOUSE: { color: "#34d399", gradient: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.03))" },
  ASHBY: { color: "#fbbf24", gradient: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.03))" },
  LEVER: { color: "#818cf8", gradient: "linear-gradient(135deg, rgba(129,140,248,0.12), rgba(129,140,248,0.03))" },
  WORKDAY: { color: "#f97316", gradient: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.03))" },
};

function formatTime(dateStr?: string) {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<SourceHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sources/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data.sources || []);
      }
    } catch (e) {
      console.error("Failed to fetch source health:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const handleTriggerScrape = async () => {
    setTriggering(true);
    setTriggerMsg("");
    try {
      const res = await fetch(`${API_BASE}/scrape/trigger`, { method: "POST" });
      if (res.ok) {
        setTriggerMsg("success");
        setTimeout(fetchHealth, 5000);
      } else if (res.status === 409) {
        setTriggerMsg("running");
      }
    } catch {
      setTriggerMsg("error");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Activity size={24} style={{ color: "var(--accent-glow)" }} />
            Source Health
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
            Monitor ATS platform status, scrape metrics, and active job counts
          </p>
        </div>
        <button className="btn-primary" onClick={handleTriggerScrape} disabled={triggering}>
          {triggering ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {triggering ? "Running..." : "Trigger Scrape"}
        </button>
      </div>

      {/* Toast */}
      {triggerMsg && (
        <div
          className="animate-slide-in"
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: triggerMsg === "success" ? "var(--success-soft)" : triggerMsg === "running" ? "var(--warning-soft)" : "var(--danger-soft)",
            color: triggerMsg === "success" ? "var(--success)" : triggerMsg === "running" ? "var(--warning)" : "var(--danger)",
            border: `1px solid ${triggerMsg === "success" ? "rgba(52,211,153,0.2)" : triggerMsg === "running" ? "rgba(251,191,36,0.2)" : "rgba(248,113,113,0.2)"}`,
          }}
        >
          {triggerMsg === "success" && <><CheckCircle2 size={16} /> Scrape triggered — results will appear in a few seconds</>}
          {triggerMsg === "running" && <><Loader2 size={16} /> A scrape run is already in progress</>}
          {triggerMsg === "error" && <><XCircle size={16} /> Failed to trigger scrape</>}
        </div>
      )}

      {/* Platform Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card" style={{ padding: 28 }}>
              <div className="skeleton" style={{ width: 140, height: 22, marginBottom: 24 }} />
              <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "80%", height: 16, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "60%", height: 16 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {["GREENHOUSE", "ASHBY", "LEVER"].map((platform) => {
            const item = healthData.find((h) => h.source === platform);
            const meta = platformMeta[platform];
            const activeJobs = item?.total_active_jobs || 0;
            const hasError = item?.error_message || item?.last_error;

            return (
              <div
                key={platform}
                className="glass-card"
                style={{ padding: 28, background: meta.gradient }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: meta.color, margin: 0 }}>
                    {platform}
                  </h3>
                  {hasError ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 600, color: "var(--danger)",
                      background: "var(--danger-soft)", padding: "4px 10px", borderRadius: 999,
                    }}>
                      <XCircle size={13} /> Error
                    </span>
                  ) : (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 600, color: "var(--success)",
                      background: "var(--success-soft)", padding: "4px 10px", borderRadius: 999,
                    }}>
                      <CheckCircle2 size={13} /> Healthy
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Database size={14} style={{ color: "var(--text-muted)" }} /> Active Jobs
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: meta.color, fontVariantNumeric: "tabular-nums" }}>
                      {activeJobs.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <BarChart3 size={14} style={{ color: "var(--text-muted)" }} /> Total Found
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {(item?.jobs_found_total || 0).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Last Run</span>
                    <span style={{ fontWeight: 500, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {formatTime(item?.last_run)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Last Success</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                      {formatTime(item?.last_successful_run)}
                    </span>
                  </div>
                </div>

                {/* Error */}
                {hasError && (
                  <div style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    background: "var(--danger-soft)",
                    border: "1px solid rgba(248,113,113,0.15)",
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--danger)",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}>
                    {(item?.error_message || item?.last_error || "").slice(0, 200)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
