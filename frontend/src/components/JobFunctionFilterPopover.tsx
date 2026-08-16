"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Briefcase, Search, ChevronDown, X, Check, Layers, Code, BrainCircuit, ShieldAlert, Palette, LineChart, Terminal } from "lucide-react";

export interface JobFunctionCategory {
  categoryName: string;
  icon: React.ElementType;
  subFunctions: string[];
}

export const JOB_FUNCTION_GROUPS: JobFunctionCategory[] = [
  {
    categoryName: "Software Engineering",
    icon: Terminal,
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
    categoryName: "Data & AI / ML",
    icon: BrainCircuit,
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
    icon: ShieldAlert,
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
    icon: Palette,
    subFunctions: [
      "Product Manager",
      "Technical Program Manager",
      "Product Designer",
      "UI/UX Designer",
      "Scrum Master / Agile Coach",
    ],
  },
  {
    categoryName: "Business & Ops",
    icon: LineChart,
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

  useEffect(() => {
    setTempSelected(selectedFunctions);
  }, [selectedFunctions, open]);

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

  const getTriggerLabel = () => {
    if (selectedFunctions.length === 0) return "All Job Functions";
    if (selectedFunctions.length === 1) return selectedFunctions[0];
    return `${selectedFunctions[0]} (+${selectedFunctions.length - 1})`;
  };

  const isFiltered = selectedFunctions.length > 0;

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
        <Briefcase size={14} style={{ color: isFiltered ? "#fff" : "#71717a" }} />
        <span className="truncate max-w-[150px]">{getTriggerLabel()}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-zinc-300" : "text-zinc-500"}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-2.5 w-[340px] sm:w-[480px] max-h-[580px] overflow-hidden flex flex-col rounded-2xl p-5 animate-fade-in-up border"
          style={{
            background: "#09090b",
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3.5">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Job Functions
              </span>
            </div>

            {tempSelected.length > 0 ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                {tempSelected.length} Selected
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500">Multi-select enabled</span>
            )}
          </div>

          {tempSelected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl mb-3 max-h-24 overflow-y-auto bg-white/[0.02] border border-white/5">
              {tempSelected.map((fn) => (
                <span
                  key={fn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-white/10 text-zinc-200 border border-white/10"
                >
                  <span>{fn}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFunction(fn, e)}
                    className="hover:opacity-80 hover:text-white text-zinc-400 p-0.5 rounded cursor-pointer transition-transform active:scale-90"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-hide text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer border"
              style={{
                background: activeTab === "All" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                color: activeTab === "All" ? "#fff" : "#a1a1aa",
                borderColor: activeTab === "All" ? "rgba(255, 255, 255, 0.2)" : "transparent",
              }}
            >
              All Roles
            </button>
            {JOB_FUNCTION_GROUPS.map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.categoryName}
                  type="button"
                  onClick={() => setActiveTab(g.categoryName)}
                  className="px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 border"
                  style={{
                    background: activeTab === g.categoryName ? "rgba(255, 255, 255, 0.1)" : "transparent",
                    color: activeTab === g.categoryName ? "#fff" : "#a1a1aa",
                    borderColor: activeTab === g.categoryName ? "rgba(255, 255, 255, 0.2)" : "transparent",
                  }}
                >
                  <Icon size={13} className={activeTab === g.categoryName ? "text-zinc-200" : "text-zinc-500"} />
                  <span>{g.categoryName.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 max-h-52 mb-3">
            {filteredGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.categoryName}>
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Icon size={12} />
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
                            background: isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.02)",
                            color: isSelected ? "#fff" : "#a1a1aa",
                            borderColor: isSelected ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.06)",
                          }}
                        >
                          <span>{fn}</span>
                          {isSelected && <Check size={12} className="text-zinc-300 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative mb-3.5">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search or enter expected job function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 text-xs h-9 bg-black/40 border border-white/10 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-2 py-1"
            >
              Clear All
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs py-2 px-5 rounded-xl font-semibold cursor-pointer text-zinc-900 bg-zinc-100 hover:bg-white transition-colors"
            >
              Confirm {tempSelected.length > 0 ? `(${tempSelected.length})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
