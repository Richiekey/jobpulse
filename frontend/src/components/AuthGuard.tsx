"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Lock, Sparkles } from "lucide-react";

/**
 * AuthGuard wraps all app content.
 * - Shows a loading spinner while checking auth state.
 * - If user is not logged in, shows the login form inline.
 * - The /auth/login route is also allowed through (for direct URL visits).
 */

// Routes that don't require authentication
const PUBLIC_PATHS = ["/auth/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // Loading state — show centered spinner
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: "#818cf8" }} />
        <span style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  // Not authenticated — show lock screen
  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
          padding: "0 24px",
        }}
        className="animate-fade-in-up"
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            boxShadow: "0 0 40px rgba(99,102,241,0.3)",
          }}
        >
          <Lock size={28} color="#fff" />
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "0 0 8px",
          }}
        >
          Sign in to JobPulse
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: 15,
            maxWidth: 400,
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          This application is invite-only. Please sign in with your authorized account to continue.
        </p>
        <a
          href="/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
            transition: "all 0.15s ease",
          }}
        >
          <Sparkles size={16} />
          Sign In
        </a>
      </div>
    );
  }

  // Authenticated — render the app
  return <>{children}</>;
}
