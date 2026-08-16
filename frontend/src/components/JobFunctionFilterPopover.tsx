"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Briefcase, Search, ChevronDown, X, Check, Sparkles } from "lucide-react";

export interface JobFunctionCategory {
  categoryName: string;
  subFunctions: string[];
}

export const JOB_FUNCTION_GROUPS: JobFunctionCategory[] = [
  {
    categoryName: "Software Engineering",
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
    categoryName: "Cybersecurity & Cloud Infrastructure",
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

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Trigger Button Pill */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all select-none cursor-pointer"
        style={{
          background: selectedFunctions.length > 0 ? "rgba(0, 240, 160, 0.12)" : "var(--bg-input)",
          border: `1px solid ${selectedFunctions.length > 0 ? "rgba(0, 240, 160, 0.4)" : "var(--border-subtle)"}`,
          color: selectedFunctions.length > 0 ? "#00f0a0" : "var(--text-secondary)",
        }}
      >
        <Briefcase size={13} style={{ color: selectedFunctions.length > 0 ? "#00f0a0" : "var(--text-muted)" }} />
        <span>{getTriggerLabel()}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Card Matching Jobright Screenshot 2 */}
      {open && (
        <div
          className="absolute z-50 mt-2 w-[340px] sm:w-[460px] max-h-[560px] overflow-hidden flex flex-col rounded-2xl shadow-2xl p-5 animate-fade-in-up"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-medium)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "#00f0a0" }}>*</span> Job Function
            </span>
            {tempSelected.length > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {tempSelected.length} selected
              </span>
            )}
          </div>

          {/* Selected Pills Container with Mint Background matching Screenshot 2 */}
          {tempSelected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl mb-3 max-h-32 overflow-y-auto" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
              {tempSelected.map((fn) => (
                <span
                  key={fn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(0, 240, 160, 0.15)",
                    color: "#00f0a0",
                    border: "1px solid rgba(0, 240, 160, 0.35)",
                  }}
                >
                  {fn}
                  <button
                    type="button"
                    onClick={(e) => removeFunction(fn, e)}
                    className="hover:opacity-80 p-0.5 rounded cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-hide text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className="px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors"
              style={{
                background: activeTab === "All" ? "rgba(255,255,255,0.1)" : "transparent",
                color: activeTab === "All" ? "white" : "var(--text-muted)",
              }}
            >
              All
            </button>
            {JOB_FUNCTION_GROUPS.map((g) => (
              <button
                key={g.categoryName}
                type="button"
                onClick={() => setActiveTab(g.categoryName)}
                className="px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors"
                style={{
                  background: activeTab === g.categoryName ? "rgba(255,255,255,0.1)" : "transparent",
                  color: activeTab === g.categoryName ? "white" : "var(--text-muted)",
                }}
              >
                {g.categoryName.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Subcategory Pills Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-56 mb-3">
            {filteredGroups.map((group) => (
              <div key={group.categoryName}>
                <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  {group.categoryName}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.subFunctions.map((fn) => {
                    const isSelected = tempSelected.includes(fn);
                    return (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => toggleFunction(fn)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                        style={{
                          background: isSelected ? "rgba(0, 240, 160, 0.15)" : "rgba(255,255,255,0.04)",
                          color: isSelected ? "#00f0a0" : "var(--text-secondary)",
                          border: `1px solid ${isSelected ? "rgba(0, 240, 160, 0.35)" : "var(--border-subtle)"}`,
                        }}
                      >
                        {fn}
                        {isSelected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Search / Custom input at bottom matching Jobright */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-3 text-muted pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search or enter expected job function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold transition-colors hover:text-white cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              Clear All
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs py-1.5 px-4 rounded-xl cursor-pointer"
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
