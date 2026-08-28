"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  headline?: string;
  years_of_experience?: number;
  skills?: string[];
  target_roles?: string;
  preferred_location?: string;
  resume_url?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
  google_sheet_url?: string;
  google_sheet_webhook?: string;
  auto_sync_sheet?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SyncJobPayload {
  id: string;
  company_name: string;
  title: string;
  location?: string;
  job_url?: string;
  apply_url?: string;
  salary?: string;
  source?: string;
}

export interface SyncIndicatorState {
  status: "idle" | "syncing" | "success" | "error";
  companyName?: string;
  jobTitle?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  syncIndicator: SyncIndicatorState;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  syncAppliedJobToSheet: (job: SyncJobPayload) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncIndicator, setSyncIndicator] = useState<SyncIndicatorState>({ status: "idle" });
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingProfileRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    if (!userId || fetchingProfileRef.current === userId) return;
    fetchingProfileRef.current = userId;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as UserProfile);
      } else {
        // Create initial fallback profile if not found
        const newProfile = {
          id: userId,
          email: userEmail || "",
          full_name: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data: inserted } = await supabase
          .from("profiles")
          .upsert(newProfile)
          .select()
          .maybeSingle();
        if (inserted) setProfile(inserted as UserProfile);
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    } finally {
      fetchingProfileRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, pass: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) return { error: error.message };
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, email);
      }
      return {};
    } catch (e: any) {
      return { error: e?.message || "Sign up failed" };
    }
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) return { error: error.message };
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, email);
      }
      return {};
    } catch (e: any) {
      return { error: e?.message || "Sign in failed" };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { success: false, error: "Not logged in" };
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (data) setProfile(data as UserProfile);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Update failed" };
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  // Google Sheets & Cloud application logger
  const syncAppliedJobToSheet = async (job: SyncJobPayload): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "User not logged in" };

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    setSyncIndicator({
      status: "syncing",
      companyName: job.company_name,
      jobTitle: job.title,
    });

    const cachedWebhook = typeof window !== "undefined" ? localStorage.getItem("jp_gsheet_webhook") || "" : "";
    const activeWebhook = profile?.google_sheet_webhook || cachedWebhook;

    try {
      const res = await fetch("/api/sync/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          jobId: job.id,
          companyName: job.company_name,
          jobTitle: job.title,
          jobUrl: job.apply_url || job.job_url || "",
          location: job.location || "",
          salary: job.salary || "",
          source: job.source || "",
          webhookUrl: activeWebhook,
          autoSync: profile?.auto_sync_sheet ?? true,
        }),
      });

      const data = await res.json();
      const isSuccess = res.ok;
      const msg = data.message || data.error || (isSuccess ? "Synced to Google Sheet" : "Sync failed");

      setSyncIndicator({
        status: isSuccess ? "success" : "error",
        companyName: job.company_name,
        jobTitle: job.title,
        message: msg,
      });

      syncTimeoutRef.current = setTimeout(() => {
        setSyncIndicator({ status: "idle" });
      }, isSuccess ? 3200 : 4500);

      return {
        success: isSuccess,
        message: msg,
      };
    } catch (e: any) {
      const errMsg = e?.message || "Network error syncing to Google Sheet";
      setSyncIndicator({
        status: "error",
        companyName: job.company_name,
        jobTitle: job.title,
        message: errMsg,
      });

      syncTimeoutRef.current = setTimeout(() => {
        setSyncIndicator({ status: "idle" });
      }, 4500);

      return { success: false, message: errMsg };
    }
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        syncIndicator,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        syncAppliedJobToSheet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
