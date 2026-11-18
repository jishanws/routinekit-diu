"use client";

import React from "react";
import { AlertCircleIcon, RotateCcwIcon, CheckIcon } from "@/components/ui/Icons";

interface VersionNoticeBannerProps {
  oldVersion?: string;
  newVersion: string;
  hasCustomizations?: boolean;
  customCourseCount?: number;
  onAcknowledge: () => void;
  onResetCustomizations?: () => void;
}

export default function VersionNoticeBanner({
  oldVersion,
  newVersion,
  hasCustomizations = false,
  customCourseCount = 0,
  onAcknowledge,
  onResetCustomizations,
}: VersionNoticeBannerProps) {
  if (!oldVersion || oldVersion === newVersion) return null;

  return (
    <div className="mb-6 p-4 sm:p-5 bg-[var(--brand-surface)]/70 border border-[var(--brand-border)] rounded-2xl shadow-2xs animate-in slide-in-from-top-2 text-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-card)] border border-[var(--brand-border)] flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircleIcon className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[var(--brand-primary)] text-sm tracking-tight">
                Routine Version Updated: {oldVersion} → {newVersion}
              </h4>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-card)] text-[var(--brand-primary)] border border-[var(--brand-border)]">
                OFFICIAL REVISION
              </span>
            </div>

            <p className="text-[var(--ink-secondary)] leading-relaxed text-xs">
              The university published a revised timetable. RoutineKit has automatically synchronized your official enrolled courses and room numbers with the new release.
            </p>

            {hasCustomizations && (
              <p className="text-[var(--ink-primary)] font-medium text-xs pt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shrink-0" />
                <span>
                  You have <strong>{customCourseCount > 0 ? customCourseCount : "personal"}</strong> customized course schedule(s). Your manual adjustments were kept intact.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0">
          {hasCustomizations && onResetCustomizations && (
            <button
              type="button"
              onClick={onResetCustomizations}
              className="px-3 py-2 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] font-semibold rounded-xl border border-[var(--surface-border)] transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
              title="Discard custom overrides and snap to the 100% official new routine"
            >
              <RotateCcwIcon className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
              <span>Reset to Official</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAcknowledge}
            className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span>{hasCustomizations ? "Keep My Edits" : "Acknowledge & Continue"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
