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
    onChange({
      country: "ALL",
      allLocationsInCountry: true,
      cityOrState: "",
    });
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

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-medium transition-all duration-200 select-none cursor-pointer border"
        style={{
          background: isFiltered ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
          borderColor: isFiltered ? "rgba(255, 255, 255, 0.2)" : "transparent",
          color: isFiltered ? "#f4f4f5" : "#a1a1aa",
        }}
      >
        <MapPin size={14} style={{ color: isFiltered ? "#fff" : "#71717a" }} />
        <span className="truncate max-w-[130px]">{getTriggerLabel()}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-zinc-300" : "text-zinc-500"}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-2.5 w-[330px] sm:w-[380px] rounded-2xl p-5 animate-fade-in-up border"
          style={{
            background: "#09090b",
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Country & Region
              </span>
            </div>
            {isFiltered && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                Filter Active
              </span>
            )}
          </div>

          <div className="space-y-1.5 mb-4">
            {COUNTRIES.map((c) => {
              const isSelected = tempCountry === c.code;
              const Icon = c.icon;
              return (
                <div
                  key={c.code}
                  onClick={() => setTempCountry(c.code)}
                  className="p-2.5 rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between border select-none hover:bg-white/[0.04]"
                  style={{
                    background: isSelected ? "rgba(255, 255, 255, 0.06)" : "transparent",
                    borderColor: isSelected ? "rgba(255, 255, 255, 0.15)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800/50 text-zinc-400'}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">{c.label}</div>
                      <div className="text-[10px] text-zinc-500">{c.desc}</div>
                    </div>
                  </div>

                  {isSelected && <Check size={14} className="text-zinc-300" />}
                </div>
              );
            })}
          </div>

          {tempCountry !== "ALL" ? (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-zinc-400">
                  All locations in {tempCountry === "US" ? "the US" : tempCountry === "CA" ? "Canada" : "the UK"}
                </span>
                <div
                  onClick={() => setTempAllLocations(!tempAllLocations)}
                  className="w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer flex items-center"
                  style={{
                    background: tempAllLocations ? "#fff" : "rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${
                      tempAllLocations ? "translate-x-3.5 bg-zinc-900" : "translate-x-0 bg-zinc-400"
                    }`}
                  />
                </div>
              </div>

              {!tempAllLocations && (
                <div className="mt-2.5 animate-fade-in-up">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Enter city or province (e.g. Seattle, Toronto)"
                      value={tempCity}
                      onChange={(e) => setTempCity(e.target.value)}
                      className="w-full pl-8.5 pr-3 text-xs h-9 bg-black/40 border border-white/10 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {POPULAR_HUBS.slice(0, 6).map((hub) => (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => setTempCity(hub)}
                        className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer border"
                        style={{
                          background: tempCity === hub ? "rgba(255, 255, 255, 0.1)" : "transparent",
                          color: tempCity === hub ? "#fff" : "#a1a1aa",
                          borderColor: tempCity === hub ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
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
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4">
              <div className="text-[11px] font-medium text-zinc-400 mb-2">
                Filter by City / Hub (Optional)
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter city or region (e.g. San Francisco, London)"
                  value={tempCity}
                  onChange={(e) => setTempCity(e.target.value)}
                  className="w-full pl-8.5 pr-3 text-xs h-9 bg-black/40 border border-white/10 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {POPULAR_HUBS.slice(0, 6).map((hub) => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setTempCity(hub)}
                    className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer border hover:border-white/20 hover:text-zinc-300"
                    style={{
                      background: tempCity === hub ? "rgba(255, 255, 255, 0.1)" : "transparent",
                      color: tempCity === hub ? "#fff" : "#a1a1aa",
                      borderColor: tempCity === hub ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {hub}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-2 py-1"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs py-2 px-5 rounded-xl font-semibold cursor-pointer text-zinc-900 bg-zinc-100 hover:bg-white transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
