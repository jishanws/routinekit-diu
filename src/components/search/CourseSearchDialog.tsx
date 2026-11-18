"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { ScheduleItem } from "@/types/routine";
import { formatBatchSectionBadge } from "@/lib/routine/schedule";
import { formatTimeSlot12 } from "@/lib/routine/calendarLayout";
import { SearchIcon, XIcon } from "@/components/ui/Icons";

interface CourseSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ScheduleItem[];
  onSelectClass: (item: ScheduleItem) => void;
}

export default function CourseSearchDialog({
  isOpen,
  onClose,
  items,
  onSelectClass,
}: CourseSearchDialogProps) {
  const [search, setSearch] = useState("");

  // Keyboard shortcut listener: Cmd+K / Ctrl+K or / to open/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150" />
        <Dialog.Content className="fixed left-1/2 top-[6%] sm:top-[16%] -translate-x-1/2 z-50 w-[94vw] max-w-xl max-h-[86vh] rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <Dialog.Title className="sr-only">Search Enrolled Courses</Dialog.Title>
          <Dialog.Description className="sr-only">
            Instant spotlight search to find classes, instructors, rooms, and times in your routine.
          </Dialog.Description>

          <Command className="flex flex-col w-full h-full text-[var(--ink-primary)]">
            <div className="flex items-center gap-3 px-3.5 sm:px-4 py-3 sm:py-3.5 border-b border-[var(--surface-border)] bg-[var(--surface-elevated)]/50">
              <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--brand-primary)] shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search courses, instructors, rooms..."
                className="w-full bg-transparent text-base sm:text-sm font-sans placeholder:text-[var(--ink-muted)] text-[var(--ink-primary)] focus:outline-hidden"
                autoFocus
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-[var(--surface-card)] border border-[var(--surface-border)] text-[var(--ink-muted)]">
                ESC
              </kbd>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="w-8 h-8 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <Command.List className="max-h-[360px] sm:max-h-[380px] overflow-y-auto p-2 space-y-1">
              <Command.Empty className="py-8 text-center text-xs font-mono text-[var(--ink-muted)]">
                No matching enrolled classes found.
              </Command.Empty>

              <Command.Group heading="Enrolled Timetable Classes" className="text-[10px] font-sans font-bold uppercase tracking-wider text-[var(--ink-muted)] px-3 py-1.5">
                {items.map((item) => {
                  const badge = formatBatchSectionBadge(item);
                  const timeFormatted = `${formatTimeSlot12(item.startTime)} – ${formatTimeSlot12(item.endTime)}`;
                  const hasConflict = Boolean(item.conflictsWith && item.conflictsWith.length > 0);

                  return (
                    <Command.Item
                      key={item.id}
                      value={`${item.courseCode} ${item.instructor || ""} ${item.room || ""} ${item.day} ${badge}`}
                      onSelect={() => {
                        onSelectClass(item);
                        onClose();
                      }}
                      className="px-3 py-2.5 sm:px-3.5 sm:py-2.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 cursor-pointer select-none transition-colors data-[selected=true]:bg-[var(--brand-surface)] data-[selected=true]:text-[var(--brand-primary)] group border border-transparent data-[selected=true]:border-[var(--brand-border)]"
                    >
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-1.5 h-7 sm:h-8 rounded-full shrink-0 mt-0.5 sm:mt-0 bg-[var(--brand-primary)]"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-sm text-[var(--ink-primary)] group-data-[selected=true]:text-[var(--brand-primary)]">
                              {item.courseCode}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--ink-secondary)]">
                              {badge}
                            </span>
                            {item.isRetake && (
                              <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-[var(--status-retake-surface)] text-[var(--status-retake)] border border-[var(--status-retake-border)]">
                                RETAKE
                              </span>
                            )}
                            {hasConflict && (
                              <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                OVERLAP
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Details on Desktop / Bottom Row on Mobile */}
                      <div className="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0 font-mono text-[11px] text-[var(--ink-muted)] pl-4 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--surface-border-subtle)]/50">
                        <span className="font-semibold text-[var(--ink-secondary)]">
                          {item.day.slice(0, 3)} · {timeFormatted}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {item.room && <span>{item.room}</span>}
                          {item.instructor && <span>· {item.instructor}</span>}
                        </div>
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>

            <div className="p-2.5 border-t border-[var(--surface-border)] bg-[var(--surface-elevated)]/40 flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)] px-4">
              <span className="hidden sm:inline">Use ↑ ↓ to navigate</span>
              <span className="hidden sm:inline">Press ↵ to inspect class</span>
              <span className="sm:hidden text-center w-full">Tap any class to inspect details</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
