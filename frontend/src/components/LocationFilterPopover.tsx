"use client";

import React, { useState, useRef, useEffect } from "react";
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
  { code: "ALL", label: "All Locations (Global)", desc: "Worldwide positions & remote hubs", flag: "🌐" },
  { code: "US", label: "United States", desc: "US Nationwide & states (CA, NY, WA...)", flag: "🇺🇸" },
  { code: "CA", label: "Canada", desc: "Toronto, Vancouver, Montreal, Ontario...", flag: "🇨🇦" },
  { code: "UK", label: "United Kingdom", desc: "London, England, Edinburgh, Manchester...", flag: "🇬🇧" },
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
        className="h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 select-none cursor-pointer border"
        style={{
          background: isFiltered
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(129, 140, 248, 0.08))"
            : "rgba(255, 255, 255, 0.03)",
          borderColor: isFiltered ? "rgba(99, 102, 241, 0.45)" : "rgba(255, 255, 255, 0.08)",
          color: isFiltered ? "#a5b4fc" : "#94a3b8",
          boxShadow: isFiltered ? "0 0 15px rgba(99, 102, 241, 0.15)" : "none",
        }}
      >
        <MapPin size={14} style={{ color: isFiltered ? "#818cf8" : "#64748b" }} />
        <span className="truncate max-w-[130px]">{getTriggerLabel()}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-indigo-400" : "text-slate-500"}`}
        />
      </button>

      {/* Popover Card */}
      {open && (
        <div
          className="absolute left-0 z-50 mt-2.5 w-[330px] sm:w-[380px] rounded-2xl p-5 animate-fade-in-up border"
          style={{
            background: "#141721",
            borderColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Globe size={13} />
              </div>
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Country & Region
              </span>
            </div>
            {isFiltered && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Filter Active
              </span>
            )}
          </div>

          {/* Country Cards List */}
          <div className="space-y-1.5 mb-4">
            {COUNTRIES.map((c) => {
              const isSelected = tempCountry === c.code;
              return (
                <div
                  key={c.code}
                  onClick={() => setTempCountry(c.code)}
                  className="p-2.5 rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between border select-none"
                  style={{
                    background: isSelected ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                    borderColor: isSelected ? "rgba(99, 102, 241, 0.4)" : "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{c.label}</div>
                      <div className="text-[10px] text-slate-400">{c.desc}</div>
                    </div>
                  </div>

                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center transition-all shrink-0"
                    style={{
                      border: `1.5px solid ${isSelected ? "#818cf8" : "rgba(255, 255, 255, 0.2)"}`,
                      background: isSelected ? "#6366f1" : "transparent",
                    }}
                  >
                    {isSelected && <Check size={10} className="text-white stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location Specific Input & Toggle */}
          {tempCountry !== "ALL" ? (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300">
                  All locations in {tempCountry === "US" ? "the US" : tempCountry === "CA" ? "Canada" : "the UK"}
                </span>
                <div
                  onClick={() => setTempAllLocations(!tempAllLocations)}
                  className="w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer flex items-center"
                  style={{
                    background: tempAllLocations ? "#6366f1" : "rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${
                      tempAllLocations ? "translate-x-3.5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {!tempAllLocations && (
                <div className="mt-2.5 animate-fade-in-up">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Enter city or province (e.g. Seattle, Toronto)"
                      value={tempCity}
                      onChange={(e) => setTempCity(e.target.value)}
                      className="input-field pl-8.5 text-xs h-9 bg-black/40 border-white/10"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {POPULAR_HUBS.slice(0, 6).map((hub) => (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => setTempCity(hub)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        style={{
                          background: tempCity === hub ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.04)",
                          color: tempCity === hub ? "#a5b4fc" : "#94a3b8",
                          border: `1px solid ${tempCity === hub ? "rgba(99, 102, 241, 0.5)" : "transparent"}`,
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
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-4">
              <div className="text-[11px] font-semibold text-slate-300 mb-2">
                Filter by City / Hub (Optional)
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter city or region (e.g. San Francisco, London)"
                  value={tempCity}
                  onChange={(e) => setTempCity(e.target.value)}
                  className="input-field pl-8.5 text-xs h-9 bg-black/40 border-white/10"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {POPULAR_HUBS.slice(0, 6).map((hub) => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setTempCity(hub)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    style={{
                      background: tempCity === hub ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.04)",
                      color: tempCity === hub ? "#a5b4fc" : "#94a3b8",
                      border: `1px solid ${tempCity === hub ? "rgba(99, 102, 241, 0.5)" : "transparent"}`,
                    }}
                  >
                    {hub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs py-2 px-5 rounded-xl font-bold cursor-pointer shadow-lg"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
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
