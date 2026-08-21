import type { Metadata, Viewport } from "next";
import { Press_Start_2P, JetBrains_Mono, Courier_Prime } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-context";
import { Nav } from "./components/nav";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const courierFont = Courier_Prime({
  variable: "--font-courier",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "An online gaming platform where players compete for high scores.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Se permite zoom manual (accesibilidad); el D-pad ya bloquea el zoom por gesto
  // con touch-action: none sobre su propia área.
  maximumScale: 5,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pixelFont.variable} ${monoFont.variable} ${courierFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <div className="av-bg" />
          <div className="av-noise" />
          <div id="root">
            <Nav />
            <main className="av-main">{children}</main>
            <footer
              style={{
                borderTop: "1px solid var(--line)",
                padding: "20px 32px",
                textAlign: "center",
                color: "var(--ink-faint)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
              }}
            >
              © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
