"use client";

import React, { ReactNode, useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AppFooter from "@/components/layout/AppFooter";
import NotificationPopover from "@/components/notifications/NotificationPopover";
import {
  RoutineKitMark,
  SlidersIcon,
  DownloadIcon,
  BellIcon,
} from "@/components/ui/Icons";
import { PublishedRoutine } from "@/types/routine";

interface AppShellProps {
  onOpenSetup?: () => void;
  onOpenExport?: () => void;
  routine?: PublishedRoutine | null;
  versionDrift?: {
    hasDrift: boolean;
    oldVersion?: string;
    newVersion: string;
    hasCustomizations?: boolean;
    customCourseCount?: number;
  };
  onAcknowledgeVersion?: () => void;
  onResetCustomizations?: () => void;
  conflictsCount?: number;
  isOffline?: boolean;
  children: ReactNode;
}

export default function AppShell({
  onOpenSetup,
  onOpenExport,
  routine,
  versionDrift,
  onAcknowledgeVersion,
  onResetCustomizations,
  conflictsCount = 0,
  isOffline = false,
  children,
}: AppShellProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const hasUnread = Boolean(versionDrift?.hasDrift);

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-[var(--ink-primary)] transition-colors flex flex-col font-sans relative">
      {/* 58px Floating Command Masthead */}
      <header className="sticky top-0 z-40 h-[58px] border-b border-[var(--surface-border)] bg-[var(--surface-card)]/90 backdrop-blur-md shadow-2xs flex items-center pt-safe">
        <div className="max-w-4xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. Left Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="transition-transform active:scale-95 hover:scale-105 shrink-0">
              <RoutineKitMark className="w-8 h-8 drop-shadow-2xs" />
            </div>
            
            <span className="font-serif font-bold text-base sm:text-lg text-[var(--ink-primary)] tracking-tight">
              RoutineKit
            </span>
          </div>

          {/* 2. Right Action Capsule */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Manage Routine Button */}
            <button
              type="button"
              onClick={onOpenSetup}
              title="Configure Batch & Courses"
              aria-label="Configure Batch & Courses"
              className="h-8.5 sm:h-9 px-2 sm:px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--ink-primary)] text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
            >
              <SlidersIcon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
              <span className="hidden sm:inline">Setup</span>
            </button>

            {/* Export Button */}
            <button
              type="button"
              onClick={onOpenExport}
              title="Export Routine"
              aria-label="Export Routine"
              className="h-8.5 sm:h-9 px-2 sm:px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-xs font-medium transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
            >
              <DownloadIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Notification Bell with Floating Popover */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                title={hasUnread ? "New routine version published" : "Notifications"}
                aria-label="Notifications"
                aria-expanded={isNotificationOpen}
                className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center shrink-0 relative ${
                  isNotificationOpen
                    ? "bg-[var(--surface-elevated)] text-[var(--ink-primary)] border-[var(--ink-primary)]/25"
                    : hasUnread
                    ? "border-[var(--ink-primary)]/40 bg-[var(--surface-elevated)] text-[var(--ink-primary)] shadow-2xs"
                    : "border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                <BellIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-[var(--ink-primary)] ring-2 ring-[var(--surface-card)]" />
                )}
              </button>

              {/* Minimal Notification Popover */}
              <NotificationPopover
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                routine={routine ?? null}
                versionDrift={
                  versionDrift ?? {
                    hasDrift: false,
                    newVersion: routine?.routine_version || "",
                    hasCustomizations: false,
                    customCourseCount: 0,
                  }
                }
                onAcknowledgeVersion={onAcknowledgeVersion}
                onResetCustomizations={onResetCustomizations}
                conflictsCount={conflictsCount}
                onOpenSetup={onOpenSetup}
              />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Offline Mode Status Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[var(--surface-elevated)] border-b border-[var(--surface-border)] px-4 py-1.5 text-center text-xs font-mono text-[var(--ink-secondary)] flex items-center justify-center gap-2 select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-secondary)] opacity-70 animate-pulse" />
          <span>Offline mode · Showing cached routine</span>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 flex-1 relative">
        {children}
      </main>

      {/* Designed Footer */}
      <AppFooter />
    </div>
  );
}
