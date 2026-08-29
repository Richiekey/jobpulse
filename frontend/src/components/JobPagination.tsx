"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

interface JobPaginationProps {
  page: number;
  totalPages: number;
  totalJobs: number;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
}

function getPaginationItems(current: number, total: number): (number | 'ellipsis-left' | 'ellipsis-right')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis-left', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis-left', current - 1, current, current + 1, 'ellipsis-right', total];
}

export default function JobPagination({
  page,
  totalPages,
  totalJobs,
  loading = false,
  onPageChange,
}: JobPaginationProps) {
  if (totalPages <= 1 && totalJobs <= 12) return null;

  const effectiveTotalPages = Math.max(1, totalPages);

  return (
    <div
      style={{
        marginTop: 40,
        marginBottom: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: loading ? 0.65 : 1,
        transition: "opacity 0.2s ease",
        pointerEvents: loading ? "none" : "auto",
      }}
      className="animate-fade-in-up"
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 4, userSelect: "none" }}>
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || loading}
          className="pagination-btn"
          style={{ paddingLeft: 8, paddingRight: 8 }}
          title="First page"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="pagination-btn"
          style={{ paddingLeft: 8, paddingRight: 8 }}
          title="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Numbers & Ellipses */}
        {getPaginationItems(page, effectiveTotalPages).map((item, idx) => {
          if (item === 'ellipsis-left') {
            return (
              <button
                key={`ellipsis-left-${idx}`}
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 5))}
                disabled={loading}
                className="pagination-ellipsis"
                title="Jump back 5 pages"
              >
                ···
              </button>
            );
          }
          if (item === 'ellipsis-right') {
            return (
              <button
                key={`ellipsis-right-${idx}`}
                type="button"
                onClick={() => onPageChange(Math.min(effectiveTotalPages, page + 5))}
                disabled={loading}
                className="pagination-ellipsis"
                title="Jump forward 5 pages"
              >
                ···
              </button>
            );
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={loading}
              className={`pagination-btn ${item === page ? 'pagination-active' : ''}`}
            >
              {item}
            </button>
          );
        })}

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= effectiveTotalPages || loading}
          className="pagination-btn"
          style={{ paddingLeft: 8, paddingRight: 8 }}
          title="Next page"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(effectiveTotalPages)}
          disabled={page >= effectiveTotalPages || loading}
          className="pagination-btn"
          style={{ paddingLeft: 8, paddingRight: 8 }}
          title="Last page"
        >
          <ChevronsRight size={15} />
        </button>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-dimmed)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "var(--text-muted)" }}>{page}</span>
        <span>/</span>
        <span style={{ color: "var(--text-muted)" }}>{effectiveTotalPages}</span>
        {totalJobs > 0 && <span style={{ color: "var(--text-dimmed)", marginLeft: 6 }}>· {totalJobs.toLocaleString()} jobs</span>}
        {loading && <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent-glow)", marginLeft: 4 }} />}
      </div>
    </div>
  );
}
