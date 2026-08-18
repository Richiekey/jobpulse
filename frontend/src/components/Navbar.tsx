"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { User, LogIn, FileText, Table, LogOut, ChevronDown, Sparkles, Bookmark, ShieldCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent-main), var(--accent-glow))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            JP
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            JobPulse
          </span>
        </Link>

        {/* Nav Links + Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
              Jobs
            </Link>
            <Link href="/saved" className={`nav-link ${pathname === "/saved" ? "active" : ""}`}>
              <Bookmark size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Saved
            </Link>
            {isAdmin && (
              <Link href="/admin" className={`nav-link ${pathname === "/admin" ? "active" : ""}`} style={{ color: pathname === "/admin" ? "#ffffff" : "#c084fc" }}>
                <ShieldCheck size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                Admin
              </Link>
            )}
            <Link href="/import" className={`nav-link ${pathname === "/import" ? "active" : ""}`}>
              Import
            </Link>
            <Link href="/health" className={`nav-link ${pathname === "/health" ? "active" : ""}`}>
              Health
            </Link>
            {user && (
              <Link href="/applications" className={`nav-link ${pathname === "/applications" ? "active" : ""}`}>
                Applications
              </Link>
            )}
          </nav>

          <div style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />

          {/* User Profile / Login */}
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: 999,
                  padding: "5px 12px 5px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <span>{profile?.full_name?.split(" ")[0] || user.email?.split("@")[0]}</span>
                <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 90 }}
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div
                    className="glass-card animate-slide-in"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: 220,
                      borderRadius: 12,
                      padding: "8px",
                      zIndex: 100,
                      boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          {profile?.full_name || "Job Seeker"}
                        </div>
                        {isAdmin && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                            padding: "2px 6px", borderRadius: 4,
                            background: "rgba(168,85,247,0.15)", color: "#c084fc",
                            border: "1px solid rgba(168,85,247,0.3)",
                          }}>Admin</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.email}
                      </div>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        borderRadius: 8,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <User size={15} style={{ color: "var(--accent-glow)" }} /> Profile & Details
                    </Link>

                    <Link
                      href="/saved"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        borderRadius: 8,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Bookmark size={15} style={{ color: "#818cf8" }} /> Saved Jobs Catalogue
                    </Link>

                    <Link
                      href="/applications"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        borderRadius: 8,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FileText size={15} style={{ color: "#34d399" }} /> My Applications
                    </Link>

                    {profile?.google_sheet_url && (
                      <a
                        href={profile.google_sheet_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          fontSize: 13,
                          color: "#34d399",
                          textDecoration: "none",
                          borderRadius: 8,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Table size={15} /> Google Sheet
                      </a>
                    )}

                    <div style={{ height: 1, background: "var(--border-subtle)", margin: "6px 0" }} />

                    <button
                      onClick={() => { setDropdownOpen(false); signOut(); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "var(--danger)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: 8,
                        transition: "background 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="btn-primary"
              style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            >
              <LogIn size={13} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
