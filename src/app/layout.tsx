import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#121214" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

export const metadata: Metadata = {
  title: "RoutineKit · DIU Timetable & Routine Planner",
  description: "Personal verified academic timetable and routine manager for DIU CSE students",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RoutineKit",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem("routinekit_theme");
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  if (saved === "dark" || (!saved && prefersDark)) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var r of regs) { r.unregister(); }
                  });
                  if ("caches" in window) {
                    caches.keys().then(function(names) {
                      for (var n of names) { caches.delete(n); }
                    });
                  }
                } else {
                  window.addEventListener("load", function() {
                    navigator.serviceWorker.register("/sw.js").catch(function(e) {
                      console.debug("ServiceWorker registration skipped:", e);
                    });
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col relative selection:bg-[var(--brand-surface)] selection:text-[var(--brand-primary)]">
        {/* Dual-Aurora Ambient Lighting Canvas */}
        <div className="ambient-glow" aria-hidden="true" />
        {/* Subtle Physical Academic Paper Texture */}
        <div className="paper-texture" aria-hidden="true" />

        {/* App Root Content */}
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>

        {/* Global Stacked Sonner Toasts */}
        <Toaster
          position="bottom-right"
          theme="system"
          closeButton
          toastOptions={{
            duration: 3500,
            className: "!font-sans !text-xs !shadow-lg !rounded-xl !border-[var(--surface-border)]",
          }}
        />
      </body>
    </html>
  );
}
