"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { ScheduleItem, PublishedRoutine, StudentSetup } from "@/types/routine";
import { getScheduleTitle } from "@/lib/routine/schedule";
import { exportScheduleIcsFile } from "@/lib/calendar/icsGenerator";
import {
  exportTimetableAsPdf,
  exportTimetableAsPng,
} from "@/lib/export/timetableExporter";
import {
  CalendarIcon,
  DownloadIcon,
  FileTextIcon,
  ImageIcon,
  ShareIcon,
  XIcon,
} from "@/components/ui/Icons";

interface ExportModalProps {
  routine: PublishedRoutine;
  setup: StudentSetup;
  items: ScheduleItem[];
  isOpen: boolean;
  onClose: () => void;
  onOpenShare?: () => void;
}

export default function ExportModal({
  routine,
  setup,
  items,
  isOpen,
  onClose,
  onOpenShare,
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

  const handlePdfExport = async () => {
    try {
      setDownloading("pdf");
      await exportTimetableAsPdf(setup, routine, items);
      toast.success("Downloaded official PDF timetable!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const handleImageExport = async () => {
    try {
      setDownloading("png");
      await exportTimetableAsPng(setup, routine, items);
      toast.success("Downloaded timetable image card!");
    } catch (err) {
      console.error("Image export error:", err);
      toast.error("Failed to generate image. Please try again.");
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
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* 1. Share Routine Link Action */}
          {onOpenShare && (
            <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)]/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0">
                  <ShareIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[var(--ink-primary)] truncate">
                    Share Routine Link &amp; QR
                  </h3>
                  <p className="text-[11px] text-[var(--ink-muted)] truncate">
                    Send to friends or scan with phone camera
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShare();
                }}
                className="h-8 px-3 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-[var(--brand-border)] text-xs font-semibold text-[var(--ink-primary)] shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                Share
              </button>
            </div>
          )}

          {/* 2. Calendar Sync */}
          <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-ground)] space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <CalendarIcon className="w-3.5 h-3.5" />
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
                  Imports into Google Calendar, Apple Calendar, and Outlook with weekly recurrence.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleIcsExport}
              disabled={downloading === "ics"}
              className="w-full py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold rounded-lg active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>{downloading === "ics" ? "Generating..." : "Download Calendar (.ics)"}</span>
            </button>
          </div>

          {/* 3. Official Vector PDF */}
          <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-ground)] space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <FileTextIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-[var(--ink-primary)]">
                    Official DIU Routine PDF
                  </h3>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--ink-secondary)]">
                    .pdf
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  Designed university timetable grid, A4 landscape ready for printing.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePdfExport}
              disabled={downloading === "pdf"}
              className="w-full py-2 px-3 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--surface-border)] hover:border-[var(--brand-border)] text-xs font-semibold rounded-lg active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>{downloading === "pdf" ? "Rendering PDF..." : "Download PDF Timetable"}</span>
            </button>
          </div>

          {/* 4. High-Res Image Card */}
          <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-ground)] space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-[var(--ink-primary)]">
                    Shareable Routine Image
                  </h3>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--ink-secondary)]">
                    .png
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  Crisp 2x retina timetable image card for mobile lock screens and messaging.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleImageExport}
              disabled={downloading === "png"}
              className="w-full py-2 px-3 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--surface-border)] hover:border-[var(--brand-border)] text-xs font-semibold rounded-lg active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>{downloading === "png" ? "Rendering Image..." : "Download Image (.png)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
