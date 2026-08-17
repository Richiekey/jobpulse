"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Table,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

interface ScreenshotProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id?: string;
    title: string;
    company_name: string;
    location?: string;
    job_url?: string;
    apply_url?: string;
    salary?: string;
    source?: string;
  } | null;
  onAppliedSuccess?: (jobId: string) => void;
  userProfile?: any;
}

export default function ScreenshotProofModal({
  isOpen,
  onClose,
  job,
  onAppliedSuccess,
  userProfile,
}: ScreenshotProofModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !job) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP)");
      return;
    }
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert image to base64 if selected
      let base64Image = "";
      if (file && previewUrl) {
        base64Image = previewUrl;
      }

      const res = await fetch("/api/sync/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userProfile?.id,
          jobId: job.id,
          companyName: job.company_name,
          jobTitle: job.title,
          jobUrl: job.apply_url || job.job_url || "",
          location: job.location || "",
          salary: job.salary || "",
          source: job.source || "",
          notes,
          screenshotBase64: base64Image || undefined,
          screenshotFileName: file ? `${job.company_name}_Application_${Date.now()}.${file.name.split('.').pop()}` : undefined,
          autoSync: userProfile?.auto_sync_sheet ?? true,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccess(true);
        setResultMessage(json.message || "Application marked as applied and proof logged!");
        if (job.id && onAppliedSuccess) {
          onAppliedSuccess(job.id);
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(json.error || "Failed to log application");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
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
          maxWidth: 580,
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
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Mark Applied & Upload Proof
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                {job.title} at {job.company_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: "#94a3b8",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 22 }}>
          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 12px" }} />
              <h4 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
                Application Proof Recorded!
              </h4>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                {resultMessage || "Saved to your dashboard and Google Sheets with Drive proof link."}
              </p>
            </div>
          ) : (
            <div>
              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed rgba(255, 255, 255, 0.15)",
                  borderRadius: 14,
                  padding: previewUrl ? 12 : 28,
                  textAlign: "center",
                  cursor: "pointer",
                  background: previewUrl ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.04)",
                  marginBottom: 16,
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept="image/*"
                  style={{ display: "none" }}
                />

                {previewUrl ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Application screenshot proof"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 180,
                        borderRadius: 8,
                        objectFit: "contain",
                        margin: "0 auto 8px",
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 12, color: "#38bdf8" }}>
                      Click to change screenshot
                    </p>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={36} style={{ color: "#38bdf8", margin: "0 auto 10px" }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>
                      Drop confirmation screenshot here, or <span style={{ color: "#38bdf8" }}>browse</span>
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                      Automatically saved to your Google Drive folder & added as a link in Google Sheets
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Notes / Salary Discussed (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Applied via referral, follow up next Thursday"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#f8fafc",
                    fontSize: 13,
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 20px",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {file ? "Save & Upload Proof" : "Mark as Applied"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
