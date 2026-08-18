"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
  icon?: React.ElementType;
}

export default function CustomDropdown({ value, onChange, options, placeholder, icon: TriggerIcon }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const isFiltered = Boolean(value);

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
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
          whiteSpace: "nowrap",
          background: isFiltered ? "rgba(99, 102, 241, 0.08)" : "rgba(255,255,255,0.04)",
          borderColor: isFiltered ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.06)",
          color: isFiltered ? "#c7d2fe" : "#a1a1aa",
        }}
      >
        {TriggerIcon && <TriggerIcon size={14} style={{ color: isFiltered ? "#a5b4fc" : "#52525b", flexShrink: 0 }} />}
        <span>{displayLabel}</span>
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

      {/* Dropdown Panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 9999,
            marginTop: 6,
            minWidth: "100%",
            borderRadius: 12,
            padding: 4,
            background: "#0f0f12",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 16px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
            animation: "fadeInUp 0.12s ease-out",
          }}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "inherit",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  transition: "all 0.1s ease",
                  background: isSelected ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  color: isSelected ? "#c7d2fe" : "#a1a1aa",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#d4d4d8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#a1a1aa";
                  }
                }}
              >
                {Icon && <Icon size={14} style={{ color: isSelected ? "#a5b4fc" : "#52525b", flexShrink: 0 }} />}
                <span style={{ flex: 1 }}>{option.label}</span>
                {isSelected && <Check size={13} style={{ color: "#a5b4fc", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
