"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
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

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setProfile(data as UserProfile);
      } else if (error && error.code === "PGRST116") {
        // Profile doesn't exist yet — create a fallback default
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({ id: userId, email: user?.email || "" })
          .select()
          .single();
        if (inserted) setProfile(inserted as UserProfile);
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    }
  }, [user]);

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, pass: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) return { error: error.message };
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
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
        await fetchProfile(data.user.id);
      }
      return {};
    } catch (e: any) {
      return { error: e?.message || "Sign in failed" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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
        .single();

      if (error) return { success: false, error: error.message };
      if (data) setProfile(data as UserProfile);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Update failed" };
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Google Sheets & Cloud application logger
  const syncAppliedJobToSheet = async (job: SyncJobPayload): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "User not logged in" };

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
          webhookUrl: profile?.google_sheet_webhook || "",
          autoSync: profile?.auto_sync_sheet ?? true,
        }),
      });

      const data = await res.json();
      return {
        success: res.ok,
        message: data.message || data.error || (res.ok ? "Synced to Google Sheet" : "Sync failed"),
      };
    } catch (e: any) {
      return { success: false, message: e?.message || "Network error syncing to Google Sheet" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
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
