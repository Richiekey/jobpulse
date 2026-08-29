"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught error]", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            maxWidth: 540,
            margin: "60px auto",
            padding: "36px 28px",
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            backdropFilter: "blur(16px)",
            textAlign: "center",
          }}
          className="animate-fade-in-up"
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#f87171",
            }}
          >
            <AlertCircle size={26} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#f8fafc" }}>
            {this.props.fallbackTitle || "Something went wrong"}
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            {this.state.error?.message || "An unexpected error occurred while rendering this section."}
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={this.handleReset}
              className="btn-primary"
              style={{
                padding: "8px 18px",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RotateCcw size={14} /> Try Again
            </button>
            <Link
              href="/"
              onClick={this.handleReset}
              className="btn-secondary"
              style={{
                padding: "8px 18px",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <Home size={14} /> Back to Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
