"use client";

import React from "react";
import { motion } from "motion/react";
import { StudentSetup } from "@/types/routine";
import { ShareIcon, CheckIcon, XIcon } from "@/components/ui/Icons";

interface SharedScheduleBannerProps {
  sharedSetup: StudentSetup;
  title: string;
  onApply: () => void;
  onDismiss: () => void;
}

export default function SharedScheduleBanner({
  title,
  onApply,
  onDismiss,
}: SharedScheduleBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] shadow-2xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
          <ShareIcon className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--ink-primary)]">
              Shared Routine Preview
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-[var(--surface-card)] border border-[var(--surface-border)] text-[var(--ink-secondary)]">
              {title}
            </span>
          </div>
          <p className="text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
            You are currently viewing a routine shared via link. Would you like to save it as your active schedule?
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 sm:flex-initial h-8.5 px-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          <CheckIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Save Routine</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="h-8.5 px-3 rounded-xl bg-[var(--surface-card)] hover:bg-[var(--surface-ground)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--surface-border)] text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Dismiss shared routine and return to saved routine"
        >
          <XIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden min-[380px]:inline">Keep Mine</span>
        </button>
      </div>
    </motion.div>
  );
}
