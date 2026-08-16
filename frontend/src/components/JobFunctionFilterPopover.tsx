"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Briefcase, Search, ChevronDown, X, Check, Sparkles, Layers } from "lucide-react";

export interface JobFunctionCategory {
  categoryName: string;
  icon: string;
  subFunctions: string[];
}

export const JOB_FUNCTION_GROUPS: JobFunctionCategory[] = [
  {
    categoryName: "Software Engineering",
    icon: "💻",
    subFunctions: [
      "Full Stack Engineer",
      "Backend Engineer",
      "Frontend Software Engineer",
      "Python Engineer",
      "Java Engineer",
      "C/C++ Engineer",
      ".Net Engineer",
      "Systems Engineer",
      "DevOps",
      "Mobile Engineer",
      "QA / Test Automation",
    ],
  },
  {
    categoryName: "Data & AI / Machine Learning",
    icon: "🤖",
    subFunctions: [
      "Data Analyst",
      "Data Scientist",
      "Data Engineer",
      "Machine Learning Engineer",
      "AI Engineer",
      "Machine Learning/AI Researcher",
      "Machine Learning, Deep Learning",
      "LLM Engineer",
      "Machine Learning, Computer Vision",
      "NLP Engineer",
    ],
  },
  {
    categoryName: "Cybersecurity & Cloud",
    icon: "🛡️",
    subFunctions: [
      "Cyber Security Engineer",
      "Cloud Security Engineer",
      "Network Security Engineer",
      "Cloud Architect",
      "Site Reliability Engineer (SRE)",
      "Infrastructure Engineer",
    ],
  },
  {
    categoryName: "Product & Design",
    icon: "🎨",
    subFunctions: [
      "Product Manager",
      "Technical Program Manager",
      "Product Designer",
      "UI/UX Designer",
      "Scrum Master / Agile Coach",
    ],
  },
  {
    categoryName: "Business & Operations",
    icon: "📊",
    subFunctions: [
      "Account Executive",
      "Sales Development Rep",
      "Marketing Specialist",
      "Operations Associate",
      "Financial Analyst",
    ],
  },
];

interface JobFunctionFilterPopoverProps {
  selectedFunctions: string[];
  onChange: (functions: string[]) => void;
}

export default function JobFunctionFilterPopover({ selectedFunctions, onChange }: JobFunctionFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedFunctions);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync internal state with props
  useEffect(() => {
    setTempSelected(selectedFunctions);
  }, [selectedFunctions, open]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleFunction = (fnName: string) => {
    if (tempSelected.includes(fnName)) {
      setTempSelected(tempSelected.filter((f) => f !== fnName));
    } else {
      setTempSelected([...tempSelected, fnName]);
    }
  };

  const removeFunction = (fnName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempSelected(tempSelected.filter((f) => f !== fnName));
  };

  const handleConfirm = () => {
    onChange(tempSelected);
    setOpen(false);
  };

  const handleClear = () => {
    setTempSelected([]);
    onChange([]);
    setOpen(false);
  };

  // Filter list by active tab and search query
  const filteredGroups = useMemo(() => {
    return JOB_FUNCTION_GROUPS.map((group) => {
      if (activeTab !== "All" && group.categoryName !== activeTab) {
        return null;
      }
      const matched = group.subFunctions.filter((fn) =>
        fn.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      if (matched.length === 0) return null;
      return {
        ...group,
        subFunctions: matched,
      };
    }).filter(Boolean) as JobFunctionCategory[];
  }, [searchQuery, activeTab]);

  // Trigger button label
  const getTriggerLabel = () => {
    if (selectedFunctions.length === 0) return "All Job Functions";
    if (selectedFunctions.length === 1) return selectedFunctions[0];
    return `${selectedFunctions[0]} (+${selectedFunctions.length - 1})`;
  };

  const isFiltered = selectedFunctions.length > 0;

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Trigger Button Pill */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 select-none cursor-pointer border"
        style={{
          background: isFiltered
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(5, 150, 105, 0.08))"
            : "rgba(255, 255, 255, 0.03)",
          borderColor: isFiltered ? "rgba(16, 185, 129, 0.45)" : "rgba(255, 255, 255, 0.08)",
          color: isFiltered ? "#34d399" : "#94a3b8",
          boxShadow: isFiltered ? "0 0 15px rgba(16, 185, 129, 0.15)" : "none",
        }}
      >
        <Briefcase size={14} style={{ color: isFiltered ? "#34d399" : "#64748b" }} />
        <span className="truncate max-w-[150px]">{getTriggerLabel()}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-emerald-400" : "text-slate-500"}`}
        />
      </button>

      {/* Popover Card */}
      {open && (
        <div
          className="absolute left-0 z-50 mt-2.5 w-[340px] sm:w-[480px] max-h-[580px] overflow-hidden flex flex-col rounded-2xl p-5 animate-fade-in-up border"
          style={{
            background: "#141721",
            borderColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Layers size={13} />
              </div>
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Select Job Functions
              </span>
            </div>

            {tempSelected.length > 0 ? (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {tempSelected.length} Selected
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Multi-select enabled</span>
            )}
          </div>

          {/* Selected Mint Tags Area */}
          {tempSelected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl mb-3 max-h-24 overflow-y-auto bg-emerald-500/[0.04] border border-emerald-500/20">
              {tempSelected.map((fn) => (
                <span
                  key={fn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                >
                  <span>{fn}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFunction(fn, e)}
                    className="hover:opacity-80 p-0.5 rounded cursor-pointer transition-transform active:scale-90"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2.5 scrollbar-hide text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer"
              style={{
                background: activeTab === "All" ? "rgba(255,255,255,0.12)" : "transparent",
                color: activeTab === "All" ? "white" : "#94a3b8",
                border: `1px solid ${activeTab === "All" ? "rgba(255,255,255,0.2)" : "transparent"}`,
              }}
            >
              All Roles
            </button>
            {JOB_FUNCTION_GROUPS.map((g) => (
              <button
                key={g.categoryName}
                type="button"
                onClick={() => setActiveTab(g.categoryName)}
                className="px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5"
                style={{
                  background: activeTab === g.categoryName ? "rgba(255,255,255,0.12)" : "transparent",
                  color: activeTab === g.categoryName ? "white" : "#94a3b8",
                  border: `1px solid ${activeTab === g.categoryName ? "rgba(255,255,255,0.2)" : "transparent"}`,
                }}
              >
                <span>{g.icon}</span>
                <span>{g.categoryName.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Subcategory Pills Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 max-h-52 mb-3">
            {filteredGroups.map((group) => (
              <div key={group.categoryName}>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  <span>{group.categoryName}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.subFunctions.map((fn) => {
                    const isSelected = tempSelected.includes(fn);
                    return (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => toggleFunction(fn)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer select-none border"
                        style={{
                          background: isSelected ? "rgba(16, 185, 129, 0.18)" : "rgba(255,255,255,0.03)",
                          color: isSelected ? "#34d399" : "#cbd5e1",
                          borderColor: isSelected ? "rgba(16, 185, 129, 0.45)" : "rgba(255,255,255,0.06)",
                        }}
                      >
                        <span>{fn}</span>
                        {isSelected && <Check size={12} className="text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Search / Custom input at bottom */}
          <div className="relative mb-3.5">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search or enter expected job function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-8.5 text-xs h-9 bg-black/40 border-white/10"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
            >
              Clear All
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs py-2 px-5 rounded-xl font-bold cursor-pointer shadow-lg"
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
              }}
            >
              Confirm {tempSelected.length > 0 ? `(${tempSelected.length})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
