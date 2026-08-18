"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapPin, Search, ChevronDown, Check, Globe, Map } from "lucide-react";

export interface LocationFilterState {
  country: string; // 'ALL' | 'US' | 'CA' | 'UK'
  allLocationsInCountry: boolean;
  cityOrState: string;
}

interface LocationFilterPopoverProps {
  value: LocationFilterState;
  onChange: (newValue: LocationFilterState) => void;
}

const COUNTRIES = [
  { code: "ALL", label: "All Locations (Global)", desc: "Worldwide positions & remote hubs", icon: Globe },
  { code: "US", label: "United States", desc: "US Nationwide & states (CA, NY, WA...)", icon: Map },
  { code: "CA", label: "Canada", desc: "Toronto, Vancouver, Montreal, Ontario...", icon: Map },
  { code: "UK", label: "United Kingdom", desc: "London, England, Edinburgh, Manchester...", icon: Map },
];

const POPULAR_HUBS = [
  "Remote", "San Francisco, CA", "New York, NY", "Seattle, WA", 
  "Austin, TX", "Boston, MA", "Los Angeles, CA", "Chicago, IL",
  "Toronto, ON", "London, UK"
];

export default function LocationFilterPopover({ value, onChange }: LocationFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tempCountry, setTempCountry] = useState(value.country || "ALL");
  const [tempAllLocations, setTempAllLocations] = useState(value.allLocationsInCountry ?? true);
  const [tempCity, setTempCity] = useState(value.cityOrState || "");

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempCountry(value.country || "ALL");
    setTempAllLocations(value.allLocationsInCountry ?? true);
    setTempCity(value.cityOrState || "");
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
    onChange({
      country: tempCountry,
      allLocationsInCountry: tempCountry === "ALL" ? true : tempAllLocations,
      cityOrState: (tempCountry !== "ALL" && tempAllLocations) ? "" : tempCity.trim(),
    });
    setOpen(false);
  };

  const handleReset = () => {
    setTempCountry("ALL");
    setTempAllLocations(true);
    setTempCity("");
    onChange({ country: "ALL", allLocationsInCountry: true, cityOrState: "" });
    setOpen(false);
  };

  const getTriggerLabel = () => {
    if (value.cityOrState) return value.cityOrState;
    if (value.country === "US") return "United States";
    if (value.country === "CA") return "Canada";
    if (value.country === "UK") return "United Kingdom";
    return "All Locations";
  };

  const isFiltered = Boolean(value.cityOrState || (value.country && value.country !== "ALL"));

  // Shared style constants
  const S = {
    panel: {
      position: "absolute" as const,
      left: 0,
      zIndex: 9999,
      marginTop: 10,
      width: 380,
      borderRadius: 16,
      padding: 20,
      background: "#0f0f12",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 25px 60px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
      animation: "fadeInUp 0.15s ease-out",
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 700 as const,
      color: "#71717a",
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
    },
    countryCard: (selected: boolean) => ({
      padding: "10px 12px",
      borderRadius: 12,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      transition: "all 0.15s ease",
      background: selected ? "rgba(99, 102, 241, 0.08)" : "transparent",
      border: `1px solid ${selected ? "rgba(99, 102, 241, 0.15)" : "transparent"}`,
    }),
    iconBox: (selected: boolean) => ({
      width: 32,
      height: 32,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0 as const,
      background: selected ? "rgba(99, 102, 241, 0.15)" : "rgba(255,255,255,0.04)",
      color: selected ? "#a5b4fc" : "#71717a",
    }),
    hubPill: (selected: boolean) => ({
      fontSize: 11,
      fontWeight: 500 as const,
      padding: "5px 10px",
      borderRadius: 8,
      cursor: "pointer",
      border: "1px solid",
      transition: "all 0.15s ease",
      background: selected ? "rgba(99, 102, 241, 0.12)" : "transparent",
      color: selected ? "#c7d2fe" : "#a1a1aa",
      borderColor: selected ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.06)",
    }),
    input: {
      width: "100%",
      height: 36,
      padding: "0 12px 0 34px",
      borderRadius: 10,
      fontSize: 12,
      background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#e4e4e7",
      outline: "none",
      transition: "border-color 0.15s ease",
      fontFamily: "inherit",
    },
  };

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
          background: isFiltered ? "rgba(99, 102, 241, 0.08)" : "rgba(255,255,255,0.04)",
          borderColor: isFiltered ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.06)",
          color: isFiltered ? "#c7d2fe" : "#a1a1aa",
        }}
      >
        <MapPin size={14} style={{ color: isFiltered ? "#a5b4fc" : "#71717a" }} />
        <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getTriggerLabel()}</span>
        <ChevronDown
          size={13}
          style={{
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: open ? "#a1a1aa" : "#52525b",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Popover Panel */}
      {open && (
        <div style={S.panel}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={14} style={{ color: "#71717a" }} />
              <span style={S.sectionLabel}>Country & Region</span>
            </div>
            {isFiltered && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "rgba(99, 102, 241, 0.1)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                Active
              </span>
            )}
          </div>

          {/* Country List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {COUNTRIES.map((c) => {
              const isSelected = tempCountry === c.code;
              const Icon = c.icon;
              return (
                <div
                  key={c.code}
                  onClick={() => setTempCountry(c.code)}
                  style={S.countryCard(isSelected)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={S.iconBox(isSelected)}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#e4e4e7" : "#d4d4d8" }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: "#52525b", marginTop: 1 }}>{c.desc}</div>
                    </div>
                  </div>
                  {isSelected && <Check size={14} style={{ color: "#a5b4fc", flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>

          {/* City/Hub Filter */}
          <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>
              {tempCountry !== "ALL" ? `Filter within ${tempCountry === "US" ? "the US" : tempCountry === "CA" ? "Canada" : "the UK"}` : "Filter by City / Hub (Optional)"}
            </div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#52525b", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Enter city or region (e.g. San Francisco)"
                value={tempCity}
                onChange={(e) => setTempCity(e.target.value)}
                style={S.input}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {POPULAR_HUBS.slice(0, 6).map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => setTempCity(hub)}
                  style={S.hubPill(tempCity === hub)}
                  onMouseEnter={(e) => { if (tempCity !== hub) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                  onMouseLeave={(e) => { if (tempCity !== hub) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              type="button"
              onClick={handleReset}
              style={{ fontSize: 12, fontWeight: 500, color: "#71717a", cursor: "pointer", background: "none", border: "none", padding: "6px 8px", fontFamily: "inherit", transition: "color 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 20px",
                borderRadius: 10,
                cursor: "pointer",
                border: "none",
                fontFamily: "inherit",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.3)"; }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
