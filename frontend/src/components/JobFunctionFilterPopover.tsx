"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Briefcase, Search, ChevronDown, X, Check, Sparkles } from "lucide-react";

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
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all select-none cursor-pointer border"
        style={{
          background: isFiltered ? "rgba(0, 240, 160, 0.12)" : "rgba(255, 255, 255, 0.04)",
          borderColor: isFiltered ? "rgba(0, 240, 160, 0.4)" : "rgba(255, 255, 255, 0.08)",
          color: isFiltered ? "#00f0a0" : "var(--text-secondary)",
        }}
      >
        <Briefcase size={14} style={{ color: isFiltered ? "#00f0a0" : "var(--text-muted)" }} />
        <span>{getTriggerLabel()}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
      </button>

      {/* Popover Card Matching Jobright Screenshot 2 */}
      {open && (
        <div
          className="absolute left-0 sm:left-auto z-50 mt-2 w-[340px] sm:w-[480px] max-h-[580px] overflow-hidden flex flex-col rounded-2xl shadow-2xl p-5 animate-fade-in-up border"
          style={{
            background: "#12141a",
            borderColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "#00f0a0" }}>*</span> Job Function
            </span>
            {tempSelected.length > 0 ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0, 240, 160, 0.15)", color: "#00f0a0" }}>
                {tempSelected.length} selected
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Select one or multiple</span>
            )}
          </div>

          {/* Selected Pills Container with Mint Background matching Screenshot 2 */}
          {tempSelected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl mb-3 max-h-28 overflow-y-auto" style={{ background: "rgba(0, 240, 160, 0.04)", border: "1px solid rgba(0, 240, 160, 0.15)" }}>
              {tempSelected.map((fn) => (
                <span
                  key={fn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(0, 240, 160, 0.18)",
                    color: "#00f0a0",
                    border: "1px solid rgba(0, 240, 160, 0.4)",
                  }}
                >
                  {fn}
                  <button
                    type="button"
                    onClick={(e) => removeFunction(fn, e)}
                    className="hover:opacity-80 p-0.5 rounded cursor-pointer transition-transform active:scale-90"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer"
              style={{
                background: activeTab === "All" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.02)",
                color: activeTab === "All" ? "white" : "var(--text-muted)",
                border: `1px solid ${activeTab === "All" ? "rgba(255,255,255,0.2)" : "transparent"}`,
              }}
            >
              All
            </button>
            {JOB_FUNCTION_GROUPS.map((g) => (
              <button
                key={g.categoryName}
                type="button"
                onClick={() => setActiveTab(g.categoryName)}
                className="px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5"
                style={{
                  background: activeTab === g.categoryName ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.02)",
                  color: activeTab === g.categoryName ? "white" : "var(--text-muted)",
                  border: `1px solid ${activeTab === g.categoryName ? "rgba(255,255,255,0.2)" : "transparent"}`,
                }}
              >
                <span>{g.icon}</span>
                <span>{g.categoryName.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Subcategory Pills Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-56 mb-3">
            {filteredGroups.map((group) => (
              <div key={group.categoryName}>
                <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none"
                        style={{
                          background: isSelected ? "rgba(0, 240, 160, 0.18)" : "rgba(255,255,255,0.04)",
                          color: isSelected ? "#00f0a0" : "var(--text-secondary)",
                          border: `1px solid ${isSelected ? "rgba(0, 240, 160, 0.45)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        {fn}
                        {isSelected ? <Check size={12} className="text-emerald-400" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Search / Custom input at bottom matching Jobright */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-3 text-muted pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search or enter expected job function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3.5 border-t border-white/10">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold transition-colors hover:text-white cursor-pointer px-2 py-1"
              style={{ color: "var(--text-muted)" }}
            >
              Clear All
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs py-2 px-5 rounded-xl cursor-pointer shadow-lg font-bold"
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
