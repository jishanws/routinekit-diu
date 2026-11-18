"use client";

import React from "react";
import { GithubIcon, StarIcon } from "@/components/ui/Icons";

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-[var(--surface-border-subtle)] py-4 sm:py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-xs text-[var(--ink-muted)]">
      <div className="max-w-4xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        {/* Left Side: University affiliation & Open Source Star */}
        <div className="flex items-center gap-1.5 justify-center sm:justify-start">
          <span>
            Built for <span className="sm:hidden">DIU</span><span className="hidden sm:inline">Daffodil International University</span> · Open source on
          </span>
          <a
            href="https://github.com/jishanws/routinekit-diu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors group cursor-pointer font-medium shrink-0"
            title="Star RoutineKit on GitHub"
          >
            <GithubIcon className="w-3.5 h-3.5 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)] transition-colors shrink-0" />
            <span className="underline underline-offset-2 decoration-[var(--surface-border)] group-hover:decoration-[var(--ink-secondary)]">
              GitHub
            </span>
            <StarIcon className="w-3 h-3 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)] group-hover:scale-110 transition-transform shrink-0" />
          </a>
        </div>

        {/* Right Side: Copyright notice & developer link */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end text-[var(--ink-muted)]">
          <span>
            © {currentYear} RoutineKit · Developed by{" "}
            <a
              href="https://jishan.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--ink-primary)] hover:underline underline-offset-2 transition-colors"
            >
              Jishan
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
