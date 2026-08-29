"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Globe, Link2, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { ALL_ATS_PLATFORMS, identifyAtsPlatform } from "@/lib/jobUrls";

export default function ImportPage() {
  const [boardUrl, setBoardUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const detectedPlatform = boardUrl ? identifyAtsPlatform(boardUrl) : null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardUrl.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardUrl: boardUrl.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message || `Successfully queued board crawling for ${detectedPlatform?.label || 'ATS'}!` });
        setBoardUrl("");
      } else {
        setResult({ success: false, message: data.error || "Failed to import company career board." });
      }
    } catch (e: any) {
      setResult({ success: false, message: e?.message || "Network error submitting import request." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 680, margin: "0 auto 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={14} /> Back to Jobs
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
          Import Company Career Board
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
          Paste a company&apos;s Greenhouse, Lever, Ashby, Workday, or supported career page URL to aggregate and track their live open roles in JobPulse.
        </p>
      </div>

      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <form onSubmit={handleImport} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
              Company Board or ATS URL
            </label>
            <div style={{ position: "relative" }}>
              <Link2 size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="url"
                placeholder="https://boards.greenhouse.io/company or https://jobs.ashbyhq.com/company"
                value={boardUrl}
                onChange={(e) => setBoardUrl(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 40 }}
                required
              />
            </div>
            {detectedPlatform && detectedPlatform.platform !== "other" && (
              <div style={{ marginTop: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "#34d399" }}>
                <CheckCircle2 size={13} /> Detected platform: <strong>{detectedPlatform.label}</strong>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !boardUrl.trim()}
            className="btn-primary"
            style={{
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 700,
              justifyContent: "center",
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: loading || !boardUrl.trim() ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Analyzing and importing..." : "Import Jobs"}
          </button>
        </form>

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: result.success ? "rgba(52, 211, 153, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${result.success ? "rgba(52, 211, 153, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
              color: result.success ? "#34d399" : "#f87171",
            }}
          >
            {result.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>
          Supported ATS Platforms
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ALL_ATS_PLATFORMS.map((p) => (
            <span
              key={p.id}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
