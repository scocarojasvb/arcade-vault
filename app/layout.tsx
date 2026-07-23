import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono, Courier_Prime } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-context";

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
            <main className="av-main">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
