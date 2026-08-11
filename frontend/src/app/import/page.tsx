"use client";

import { useState } from "react";
import { Upload, CheckCircle2, XCircle, AlertCircle, Loader2, Link2, Sparkles } from "lucide-react";

interface ImportResultItem {
  url: string;
  status: string;
  job_id?: string;
  detected_ats: string;
  error_message?: string;
}

interface ImportResponse {
  batch_id: string;
  total: number;
  successful: number;
  failed: number;
  duplicates: number;
  results: ImportResultItem[];
}

const API_BASE = "/api";

function statusIcon(status: string) {
  if (status === "SUCCESS") return <CheckCircle2 size={15} style={{ color: "var(--success)" }} />;
  if (status === "DUPLICATE") return <AlertCircle size={15} style={{ color: "var(--warning)" }} />;
  return <XCircle size={15} style={{ color: "var(--danger)" }} />;
}

export default function BulkImportPage() {
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);

  const urlCount = urlText.split("\n").filter((u) => u.trim()).length;

  const handleImport = async () => {
    const urls = urlText.split("\n").map((u) => u.trim()).filter((u) => u.length > 0);
    if (urls.length === 0) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE}/jobs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (res.ok) {
        const data = await res.json();
        setResponse(data);
      }
    } catch (e) {
      console.error("Import failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Link2 size={24} style={{ color: "var(--accent-glow)" }} />
          Bulk Import
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6, maxWidth: 560, lineHeight: 1.6 }}>
          Paste job board URLs from Greenhouse, Ashby, or Lever — one per line.
          The system auto-detects the ATS, extracts fields, normalizes, and deduplicates.
        </p>
      </div>

      {/* Input Card */}
      <div
        className="animate-fade-in-up glass-card"
        style={{ animationDelay: "80ms", padding: 24, marginBottom: 24 }}
      >
        <textarea
          rows={8}
          placeholder={"Paste URLs here, one per line...\nhttps://boards.greenhouse.io/stripe/jobs/12345\nhttps://jobs.ashbyhq.com/openai/abc-123\nhttps://jobs.lever.co/netflix/lever-7777"}
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          className="input-field"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            lineHeight: 1.7,
            resize: "vertical",
            minHeight: 160,
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {urlCount} {urlCount === 1 ? "URL" : "URLs"} detected
          </span>
          <button
            onClick={handleImport}
            disabled={loading || !urlText.trim()}
            className="btn-primary"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Processing..." : "Import URLs"}
          </button>
        </div>
      </div>

      {/* Results */}
      {response && (
        <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          {/* Stats Grid */}
          <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: "var(--text-primary)" }}>{response.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card" style={{ borderColor: "rgba(52, 211, 153, 0.2)" }}>
              <div className="stat-value" style={{ color: "var(--success)" }}>{response.successful}</div>
              <div className="stat-label">Imported</div>
            </div>
            <div className="stat-card" style={{ borderColor: "rgba(251, 191, 36, 0.2)" }}>
              <div className="stat-value" style={{ color: "var(--warning)" }}>{response.duplicates}</div>
              <div className="stat-label">Duplicates</div>
            </div>
            <div className="stat-card" style={{ borderColor: "rgba(248, 113, 113, 0.2)" }}>
              <div className="stat-value" style={{ color: "var(--danger)" }}>{response.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>

          {/* Results Table */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ATS</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>URL</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {response.results.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                        {statusIcon(item.status)}
                        <span style={{
                          color: item.status === "SUCCESS" ? "var(--success)" : item.status === "DUPLICATE" ? "var(--warning)" : "var(--danger)",
                          fontSize: 12,
                        }}>
                          {item.status}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={`badge badge-${item.detected_ats?.toLowerCase()}`}>
                        {item.detected_ats}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-muted)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.url}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                      {item.error_message || item.job_id || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
