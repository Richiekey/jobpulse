"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  User, Briefcase, FileText, Globe, Linkedin, Github, Table,
  CheckCircle2, AlertCircle, Copy, ExternalLink, Save, Loader2, Sparkles,
  HelpCircle, ChevronDown, ChevronUp, Zap, Send
} from "lucide-react";

const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    // Add header row automatically if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Date Applied", "Company", "Job Title", "Location", "Salary", "Source", "Job URL", "Status"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#eef2ff");
      sheet.setFrozenRows(1);
    }
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.dateFormatted || new Date().toLocaleString(),
      data.company || "N/A",
      data.title || "N/A",
      data.location || "N/A",
      data.salary || "N/A",
      data.source || "N/A",
      data.link || "N/A",
      data.status || "Applied"
    ]);
    return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, updateProfile, loading: authLoading, signOut } = useAuth();

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [yearsExp, setYearsExp] = useState(0);
  const [skills, setSkills] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  
  // Google Sheets state
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [googleSheetWebhook, setGoogleSheetWebhook] = useState("");
  const [autoSyncSheet, setAutoSyncSheet] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");
  const [saveMsg, setSaveMsg] = useState("");
  const [testingSheet, setTestingSheet] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setHeadline(profile.headline || "");
      setYearsExp(profile.years_of_experience || 0);
      setSkills((profile.skills || []).join(", "));
      setTargetRoles(profile.target_roles || "");
      setPreferredLocation(profile.preferred_location || "");
      setResumeUrl(profile.resume_url || "");
      setPortfolioUrl(profile.portfolio_url || "");
      setLinkedinUrl(profile.linkedin_url || "");
      setGithubUrl(profile.github_url || "");
      setGoogleSheetUrl(profile.google_sheet_url || "");
      setGoogleSheetWebhook(profile.google_sheet_webhook || "");
      setAutoSyncSheet(profile.auto_sync_sheet ?? true);
    }
  }, [profile]);

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
          <User size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Sign in required</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Please sign in to view and customize your work profile and Google Sheets synchronization.
          </p>
          <button className="btn-primary" onClick={() => router.push("/auth/login")} style={{ width: "100%", justifyContent: "center" }}>
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("");
    setSaveMsg("");

    const parsedSkills = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await updateProfile({
      full_name: fullName,
      headline,
      years_of_experience: Number(yearsExp),
      skills: parsedSkills,
      target_roles: targetRoles,
      preferred_location: preferredLocation,
      resume_url: resumeUrl,
      portfolio_url: portfolioUrl,
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      google_sheet_url: googleSheetUrl,
      google_sheet_webhook: googleSheetWebhook,
      auto_sync_sheet: autoSyncSheet,
    });

    setSaving(false);
    if (res.success) {
      setSaveStatus("success");
      setSaveMsg("Profile and Google Sheets sync settings saved successfully!");
      setTimeout(() => setSaveStatus(""), 4000);
    } else {
      setSaveStatus("error");
      setSaveMsg(res.error || "Failed to save profile.");
    }
  };

  const handleTestConnection = async () => {
    if (!googleSheetWebhook) {
      setTestResult({ success: false, message: "Please paste your Google Apps Script Webhook URL first." });
      return;
    }

    setTestingSheet(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/sync/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          companyName: "Google / Demo Company",
          jobTitle: "Senior Software Engineer (Test Sync)",
          jobUrl: "https://jobpulse.app",
          location: "Remote, US",
          salary: "$160k - $210k",
          source: "JOBPULSE TEST",
          webhookUrl: googleSheetWebhook,
          isTest: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: "Connection verified! A test row has been appended to your Google Sheet." });
      } else {
        setTestResult({ success: false, message: data.error || "Webhook test failed. Make sure deployment access is set to 'Anyone'." });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "Network error testing webhook." });
    } finally {
      setTestingSheet(false);
    }
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 840, margin: "0 auto 80px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <User size={26} style={{ color: "var(--accent-glow)" }} />
            My Profile & Work Details
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
            Logged in as <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => router.push("/applications")} style={{ padding: "8px 14px" }}>
            <FileText size={15} /> My Applications
          </button>
          <button className="btn-secondary" onClick={signOut} style={{ padding: "8px 14px", color: "var(--danger)" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {saveStatus && (
        <div
          className="animate-slide-in"
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: saveStatus === "success" ? "var(--success-soft)" : "var(--danger-soft)",
            color: saveStatus === "success" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${saveStatus === "success" ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
          }}
        >
          {saveStatus === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {saveMsg}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* ── 1. Google Sheets Sync Card ──────────────────── */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 24, border: "1px solid rgba(52, 211, 153, 0.25)", background: "linear-gradient(135deg, rgba(52, 211, 153, 0.06), rgba(52, 211, 153, 0.01))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Table size={20} style={{ color: "#34d399" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Google Sheets Real-Time Sync
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  Automatically append company name, title, apply link, and details to your Google Sheet whenever you click <strong>Applied</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowGuide(!showGuide)}
              style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <HelpCircle size={14} />
              {showGuide ? "Hide Setup Guide" : "60-Second Setup Guide"}
              {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Collapsible Setup Guide */}
          {showGuide && (
            <div
              className="animate-fade-in-up"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-medium)",
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>
                🚀 How to Connect Your Google Sheet in 4 Steps:
              </h4>
              <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <li>
                  Open <a href="https://sheets.new" target="_blank" rel="noreferrer" style={{ color: "var(--accent-glow)", textDecoration: "underline" }}>sheets.new</a> to create a new blank Google Sheet.
                </li>
                <li>
                  In the top menu, click <strong>Extensions &gt; Apps Script</strong>.
                </li>
                <li>
                  Delete any code in the editor and paste this Apps Script:
                  <div style={{ position: "relative", marginTop: 8, marginBottom: 8 }}>
                    <pre
                      style={{
                        background: "var(--bg-primary)",
                        padding: 12,
                        borderRadius: 8,
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        overflowX: "auto",
                        color: "#a78bfa",
                        maxHeight: 140,
                      }}
                    >
                      {APPS_SCRIPT_TEMPLATE}
                    </pre>
                    <button
                      type="button"
                      onClick={copyScriptToClipboard}
                      className="btn-primary"
                      style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", fontSize: 11 }}
                    >
                      {copiedScript ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {copiedScript ? "Copied!" : "Copy Script"}
                    </button>
                  </div>
                </li>
                <li>
                  Click <strong>Deploy &gt; New deployment</strong>, select <strong>Web app</strong>, set <em>Who has access</em> to <strong>Anyone</strong>, click <strong>Deploy</strong>, and copy the Web app URL into the field below!
                </li>
              </ol>
            </div>
          )}

          {/* Webhook Input Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Google Apps Script Webhook URL <span style={{ color: "var(--accent-glow)" }}>*</span>
              </label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={googleSheetWebhook}
                onChange={(e) => setGoogleSheetWebhook(e.target.value)}
                className="input-field"
                style={{ width: "100%", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Direct Google Sheet URL (Optional Bookmark)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  {googleSheetUrl && (
                    <a
                      href={googleSheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ padding: "0 14px", display: "flex", alignItems: "center" }}
                      title="Open Google Sheet"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-primary)", marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={autoSyncSheet}
                    onChange={(e) => setAutoSyncSheet(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--accent-main)", cursor: "pointer" }}
                  />
                  Auto-sync when I click Applied
                </label>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingSheet}
                  className="btn-secondary"
                  style={{ marginBottom: 4, padding: "8px 14px", fontSize: 12, borderColor: "rgba(52,211,153,0.4)" }}
                >
                  {testingSheet ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} style={{ color: "#34d399" }} />}
                  {testingSheet ? "Testing..." : "Test Connection"}
                </button>
              </div>
            </div>

            {/* Test result toast */}
            {testResult && (
              <div
                className="animate-slide-in"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: testResult.success ? "var(--success-soft)" : "var(--danger-soft)",
                  color: testResult.success ? "var(--success)" : "var(--danger)",
                  border: `1px solid ${testResult.success ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                }}
              >
                {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Work & Professional Info ─────────────────── */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <Briefcase size={18} style={{ color: "var(--accent-glow)" }} />
            Professional & Work Info
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan Miller"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Years of Professional Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={yearsExp}
                onChange={(e) => setYearsExp(Number(e.target.value))}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Professional Headline / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Cybersecurity Engineer | Zero Trust & Cloud Security"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="input-field"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Primary Skills & Tech Stack (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Python, AWS, Kubernetes, Terraform, Go, PostgreSQL"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="input-field"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Target Roles / Titles
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer, Tech Lead"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Preferred Location / Work Mode
              </label>
              <input
                type="text"
                placeholder="e.g. Remote, San Francisco, New York"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* ── 3. Resume & Social Links ────────────────────── */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={18} style={{ color: "var(--accent-glow)" }} />
            Resume, Portfolio & Links
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Resume URL (Google Drive / Dropbox link)
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Personal Portfolio / Website
              </label>
              <input
                type="url"
                placeholder="https://yourportfolio.com"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                GitHub Profile URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ padding: "12px 28px", fontSize: 14 }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving Changes..." : "Save Profile & Sync Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
