"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  FileText, Building2, MapPin, Calendar, ExternalLink, Table,
  CheckCircle2, AlertCircle, Loader2, ArrowLeft, Search, Sparkles,
  Trash2, RotateCcw, Check
} from "lucide-react";

interface ApplicationItem {
  id: string;
  job_id: string;
  company_name: string;
  job_title: string;
  job_url: string;
  location?: string;
  salary?: string;
  source?: string;
  applied_at: string;
  synced_to_sheet: boolean;
  sync_error?: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unmarkingIds, setUnmarkingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUnmarkApplication = async (app: ApplicationItem) => {
    setUnmarkingIds((prev) => new Set(prev).add(app.id));

    try {
      // 1. Remove from database
      const res = await fetch(`/api/sync/sheet?id=${app.id}&userId=${user?.id || ""}&jobId=${app.job_id || ""}`, {
        method: "DELETE",
      });

      // 2. Remove from local storage jp_applied & jp_hidden so it returns to active rotation
      if (typeof window !== "undefined") {
        try {
          const targetJobId = app.job_id || app.id;
          
          const appliedList: string[] = JSON.parse(localStorage.getItem("jp_applied") || "[]");
          const nextApplied = appliedList.filter((id) => id !== targetJobId && id !== app.id && id !== app.job_id);
          localStorage.setItem("jp_applied", JSON.stringify(nextApplied));

          const hiddenList: string[] = JSON.parse(localStorage.getItem("jp_hidden") || "[]");
          const nextHidden = hiddenList.filter((id) => id !== targetJobId && id !== app.id && id !== app.job_id);
          localStorage.setItem("jp_hidden", JSON.stringify(nextHidden));

          window.dispatchEvent(new Event("jp_storage_update"));
        } catch {}
      }

      // 3. Update local state
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      showToast(`Unmarked ${app.job_title} at ${app.company_name} — restored to active feed!`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to unmark application", "warning");
    } finally {
      setUnmarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(app.id);
        return next;
      });
    }
  };

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (data && !error) {
        setApplications(data as ApplicationItem[]);
      }
    } catch (e) {
      console.error("Error fetching applications:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchApplications();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.id, authLoading, fetchApplications]);

  if (authLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-glow)", margin: "0 auto" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="animate-fade-in-up" style={{ maxWidth: 460, margin: "60px auto", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: 36 }}>
          <FileText size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Sign in required</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Sign in to access your applied jobs history and real-time Google Sheets tracking.
          </p>
          <button className="btn-primary" onClick={() => router.push("/auth/login")} style={{ width: "100%", justifyContent: "center" }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const filtered = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    return (
      app.company_name.toLowerCase().includes(q) ||
      app.job_title.toLowerCase().includes(q) ||
      (app.location && app.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 1000, margin: "0 auto 80px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={14} /> Back to Jobs
          </button>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={26} style={{ color: "var(--accent-glow)" }} />
            My Applications
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
            Track all submitted applications and their Google Sheets synchronization status
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {profile?.google_sheet_url && (
            <a
              href={profile.google_sheet_url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, borderColor: "rgba(52,211,153,0.3)" }}
            >
              <Table size={15} style={{ color: "#34d399" }} /> Open Google Sheet <ExternalLink size={12} />
            </a>
          )}
          <button className="btn-primary" onClick={() => router.push("/profile")} style={{ padding: "8px 14px" }}>
            Profile & Sync Settings
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div
        className="glass-card"
        style={{
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search company, job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--text-secondary)" }}>
          <span>
            Total Applied: <strong style={{ color: "var(--text-primary)" }}>{applications.length}</strong>
          </span>
          <span>
            Synced to Sheet: <strong style={{ color: "#34d399" }}>{applications.filter((a) => a.synced_to_sheet).length}</strong>
          </span>
        </div>
      </div>

      {/* Applications Table / Cards */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ width: "40%", height: 18, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "60%", height: 14 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Sparkles size={40} style={{ color: "var(--text-muted)", margin: "0 auto 14px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>No applications found</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
            {applications.length === 0
              ? "Whenever you click 'Applied' on any job card, it will be automatically saved here and pushed to your Google Sheet."
              : "No applications match your search query."}
          </p>
          <button className="btn-primary" onClick={() => router.push("/")}>
            Explore Jobs
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((app) => (
            <div
              key={app.id}
              className="glass-card job-card"
              style={{
                padding: "18px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div style={{ flex: "1 1 300px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                  {app.job_title}
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Building2 size={13} style={{ color: "var(--accent-glow)" }} /> {app.company_name}
                  </span>
                  {app.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={13} style={{ color: "var(--text-muted)" }} /> {app.location}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={13} style={{ color: "var(--text-muted)" }} />
                    {new Date(app.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Status & Link */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {app.synced_to_sheet ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#34d399",
                      background: "rgba(52, 211, 153, 0.12)",
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                    title="Synced to Google Sheet"
                  >
                    <CheckCircle2 size={13} /> Sheet Synced
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      background: "rgba(255, 255, 255, 0.05)",
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    Saved in Cloud
                  </span>
                )}

                {app.job_url && (
                  <a
                    href={app.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    View Link <ExternalLink size={11} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleUnmarkApplication(app)}
                  disabled={unmarkingIds.has(app.id)}
                  className="btn-ghost"
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--text-muted)",
                    opacity: unmarkingIds.has(app.id) ? 0.6 : 1,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--danger)";
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                  title="Unmark as applied and remove from application list"
                >
                  {unmarkingIds.has(app.id) ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCcw size={12} />
                  )}
                  Unmark
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="toast-container">
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(18, 20, 29, 0.94)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${
                toast.type === "success"
                  ? "rgba(34, 197, 94, 0.4)"
                  : toast.type === "warning"
                  ? "rgba(239, 68, 68, 0.4)"
                  : "rgba(99, 102, 241, 0.4)"
              }`,
              color: "#f8fafc",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 12px 30px -8px rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {toast.type === "success" ? (
              <Check size={15} style={{ color: "#4ade80" }} />
            ) : (
              <AlertCircle size={15} style={{ color: "#f87171" }} />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
