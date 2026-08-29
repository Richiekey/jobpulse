"use client";

import React from "react";
import { Zap } from "lucide-react";

interface BulkActionDockProps {
  selectedCount: number;
  totalOnPage: number;
  onSelectAll: () => void;
  onApplyAll: () => void;
  onCancel: () => void;
}

export default function BulkActionDock({
  selectedCount,
  totalOnPage,
  onSelectAll,
  onApplyAll,
  onCancel,
}: BulkActionDockProps) {
  return (
    <div className="bulk-floating-dock">
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
        <Zap size={16} style={{ color: "#a5b4fc" }} />
        <span>{selectedCount} Selected</span>
      </div>

      <div style={{ height: 16, width: 1, background: "rgba(255,255,255,0.15)" }} />

      <button
        type="button"
        onClick={onSelectAll}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 999,
          padding: "5px 12px",
          color: "var(--text-secondary)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {selectedCount === totalOnPage ? "Deselect All" : "Select All"}
      </button>

      <button
        type="button"
        onClick={onApplyAll}
        disabled={selectedCount === 0}
        className="btn-primary"
        style={{
          padding: "6px 16px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          opacity: selectedCount === 0 ? 0.5 : 1,
          cursor: selectedCount === 0 ? "not-allowed" : "pointer",
        }}
      >
        Open Tabs ({Math.min(selectedCount, 10)})
      </button>

      <button
        type="button"
        onClick={onCancel}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          fontSize: 12,
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
