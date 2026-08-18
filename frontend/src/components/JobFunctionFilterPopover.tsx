"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Briefcase, Search, ChevronDown, X, Check, Layers, Terminal, BrainCircuit, ShieldAlert, Palette, LineChart } from "lucide-react";

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
      "Full Stack Engineer", "Backend Engineer", "Frontend Software Engineer",
      "Python Engineer", "Java Engineer", "C/C++ Engineer", ".Net Engineer",
      "Systems Engineer", "DevOps", "Mobile Engineer", "QA / Test Automation",
    ],
  },
  {
    categoryName: "Data & AI / ML",
    icon: BrainCircuit,
    subFunctions: [
      "Data Analyst", "Data Scientist", "Data Engineer", "Machine Learning Engineer",
      "AI Engineer", "Machine Learning/AI Researcher", "Machine Learning, Deep Learning",
      "LLM Engineer", "Machine Learning, Computer Vision", "NLP Engineer",
    ],
  },
  {
    categoryName: "Cybersecurity & Cloud",
    icon: ShieldAlert,
    subFunctions: [
      "Cyber Security Engineer", "Cloud Security Engineer", "Network Security Engineer",
      "Cloud Architect", "Site Reliability Engineer (SRE)", "Infrastructure Engineer",
    ],
  },
  {
    categoryName: "Product & Design",
    icon: Palette,
    subFunctions: [
      "Product Manager", "Technical Program Manager", "Product Designer",
      "UI/UX Designer", "Scrum Master / Agile Coach",
    ],
  },
  {
    categoryName: "Business & Ops",
    icon: LineChart,
    subFunctions: [
      "Account Executive", "Sales Development Rep", "Marketing Specialist",
      "Operations Associate", "Financial Analyst",
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

  useEffect(() => { setTempSelected(selectedFunctions); }, [selectedFunctions, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleFunction = (fnName: string) => {
    setTempSelected(prev => prev.includes(fnName) ? prev.filter(f => f !== fnName) : [...prev, fnName]);
  };

  const handleConfirm = () => { onChange(tempSelected); setOpen(false); };
  const handleClear = () => { setTempSelected([]); onChange([]); setOpen(false); };

  const filteredGroups = useMemo(() => {
    return JOB_FUNCTION_GROUPS.map((group) => {
      if (activeTab !== "All" && group.categoryName !== activeTab) return null;
      const matched = group.subFunctions.filter(fn => fn.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      if (matched.length === 0) return null;
      return { ...group, subFunctions: matched };
    }).filter(Boolean) as JobFunctionCategory[];
  }, [searchQuery, activeTab]);

  const getTriggerLabel = () => {
    if (selectedFunctions.length === 0) return "All Job Functions";
    if (selectedFunctions.length === 1) return selectedFunctions[0];
    return `${selectedFunctions[0]} (+${selectedFunctions.length - 1})`;
  };

  const isFiltered = selectedFunctions.length > 0;

  const tabStyle = (active: boolean) => ({
    fontSize: 11,
    fontWeight: 500 as const,
    padding: "5px 10px",
    borderRadius: 8,
    cursor: "pointer" as const,
    border: "1px solid",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    whiteSpace: "nowrap" as const,
    display: "inline-flex",
    alignItems: "center" as const,
    gap: 5,
    background: active ? "rgba(99, 102, 241, 0.1)" : "transparent",
    color: active ? "#c7d2fe" : "#71717a",
    borderColor: active ? "rgba(99, 102, 241, 0.2)" : "transparent",
  });

  const chipStyle = (selected: boolean) => ({
    display: "inline-flex",
    alignItems: "center" as const,
    gap: 5,
    fontSize: 12,
    fontWeight: 500 as const,
    padding: "6px 12px",
    borderRadius: 10,
    cursor: "pointer" as const,
    border: "1px solid",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    background: selected ? "rgba(99, 102, 241, 0.1)" : "rgba(255,255,255,0.02)",
    color: selected ? "#c7d2fe" : "#a1a1aa",
    borderColor: selected ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.05)",
  });

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
      {/* Trigger */}
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
        <Briefcase size={14} style={{ color: isFiltered ? "#a5b4fc" : "#71717a" }} />
        <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getTriggerLabel()}</span>
        <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)", color: open ? "#a1a1aa" : "#52525b", flexShrink: 0 }} />
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute",
          left: 0,
          zIndex: 9999,
          marginTop: 10,
          width: 500,
          maxHeight: 560,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          padding: 20,
          background: "#0f0f12",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
          animation: "fadeInUp 0.15s ease-out",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={14} style={{ color: "#71717a" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Select Job Functions
              </span>
            </div>
            {tempSelected.length > 0 ? (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "rgba(99, 102, 241, 0.1)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                {tempSelected.length} selected
              </span>
            ) : (
              <span style={{ fontSize: 11, color: "#52525b" }}>Multi-select</span>
            )}
          </div>

          {/* Selected chips */}
          {tempSelected.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, borderRadius: 10, marginBottom: 12, maxHeight: 80, overflowY: "auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              {tempSelected.map(fn => (
                <span key={fn} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 500, background: "rgba(99, 102, 241, 0.1)", color: "#c7d2fe", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                  {fn}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTempSelected(prev => prev.filter(f => f !== fn)); }}
                    style={{ cursor: "pointer", background: "none", border: "none", color: "#71717a", padding: 1, display: "flex" }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => setActiveTab("All")} style={tabStyle(activeTab === "All")}>All Roles</button>
            {JOB_FUNCTION_GROUPS.map(g => {
              const Icon = g.icon;
              return (
                <button key={g.categoryName} type="button" onClick={() => setActiveTab(g.categoryName)} style={tabStyle(activeTab === g.categoryName)}>
                  <Icon size={12} />
                  <span>{g.categoryName.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Function List */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 200, marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredGroups.map(group => {
              const Icon = group.icon;
              return (
                <div key={group.categoryName}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Icon size={12} style={{ color: "#52525b" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {group.categoryName}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {group.subFunctions.map(fn => {
                      const isSel = tempSelected.includes(fn);
                      return (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => toggleFunction(fn)}
                          style={chipStyle(isSel)}
                          onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#d4d4d8"; } }}
                          onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#a1a1aa"; } }}
                        >
                          <span>{fn}</span>
                          {isSel && <Check size={11} style={{ color: "#a5b4fc" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#52525b", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search job functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px 0 34px",
                borderRadius: 10,
                fontSize: 12,
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e4e4e7",
                outline: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              type="button"
              onClick={handleClear}
              style={{ fontSize: 12, fontWeight: 500, color: "#71717a", cursor: "pointer", background: "none", border: "none", padding: "6px 8px", fontFamily: "inherit" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; }}
            >
              Clear All
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
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Confirm {tempSelected.length > 0 ? `(${tempSelected.length})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
