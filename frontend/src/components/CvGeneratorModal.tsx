"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Mail,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { generateResumePdf, ResumeData } from "@/lib/pdfGenerator";

interface CvGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id?: string;
    title: string;
    company_name: string;
    location?: string;
    description?: string;
    apply_url?: string;
    source?: string;
  } | null;
  userProfile?: any;
  onOpenCoverLetter?: (job: any, resumeData: ResumeData) => void;
  onOpenQaAssistant?: (job: any, resumeData: ResumeData) => void;
}

export default function CvGeneratorModal({
  isOpen,
  onClose,
  job,
  userProfile,
  onOpenCoverLetter,
  onOpenQaAssistant,
}: CvGeneratorModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [providerInfo, setProviderInfo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Customization inputs
  const [masterResumeText, setMasterResumeText] = useState("");
  const [showCustomizer, setShowCustomizer] = useState(false);

  useEffect(() => {
    if (userProfile?.headline || userProfile?.skills) {
      const skillsStr = (userProfile.skills || []).join(", ");
      setMasterResumeText(
        `Professional Summary: ${userProfile.headline || ""}\nCore Skills: ${skillsStr}\nYears of Experience: ${userProfile.years_of_experience || 3}\nTarget Roles: ${userProfile.target_roles || ""}`
      );
    }
  }, [userProfile]);

  if (!isOpen || !job) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/tailor-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          companyName: job.company_name,
          jobDescription: job.description || `${job.title} at ${job.company_name}. Location: ${job.location || 'Remote'}`,
          masterResume: masterResumeText || undefined,
          candidateInfo: userProfile || {
            fullName: "Candidate",
            email: "applicant@example.com",
            location: job.location || "Remote",
          },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setResumeData(json.data);
        setProviderInfo(`${json.provider?.toUpperCase()} (${json.model})`);
      } else {
        setError(json.error || "Failed to generate tailored CV");
      }
    } catch (err: any) {
      setError(err?.message || "Network error generating CV");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!resumeData) return;
    const cleanCompany = (job.company_name || "Company").replace(/[^a-zA-Z0-9]/g, "_");
    const cleanCandidate = (resumeData.candidate?.name || userProfile?.full_name || "Resume").replace(/[^a-zA-Z0-9]/g, "_");
    generateResumePdf(resumeData, `${cleanCandidate}_${cleanCompany}_Resume.pdf`);
  };

  const handleCopyText = () => {
    if (!resumeData) return;
    const parts: string[] = [];
    if (resumeData.candidate?.name) parts.push(resumeData.candidate.name);
    if (resumeData.summary) parts.push(`\nPROFESSIONAL SUMMARY\n${resumeData.summary}`);
    if (resumeData.skills) {
      parts.push(`\nSKILLS\nLanguages: ${(resumeData.skills.languages || []).join(", ")}\nFrameworks: ${(resumeData.skills.frameworks || []).join(", ")}\nTools: ${(resumeData.skills.toolsAndCloud || []).join(", ")}`);
    }
    if (resumeData.experience) {
      parts.push("\nEXPERIENCE");
      resumeData.experience.forEach((exp) => {
        parts.push(`${exp.role} - ${exp.company} (${exp.period || ""})`);
        (exp.highlights || []).forEach((hl) => parts.push(`• ${hl}`));
      });
    }
    if (resumeData.education) {
      parts.push("\nEDUCATION");
      resumeData.education.forEach((edu) => {
        parts.push(`${edu.degree} - ${edu.institution} (${edu.year || ""})`);
      });
    }

    navigator.clipboard.writeText(parts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 29, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-scale-up"
        style={{
          width: "100%",
          maxWidth: 950,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "#0d1322",
          color: "#f8fafc",
          overflow: "hidden",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Sparkles size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  AI Tailored CV & ATS Optimizer
                </h3>
                {providerInfo && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "rgba(99, 102, 241, 0.2)",
                      color: "#a5b4fc",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                    }}
                  >
                    {providerInfo}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #94a3b8)", marginTop: 2 }}>
                Targeting <strong style={{ color: "#ffffff" }}>{job.title}</strong> at {job.company_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "none",
              borderRadius: 10,
              padding: 8,
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!resumeData && !loading && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <FileText size={32} style={{ color: "#818cf8" }} />
              </div>
              <h4 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
                Generate an ATS-Optimized Resume in Seconds
              </h4>
              <p style={{ color: "#94a3b8", maxWidth: 540, margin: "0 auto 24px", fontSize: 14, lineHeight: 1.6 }}>
                Our AI aligns your experience, keywords, and technical accomplishments directly with {job.company_name}’s requirements to maximize ATS scoring and interview call rates.
              </p>

              {/* Master Resume Accordion */}
              <div style={{ maxWidth: 600, margin: "0 auto 24px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => setShowCustomizer(!showCustomizer)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#818cf8",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {showCustomizer ? "▼ Hide Master Profile Notes" : "▶ Customize Master Profile / Past Experience Text"}
                </button>

                {showCustomizer && (
                  <textarea
                    rows={4}
                    value={masterResumeText}
                    onChange={(e) => setMasterResumeText(e.target.value)}
                    placeholder="Paste your master resume summary, past roles, or key skills here..."
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#f8fafc",
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                )}
              </div>

              <button
                onClick={handleGenerate}
                style={{
                  padding: "14px 32px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                  transition: "all 0.2s",
                }}
              >
                <Sparkles size={18} />
                Generate Tailored Resume
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Loader2 size={40} className="animate-spin" style={{ color: "#818cf8", margin: "0 auto 20px" }} />
              <h4 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
                Crafting Your Tailored Resume...
              </h4>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>
                Extracting high-impact keywords, calculating ATS score, and structuring Executive Serif layout.
              </p>
            </div>
          )}

          {resumeData && !loading && (
            <div>
              {/* ATS Match Score Bar */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
                    }}
                  >
                    {resumeData.atsScore || 96}%
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#34d399" }}>
                      High ATS Compatibility Score
                    </h5>
                    <p style={{ margin: 0, fontSize: 12, color: "#a7f3d0", marginTop: 2 }}>
                      Optimized for {job.company_name}’s screening filter algorithms
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(resumeData.matchingKeywords || []).slice(0, 5).map((kw, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#a7f3d0",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                      }}
                    >
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* WYSIWYG Executive Paper Preview */}
              <div
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  borderRadius: 12,
                  padding: "36px 44px",
                  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}
              >
                {/* Header */}
                <div style={{ textAlign: "center", borderBottom: "1.5px solid #cbd5e1", paddingBottom: 14, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 24, margin: "0 0 6px", fontWeight: "bold", color: "#0f172a" }}>
                    {resumeData.candidate?.name || userProfile?.full_name || "Candidate Name"}
                  </h2>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    {[
                      resumeData.candidate?.email || userProfile?.email,
                      resumeData.candidate?.phone || userProfile?.phone,
                      resumeData.candidate?.location || userProfile?.preferred_location,
                      resumeData.candidate?.linkedin || userProfile?.linkedin_url,
                      resumeData.candidate?.github || userProfile?.github_url,
                    ]
                      .filter(Boolean)
                      .join("  •  ")}
                  </div>
                </div>

                {/* Summary */}
                {resumeData.summary && (
                  <div style={{ marginBottom: 16 }}>
                    <h6 style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 3, margin: "0 0 6px" }}>
                      Professional Summary
                    </h6>
                    <p style={{ margin: 0, color: "#334155" }}>{resumeData.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {resumeData.skills && (
                  <div style={{ marginBottom: 16 }}>
                    <h6 style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 3, margin: "0 0 6px" }}>
                      Technical Skills
                    </h6>
                    <div style={{ fontSize: 12, color: "#334155" }}>
                      {resumeData.skills.languages && resumeData.skills.languages.length > 0 && (
                        <div><strong>Languages:</strong> {resumeData.skills.languages.join(", ")}</div>
                      )}
                      {resumeData.skills.frameworks && resumeData.skills.frameworks.length > 0 && (
                        <div><strong>Frameworks & Libraries:</strong> {resumeData.skills.frameworks.join(", ")}</div>
                      )}
                      {resumeData.skills.toolsAndCloud && resumeData.skills.toolsAndCloud.length > 0 && (
                        <div><strong>Cloud & Tools:</strong> {resumeData.skills.toolsAndCloud.join(", ")}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {resumeData.experience && resumeData.experience.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h6 style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 3, margin: "0 0 8px" }}>
                      Professional Experience
                    </h6>
                    {resumeData.experience.map((exp, idx) => (
                      <div key={idx} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#0f172a" }}>
                          <span>{exp.role}</span>
                          <span style={{ fontWeight: "normal", color: "#64748b", fontSize: 11 }}>{exp.period}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontStyle: "italic", color: "#475569", fontSize: 12, marginBottom: 4 }}>
                          <span>{exp.company}</span>
                          <span style={{ fontStyle: "normal", color: "#94a3b8", fontSize: 11 }}>{exp.location}</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, color: "#334155" }}>
                          {(exp.highlights || []).map((hl, hIdx) => (
                            <li key={hIdx} style={{ marginBottom: 3 }}>{hl}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                {resumeData.education && resumeData.education.length > 0 && (
                  <div>
                    <h6 style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 3, margin: "0 0 6px" }}>
                      Education
                    </h6>
                    {resumeData.education.map((edu, eIdx) => (
                      <div key={eIdx} style={{ display: "flex", justifyContent: "space-between", color: "#334155" }}>
                        <div><strong>{edu.degree}</strong> — <em>{edu.institution}</em></div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{edu.year}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            background: "rgba(13, 19, 34, 0.95)",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {resumeData && (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 10,
                    padding: "9px 14px",
                    color: "#f8fafc",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>

                {onOpenCoverLetter && (
                  <button
                    type="button"
                    onClick={() => onOpenCoverLetter(job, resumeData)}
                    style={{
                      background: "rgba(168, 85, 247, 0.15)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: 10,
                      padding: "9px 14px",
                      color: "#d8b4fe",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Mail size={14} />
                    Cover Letter
                  </button>
                )}

                {onOpenQaAssistant && (
                  <button
                    type="button"
                    onClick={() => onOpenQaAssistant(job, resumeData)}
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: 10,
                      padding: "9px 14px",
                      color: "#93c5fd",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MessageSquare size={14} />
                    Screening Q&A
                  </button>
                )}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {resumeData && (
              <>
                <button
                  type="button"
                  onClick={handleCopyText}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 10,
                    padding: "9px 16px",
                    color: "#f8fafc",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Text"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 20px",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <Download size={15} />
                  Download PDF
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 10,
                padding: "9px 16px",
                color: "#94a3b8",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
