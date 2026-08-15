"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, User, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in
  if (user) {
    return (
      <div className="animate-fade-in-up" style={{ maxWidth: 460, margin: "60px auto", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: 36 }}>
          <CheckCircle2 size={48} style={{ color: "var(--success)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>You are signed in</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>{user.email}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => router.push("/profile")}>
              Go to Profile
            </button>
            <button className="btn-secondary" onClick={() => router.push("/")}>
              Browse Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!email || !password || !fullName) {
          setError("Please fill in all fields.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, fullName);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMsg("Account created successfully! Redirecting...");
          setTimeout(() => router.push("/profile"), 1200);
        }
      } else {
        if (!email || !password) {
          setError("Please enter your email and password.");
          setLoading(false);
          return;
        }
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMsg("Signed in successfully! Redirecting...");
          setTimeout(() => router.push("/profile"), 1000);
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 440, margin: "40px auto 80px" }}>
      {/* Header icon */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "linear-gradient(135deg, var(--accent-main), var(--accent-glow))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
          }}
        >
          <Sparkles size={24} color="white" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
          {isSignUp ? "Create your JobPulse Account" : "Welcome back to JobPulse"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {isSignUp
            ? "Sync applications to Google Sheets & track your dream roles"
            : "Sign in to manage your profile and Google Sheets sync"}
        </p>
      </div>

      <div className="glass-card" style={{ padding: 32 }}>
        {/* Tab switch */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "var(--bg-input)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            style={{
              padding: "8px 0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: !isSignUp ? "var(--bg-card)" : "transparent",
              color: !isSignUp ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: !isSignUp ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            style={{
              padding: "8px 0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: isSignUp ? "var(--bg-card)" : "transparent",
              color: isSignUp ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: isSignUp ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="animate-slide-in"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 18,
              background: "var(--danger-soft)",
              color: "var(--danger)",
              border: "1px solid rgba(248,113,113,0.2)",
            }}
          >
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div
            className="animate-slide-in"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 18,
              background: "var(--success-soft)",
              color: "var(--success)",
              border: "1px solid rgba(52,211,153,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isSignUp && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 38 }}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={isSignUp ? "Minimum 6 characters" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 38, paddingRight: 38 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 8, padding: "12px 0", fontSize: 14 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : isSignUp ? "Create Account" : "Sign In"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
