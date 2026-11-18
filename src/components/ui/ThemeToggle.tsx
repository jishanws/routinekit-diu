"use client";

import React, { useSyncExternalStore, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SunIcon, MoonIcon } from "@/components/ui/Icons";

const emptySubscribe = () => () => {};

function getThemeSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("routinekit_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return saved === "dark" || (!saved && prefersDark);
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

export default function ThemeToggle() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  // Synchronize document class on mount if needed
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !isDark;

    const applyTheme = () => {
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("routinekit_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("routinekit_theme", "light");
      }
      window.dispatchEvent(new Event("storage"));
    };

    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> };
    };

    const supportsViewTransition =
      typeof doc.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!supportsViewTransition) {
      document.documentElement.classList.add("theme-transitioning");
      applyTheme();
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 350);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX && e.clientX !== 0 ? e.clientX : rect.left + rect.width / 2;
    const y = e.clientY && e.clientY !== 0 ? e.clientY : rect.top + rect.height / 2;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      applyTheme();
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 380,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  if (!isClient) {
    return (
      <button
        type="button"
        aria-label="Theme toggle placeholder"
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--ink-secondary)] flex items-center justify-center opacity-0 shrink-0"
      >
        <span className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to clean light theme" : "Switch to dark charcoal theme"}
      aria-label={isDark ? "Switch to clean light theme" : "Switch to dark charcoal theme"}
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center shrink-0 overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ rotate: -70, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 70, scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <SunIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--brand-accent)]" />
          ) : (
            <MoonIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--ink-secondary)]" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
