"use client";

import React from "react";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function FloatingSyncIndicator() {
  const { syncIndicator } = useAuth();

  if (!syncIndicator || syncIndicator.status === "idle") {
    return null;
  }

  const { status, companyName, jobTitle, message } = syncIndicator;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: 24,
        zIndex: 99999,
        animation: "fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(18, 20, 29, 0.94)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${
            status === "syncing"
              ? "rgba(99, 102, 241, 0.4)"
              : status === "success"
              ? "rgba(34, 197, 94, 0.4)"
              : "rgba(239, 68, 68, 0.4)"
          }`,
          boxShadow: `0 12px 32px -8px rgba(0, 0, 0, 0.7), 0 0 20px ${
            status === "syncing"
              ? "rgba(99, 102, 241, 0.25)"
              : status === "success"
              ? "rgba(34, 197, 94, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          }`,
        }}
      >
        {status === "syncing" && (
          <>
            <Loader2 size={15} className="animate-spin" style={{ color: "#818cf8", flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>
              Syncing application <span style={{ color: "#a5b4fc" }}>({companyName || "Job"})</span>...
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={15} style={{ color: "#4ade80", flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>
              Application Synced <span style={{ color: "#86efac" }}>✓ {companyName ? `· ${companyName}` : ""}</span>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle size={15} style={{ color: "#f87171", flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>
              Sync Failed <span style={{ color: "#fca5a5" }}>{companyName ? `(${companyName})` : ""}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
