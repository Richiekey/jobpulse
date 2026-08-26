"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check, Clock, RotateCcw } from "lucide-react";

export interface DatePostedOption {
  value: string;
  label: string;
  desc?: string;
  days: number;
}

export const DATE_POSTED_OPTIONS: DatePostedOption[] = [
  { value: "24h", label: "Past 24 hours", desc: "Posted within last 24h", days: 1 },
  { value: "3d", label: "Past 3 days", desc: "Posted within last 3 days", days: 3 },
  { value: "7d", label: "Past week", desc: "Posted within last 7 days", days: 7 },
  { value: "14d", label: "Past 2 weeks", desc: "All active jobs (up to 14 days)", days: 14 },
];

interface DatePostedFilterPopoverProps {
  value: string; // "24h" | "3d" | "7d" | "14d" | ""
  onChange: (newValue: string) => void;
}

export default function DatePostedFilterPopover({ value, onChange }: DatePostedFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempValue(value || "");
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleConfirm = () => {
    onChange(tempValue);
    setOpen(false);
  };

  const handleReset = () => {
    setTempValue("");
    onChange("");
    setOpen(false);
  };

  const isFiltered = Boolean(value);
  const selectedOption = DATE_POSTED_OPTIONS.find((o) => o.value === value);
  const triggerLabel = selectedOption ? selectedOption.label : "Date Posted";

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          border: "1px solid",
          transition: "all 0.2s ease",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          background: isFiltered ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.04)",
          borderColor: isFiltered ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.06)",
          color: isFiltered ? "#c7d2fe" : "#a1a1aa",
        }}
      >
        <Calendar size={14} style={{ color: isFiltered ? "#a5b4fc" : "#52525b", flexShrink: 0 }} />
        <span>{triggerLabel}</span>
        <ChevronDown
          size={13}
          style={{
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: "#52525b",
            flexShrink: 0,
            marginLeft: 2,
          }}
        />
      </button>

      {/* Popover Panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 9999,
            marginTop: 8,
            width: 240,
            borderRadius: 14,
            background: "#0f0f13",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
            animation: "fadeInUp 0.15s ease-out",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px 10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>
              Date Posted
            </span>
            {tempValue && (
              <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 500 }}>
                1 selected
              </span>
            )}
          </div>

          {/* Options List */}
          <div style={{ padding: "8px 6px" }}>
            {DATE_POSTED_OPTIONS.map((opt) => {
              const isSelected = tempValue === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setTempValue(isSelected ? "" : opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    background: isSelected ? "rgba(99, 102, 241, 0.12)" : "transparent",
                    color: isSelected ? "#e0e7ff" : "#a1a1aa",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                      e.currentTarget.style.color = "#f4f4f5";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#a1a1aa";
                    }
                  }}
                >
                  {/* Radio Circle */}
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: isSelected ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isSelected ? "#6366f1" : "transparent",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#ffffff",
                        }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>
                      {opt.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(0, 0, 0, 0.2)",
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                color: "#71717a",
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: 6,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              style={{
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
