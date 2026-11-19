"use client";

import React from "react";
import {
  XIcon,
  RoutineKitMark,
  GithubIcon,
  StarIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "@/components/ui/Icons";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm sm:backdrop-blur-xs overscroll-contain transition-opacity">
      <div className="bg-[var(--surface-card)] border-t sm:border border-[var(--surface-border)] rounded-t-[28px] sm:rounded-2xl w-full max-w-xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250">
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1.5 flex justify-center shrink-0 cursor-grab">
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--surface-border)] flex items-center justify-between shrink-0 bg-[var(--surface-card)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
              <RoutineKitMark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-[var(--ink-primary)] tracking-tight leading-none">
                About RoutineKit
              </h3>
              <p className="text-[11px] font-mono text-[var(--ink-muted)] mt-0.5">
                DIU CSE Timetable &amp; Schedule Planner
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-ground)] transition-all cursor-pointer active:scale-95 shadow-2xs"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed overflow-y-auto flex-1">
          {/* Hero Banner */}
          <div className="p-4 rounded-xl bg-[var(--surface-ground)] border border-[var(--surface-border)] space-y-1.5">
            <p className="font-semibold text-[var(--ink-primary)] text-sm">
              Fast, elegant, and student-focused routine planner.
            </p>
            <p className="text-xs text-[var(--ink-secondary)] leading-normal">
              RoutineKit transforms complex, multi-page DIU CSE class routine PDFs into a clean, personalized weekly timetable with designed exports and calendar sync.
            </p>
          </div>

          {/* Who is it for? */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-primary)]" />
              Who is it for?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]">
                <strong className="block text-[var(--ink-primary)] font-semibold mb-0.5">
                  Regular Students
                </strong>
                Select your batch and section to get your complete weekly schedule instantly with zero search hassle.
              </div>
              <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]">
                <strong className="block text-[var(--ink-primary)] font-semibold mb-0.5">
                  Retakers &amp; Mixed Batches
                </strong>
                Combine regular classes with retake courses from other batches into one unified routine with real-time clash alerts.
              </div>
              <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]">
                <strong className="block text-[var(--ink-primary)] font-semibold mb-0.5">
                  Class Representatives (CRs)
                </strong>
                Easily look up section routines, lab dividers, room assignments, and export high-resolution schedules for class groups.
              </div>
              <div className="p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]">
                <strong className="block text-[var(--ink-primary)] font-semibold mb-0.5">
                  Faculty &amp; Teachers
                </strong>
                Quickly verify classroom locations, teaching slots, and daily agendas across smart campus buildings.
              </div>
            </div>
          </div>

          {/* How does it work? */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-primary)]" />
              How RoutineKit Works
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-[var(--ink-primary)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ink-primary)] font-medium">Official Source of Truth:</strong>{" "}
                  Data is parsed directly from published Daffodil International University CSE routine releases.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-[var(--ink-primary)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ink-primary)] font-medium">100% Client-Side Privacy:</strong>{" "}
                  No student accounts, passwords, or logins required. All your preferences stay entirely in your browser&apos;s <code>localStorage</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-[var(--ink-primary)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ink-primary)] font-medium">Clash &amp; Conflict Detection:</strong>{" "}
                  Automatically detects and visually flags overlapping time slots when you enroll in retake or custom courses.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-[var(--ink-primary)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ink-primary)] font-medium">Calendar Sync &amp; Share:</strong>{" "}
                  Export directly to <code>.ics</code> files for Google Calendar and Apple Calendar, or share your schedule instantly via 1-click links and QR codes.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-[var(--ink-primary)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ink-primary)] font-medium">Offline-First Static App:</strong>{" "}
                  Built as a static progressive application that loads instantly and works offline on any device.
                </span>
              </li>
            </ul>
          </div>

          {/* Open Source & Credits */}
          <div className="pt-2 border-t border-[var(--surface-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span>Developed by </span>
              <a
                href="https://jishan.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--ink-primary)] hover:underline inline-flex items-center gap-0.5"
              >
                Jishan
                <ExternalLinkIcon className="w-3 h-3 text-[var(--ink-muted)]" />
              </a>
            </div>

            <a
              href="https://github.com/jishanws/routinekit-diu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-ground)] text-[var(--ink-primary)] border border-[var(--surface-border)] font-medium transition-all group active:scale-95 shadow-2xs"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>Star on GitHub</span>
              <StarIcon className="w-3.5 h-3.5 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)] group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:py-3.5 border-t border-[var(--surface-border)] bg-[var(--surface-card)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer shadow-xs text-center"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
