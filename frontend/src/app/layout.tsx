import type { Metadata } from "next";
import "./globals.css";

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
        <div className="gradient-mesh" />

        {/* ── Navbar ────────────────────────── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(10, 10, 15, 0.8)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "0 24px",
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Logo */}
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--accent-main), var(--accent-glow))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "white",
                  letterSpacing: "-0.02em",
                }}
              >
                JP
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                }}
              >
                JobPulse
              </span>
            </a>

            {/* Nav Links */}
            <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <a href="/" className="nav-link">Jobs</a>
              <a href="/import" className="nav-link">Import</a>
              <a href="/health" className="nav-link">Health</a>
            </nav>
          </div>
        </header>

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
      </body>
    </html>
  );
}
