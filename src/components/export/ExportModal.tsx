"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { ScheduleItem, PublishedRoutine, StudentSetup } from "@/types/routine";
import { getScheduleTitle } from "@/lib/routine/schedule";
import { exportScheduleIcsFile } from "@/lib/calendar/icsGenerator";
import {
  CalendarIcon,
  DownloadIcon,
  XIcon,
} from "@/components/ui/Icons";

interface ExportModalProps {
  routine: PublishedRoutine;
  setup: StudentSetup;
  items: ScheduleItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({
  routine,
  setup,
  items,
  isOpen,
  onClose,
}: ExportModalProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isOpen) return null;

  const scheduleTitle = getScheduleTitle(setup, items);

  const handleIcsExport = () => {
    try {
      setDownloading("ics");
      exportScheduleIcsFile(setup, routine, items);
      toast.success("Downloaded calendar file (.ics)");
    } catch (err) {
      console.error("ICS export error:", err);
      toast.error("Failed to generate calendar file. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-contain transition-opacity">
      <div className="bg-[var(--surface-card)] border-t sm:border border-[var(--surface-border)] rounded-t-2xl sm:rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--surface-border)] flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-base font-bold font-sans text-[var(--ink-primary)] tracking-tight">
              Export Schedule
            </h2>
            <p className="text-xs text-[var(--ink-secondary)] truncate">
              {scheduleTitle} · {items.length} {items.length === 1 ? "class" : "classes"} / week
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-ground)] transition-all cursor-pointer active:scale-95 shrink-0"
            aria-label="Close"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 space-y-3.5">
          {/* Main Action: Calendar Sync */}
          <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-ground)] space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-[var(--ink-primary)]">
                    Calendar File
                  </h3>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--ink-secondary)]">
                    .ics
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  Imports into Google Calendar, Apple Calendar, and Outlook with weekly recurrence through {routine.end_date}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleIcsExport}
              disabled={downloading === "ics"}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold rounded-lg active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>{downloading === "ics" ? "Generating..." : "Download Calendar (.ics)"}</span>
            </button>

            <p className="text-[10.5px] text-[var(--ink-faint)] text-center">
              Google Calendar: Settings → Import &amp; Export → Upload .ics
            </p>
          </div>

          {/* Quiet Upcoming Notice - Single minimal row, zero fluff */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--surface-elevated)]/60 border border-[var(--surface-border-subtle)] text-xs">
            <span className="text-[11px] text-[var(--ink-muted)]">
              PDF &amp; Image export
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[var(--surface-card)] border border-[var(--surface-border)] text-[var(--ink-muted)]">
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
