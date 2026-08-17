"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";

interface CoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    title: string;
    company_name: string;
    description?: string;
  } | null;
  tailoredResume?: any;
  userProfile?: any;
}

export default function CoverLetterModal({
  isOpen,
  onClose,
  job,
  tailoredResume,
  userProfile,
}: CoverLetterModalProps) {
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          companyName: job.company_name,
          jobDescription: job.description || `${job.title} at ${job.company_name}`,
          tailoredResume,
          candidateInfo: userProfile,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCoverLetter(json.coverLetter);
      } else {
        setError(json.error || "Failed to generate cover letter");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!coverLetter) return;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 50;
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    const candidateName = userProfile?.full_name || tailoredResume?.candidate?.name || "Candidate Name";
    const candidateEmail = userProfile?.email || tailoredResume?.candidate?.email || "";

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(candidateName, margin, y);
    y += 18;

    if (candidateEmail) {
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(candidateEmail, margin, y);
      y += 16;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y, margin + contentWidth, y);
    y += 24;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);

    const paragraphs = coverLetter.split("\n\n");
    paragraphs.forEach((p) => {
      const lines = doc.splitTextToSize(p.trim(), contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 15 + 12;
    });

    const cleanCompany = (job.company_name || "Company").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`${cleanCompany}_Cover_Letter.pdf`);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 29, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 10000,
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
          maxWidth: 800,
          maxHeight: "90vh",
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
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Tailored Cover Letter Generator
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                For {job.title} at {job.company_name}
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
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!coverLetter && !loading && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Mail size={44} style={{ color: "#c084fc", margin: "0 auto 16px" }} />
              <h4 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
                Generate a Tailored Cover Letter
              </h4>
              <p style={{ color: "#94a3b8", maxWidth: 480, margin: "0 auto 24px", fontSize: 14 }}>
                Creates a personalized letter highlighting your specific accomplishments that match {job.company_name}’s tech stack and mission.
              </p>
              <button
                onClick={handleGenerate}
                style={{
                  padding: "12px 28px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={16} />
                Generate Cover Letter
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Loader2 size={36} className="animate-spin" style={{ color: "#c084fc", margin: "0 auto 16px" }} />
              <h4 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
                Writing your cover letter...
              </h4>
              <p style={{ color: "#94a3b8", fontSize: 13 }}>
                Synthesizing your experience with {job.company_name}’s requirements.
              </p>
            </div>
          )}

          {coverLetter && !loading && (
            <div>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={14}
                style={{
                  width: "100%",
                  padding: 20,
                  borderRadius: 12,
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: "Georgia, serif",
                  resize: "vertical",
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {coverLetter ? (
            <button
              onClick={handleGenerate}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 10,
                padding: "8px 14px",
                color: "#f8fafc",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              Regenerate
            </button>
          ) : <div />}

          <div style={{ display: "flex", gap: 10 }}>
            {coverLetter && (
              <>
                <button
                  onClick={handleCopy}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    color: "#f8fafc",
                    fontSize: 13,
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
                  onClick={handleDownloadPdf}
                  style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 18px",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Download size={14} />
                  Download PDF
                </button>
              </>
            )}

            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 10,
                padding: "8px 16px",
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
