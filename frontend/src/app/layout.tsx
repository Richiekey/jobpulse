import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { AuthGuard } from "@/components/AuthGuard";

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
            <AuthGuard>
              {children}
            </AuthGuard>
          </main>

          {/* ── Footer ────────────────────────── */}
          <footer
            style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "32px 24px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-dimmed)",
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, var(--accent-main), var(--accent-glow))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 8,
                  color: "white",
                }}
              >
                JP
              </div>
              <span style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>JobPulse</span>
            </div>
            <span>Multi-ATS Job Aggregation Engine · FastAPI + Next.js</span>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
