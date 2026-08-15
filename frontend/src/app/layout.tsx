import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "JobPulse — Multi-ATS Job Aggregator",
  description: "Discover, search, and track job postings aggregated from Greenhouse, Ashby, Lever and more ATS platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-noise">
        <AuthProvider>
          <div className="gradient-mesh" />

          {/* ── Navbar ────────────────────────── */}
          <Navbar />

          {/* ── Main Content ──────────────────── */}
          <main
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "32px 24px 80px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {children}
          </main>

          {/* ── Footer ────────────────────────── */}
          <footer
            style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "24px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-muted)",
              position: "relative",
              zIndex: 1,
            }}
          >
            Open-source Multi-ATS Job Aggregation Engine &bull; Built with FastAPI + Next.js
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
