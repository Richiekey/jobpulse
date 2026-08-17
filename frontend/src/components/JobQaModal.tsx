"use client";

import React, { useState } from "react";
import {
  X,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
  CornerDownLeft,
} from "lucide-react";

interface JobQaModalProps {
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

const COMMON_QUESTIONS = [
  "Why are you the best fit for this role?",
  "What is your greatest technical achievement?",
  "Describe your experience with distributed systems and APIs.",
  "Why do you want to join our company?",
  "How do you handle deadlines and conflicting priorities?",
];

export default function JobQaModal({
  isOpen,
  onClose,
  job,
  tailoredResume,
  userProfile,
}: JobQaModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleGenerate = async (qToUse?: string) => {
    const activeQ = qToUse || question;
    if (!activeQ.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/qa-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: activeQ,
          jobTitle: job.title,
          companyName: job.company_name,
          jobDescription: job.description || `${job.title} at ${job.company_name}`,
          tailoredResume,
          candidateInfo: userProfile,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAnswer(json.answer);
      } else {
        setError(json.error || "Failed to generate answer");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
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
          maxWidth: 750,
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
                background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Screening Q&A Assistant
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                Instant answers tailored for {job.company_name} applications
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

          {/* Quick presets */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
              Quick ATS Questions:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {COMMON_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestion(q);
                    handleGenerate(q);
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    color: "#cbd5e1",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f8fafc", marginBottom: 6 }}>
              Paste Application Question
            </label>
            <div style={{ position: "relative" }}>
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Why are you interested in this position? What is your experience with Docker and Kubernetes?"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={loading || !question.trim()}
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 12,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !question.trim() ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
                Answer
              </button>
            </div>
          </div>

          {/* Generated Answer */}
          {answer && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#38bdf8" }}>
                  Optimized ATS Response
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    background: "none",
                    border: "none",
                    color: copied ? "#34d399" : "#94a3b8",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy Answer"}
                </button>
              </div>
              <textarea
                rows={5}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#f8fafc",
                  fontSize: 14,
                  lineHeight: 1.6,
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
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              padding: "8px 18px",
              color: "#94a3b8",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
