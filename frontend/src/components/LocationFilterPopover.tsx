"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Search, ChevronDown, Check, X, Globe } from "lucide-react";

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
  { code: "ALL", label: "All Locations (Global)", flag: "🌐" },
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "UK", label: "United Kingdom", flag: "🇬🇧" },
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

  // Sync internal state when prop changes or opened
  useEffect(() => {
    setTempCountry(value.country || "ALL");
    setTempAllLocations(value.allLocationsInCountry ?? true);
    setTempCity(value.cityOrState || "");
  }, [value, open]);

  // Click outside to close
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
    onChange({
      country: "ALL",
      allLocationsInCountry: true,
      cityOrState: "",
    });
    setOpen(false);
  };

  // Compute trigger button label
  const getTriggerLabel = () => {
    if (value.cityOrState) return value.cityOrState;
    if (value.country === "US") return "United States";
    if (value.country === "CA") return "Canada";
    if (value.country === "UK") return "United Kingdom";
    return "All Locations";
  };

  const isFiltered = Boolean(value.cityOrState || (value.country && value.country !== "ALL"));

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Trigger Button Pill */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all select-none cursor-pointer border"
        style={{
          background: isFiltered ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
          borderColor: isFiltered ? "rgba(99, 102, 241, 0.45)" : "rgba(255, 255, 255, 0.08)",
          color: isFiltered ? "#818cf8" : "var(--text-secondary)",
        }}
      >
        <MapPin size={14} style={{ color: isFiltered ? "#818cf8" : "var(--text-muted)" }} />
        <span>{getTriggerLabel()}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
      </button>

      {/* Popover Card */}
      {open && (
        <div
          className="absolute left-0 sm:left-auto z-50 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl p-5 animate-fade-in-up border"
          style={{
            background: "#12141a",
            borderColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          }}
        >
          {/* Header */}
          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
            <span>Country</span>
            {tempCountry !== "ALL" && (
              <span className="text-[10px] font-normal lowercase" style={{ color: "#818cf8" }}>
                filter active
              </span>
            )}
          </div>

          {/* Radio list */}
          <div className="space-y-1.5 mb-4">
            {COUNTRIES.map((c) => {
              const isSelected = tempCountry === c.code;
              return (
                <label
                  key={c.code}
                  onClick={() => setTempCountry(c.code)}
                  className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
                  style={{
                    background: isSelected ? "rgba(99, 102, 241, 0.1)" : "transparent",
                    border: `1px solid ${isSelected ? "rgba(99, 102, 241, 0.25)" : "transparent"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center transition-all"
                      style={{
                        border: `1.5px solid ${isSelected ? "#00f0a0" : "rgba(255,255,255,0.25)"}`,
                        background: isSelected ? "rgba(0, 240, 160, 0.15)" : "transparent",
                      }}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: "#00f0a0" }} />}
                    </div>
                    <span className="text-sm font-medium" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {c.flag} {c.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="h-px bg-white/5 my-3.5" />

          {/* Specific Location Search */}
          {tempCountry !== "ALL" ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Location
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>All locations within {tempCountry === "US" ? "the US" : tempCountry === "CA" ? "Canada" : "the UK"}</span>
                  <input
                    type="checkbox"
                    checked={tempAllLocations}
                    onChange={(e) => setTempAllLocations(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={() => setTempAllLocations(!tempAllLocations)}
                    className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer"
                    style={{
                      background: tempAllLocations ? "#00f0a0" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${tempAllLocations ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </div>
                </label>
              </div>

              {!tempAllLocations && (
                <div className="relative mt-2.5 animate-fade-in-up">
                  <Search size={14} className="absolute left-3 top-3 text-muted pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Enter city or state/province (e.g. Seattle, San Francisco)"
                    value={tempCity}
                    onChange={(e) => setTempCity(e.target.value)}
                    className="input-field pl-9 text-xs"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {POPULAR_HUBS.slice(0, 6).map((hub) => (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => setTempCity(hub)}
                        className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer"
                        style={{
                          background: tempCity === hub ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.04)",
                          color: tempCity === hub ? "var(--accent-glow)" : "var(--text-muted)",
                          border: `1px solid ${tempCity === hub ? "rgba(99, 102, 241, 0.4)" : "transparent"}`,
                        }}
                      >
                        {hub}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>
                Filter by City / Hub (Optional)
              </span>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-muted pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Enter city or region (e.g. San Francisco, London, Remote)"
                  value={tempCity}
                  onChange={(e) => setTempCity(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {POPULAR_HUBS.slice(0, 6).map((hub) => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setTempCity(hub)}
                    className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer"
                    style={{
                      background: tempCity === hub ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.04)",
                      color: tempCity === hub ? "var(--accent-glow)" : "var(--text-muted)",
                      border: `1px solid ${tempCity === hub ? "rgba(99, 102, 241, 0.4)" : "transparent"}`,
                    }}
                  >
                    {hub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3.5 border-t border-white/10 mt-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold transition-colors hover:text-white cursor-pointer px-2 py-1"
              style={{ color: "var(--text-muted)" }}
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs py-2 px-5 rounded-xl cursor-pointer shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
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
