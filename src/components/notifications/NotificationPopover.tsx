"use client";

import React, { useEffect, useRef } from "react";
import { PublishedRoutine } from "@/types/routine";

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  routine: PublishedRoutine | null;
  versionDrift: {
    hasDrift: boolean;
    oldVersion?: string;
    newVersion: string;
    hasCustomizations?: boolean;
    customCourseCount?: number;
  };
  onAcknowledgeVersion?: () => void;
  onResetCustomizations?: () => void;
  conflictsCount?: number;
  onOpenSetup?: () => void;
}

function formatUpdateTimestamp(isoString?: string): string {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka",
    }).format(d);
  } catch {
    return isoString;
  }
}

export default function NotificationPopover({
  isOpen,
  onClose,
  routine,
  versionDrift,
  onAcknowledgeVersion,
}: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasNewVersion = Boolean(versionDrift?.hasDrift);
  const version = versionDrift?.newVersion || routine?.routine_version || "5.1";
  const formattedTime = formatUpdateTimestamp(routine?.published_at);

  return (
    <>
      {/* Invisible overlay for click-outside dismissal */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Popover anchored below bell */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Notifications"
        className="fixed inset-x-3.5 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-88 z-50 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-3.5 py-2.5 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--surface-ground)]/40">
          <span className="text-xs font-semibold text-[var(--ink-primary)]">
            Notifications
          </span>
          {hasNewVersion && (
            <span className="text-[10px] font-mono text-[var(--ink-muted)]">
              1 new
            </span>
          )}
        </div>

        <div className="p-3.5 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {hasNewVersion && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-primary)] shrink-0" />
            )}
            <span className="font-semibold text-[var(--ink-primary)] whitespace-nowrap">
              CSE Routine v{version}
            </span>
            <span className="text-[var(--ink-muted)] select-none">·</span>
            <span className="font-mono text-[11px] text-[var(--ink-secondary)] whitespace-nowrap">
              {formattedTime}
            </span>
          </div>

          {hasNewVersion && (
            <button
              type="button"
              onClick={() => {
                if (onAcknowledgeVersion) onAcknowledgeVersion();
                onClose();
              }}
              className="text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:underline cursor-pointer shrink-0 ml-1"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </>
  );
}
