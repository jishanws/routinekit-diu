"use client";

import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ScheduleItem, DayOfWeek, ClassCustomOverride, CustomClassMeeting } from "@/types/routine";
import { formatBatchSectionBadge } from "@/lib/routine/schedule";
import { ACADEMIC_DAYS, sortClassesByDayAndTime, formatTimeSlot12, parseTimeInput } from "@/lib/routine/calendarLayout";
import {
  XIcon,
  SlidersIcon,
  RotateCcwIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
} from "@/components/ui/Icons";

const emptySubscribe = () => () => {};

interface ClassDetailModalProps {
  item: ScheduleItem | null;
  allItems?: ScheduleItem[];
  onClose: () => void;
  onSaveOverride?: (classId: string, override: ClassCustomOverride) => void;
  onResetOverride?: (classId: string) => void;
  onSaveCourseSchedule?: (courseCode: string, meetings: CustomClassMeeting[]) => void;
  onResetCourseSchedule?: (courseCode: string) => void;
}

const normCode = (c: string) => (c || "").replace(/\s+/g, "").toUpperCase();

export default function ClassDetailModal({
  item,
  allItems = [],
  onClose,
  onSaveOverride,
  onResetOverride,
  onSaveCourseSchedule,
  onResetCourseSchedule,
}: ClassDetailModalProps) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isEditing, setIsEditing] = useState(false);
  const [meetings, setMeetings] = useState<CustomClassMeeting[]>([]);

  // Find all weekly sessions/meetings for this course enrollment
  const courseMeetings = useMemo(() => {
    if (!item) return [];
    const targetCode = normCode(item.courseCode);
    const found = allItems.filter(
      (i) => normCode(i.courseCode) === targetCode
    );
    if (found.length === 0) return [item];
    return sortClassesByDayAndTime(found);
  }, [item, allItems]);

  const isCustomCourse = useMemo(() => {
    return courseMeetings.some((m) => m.isCustom);
  }, [courseMeetings]);

  const hasConflict = useMemo(() => {
    return courseMeetings.some((m) => m.conflictsWith && m.conflictsWith.length > 0);
  }, [courseMeetings]);

  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const prevCourseCodeRef = React.useRef<string | null>(null);

  // Sync edit state whenever item or course meetings change, but do NOT wipe active user edits
  useEffect(() => {
    if (item) {
      const cleanCode = normCode(item.courseCode);
      const isNewCourse = prevCourseCodeRef.current !== cleanCode;
      prevCourseCodeRef.current = cleanCode;

      if (!isEditing || isNewCourse) {
        const initialList: CustomClassMeeting[] = courseMeetings.map((m, idx) => ({
          id: m.id || `${normCode(m.courseCode)}_custom_${idx}`,
          day: m.day,
          startTime: formatTimeSlot12(m.startTime) || m.startTime || "8:30 AM",
          endTime: formatTimeSlot12(m.endTime) || m.endTime || "10:00 AM",
          room: m.room || "",
          instructor: m.instructor || "",
          classType: m.classType || "theory",
          isCustom: true,
        }));

        setMeetings(
          initialList.length > 0
            ? initialList
            : [
                {
                  id: `${normCode(item.courseCode)}_custom_0`,
                  day: item.day,
                  startTime: formatTimeSlot12(item.startTime) || item.startTime || "8:30 AM",
                  endTime: formatTimeSlot12(item.endTime) || item.endTime || "10:00 AM",
                  room: item.room || "",
                  instructor: item.instructor || "",
                  classType: item.classType || "theory",
                  isCustom: true,
                },
              ]
        );

        if (isNewCourse) {
          setIsEditing(false);
          setSaveNotification(null);
        }
      }
    }
  }, [item, courseMeetings, isEditing]);

  // Real-time validation for all meetings
  const validationResults = useMemo(() => {
    return meetings.map((m) => {
      const startRes = parseTimeInput(m.startTime);
      const endRes = parseTimeInput(m.endTime);

      if (!startRes.valid) {
        const short = startRes.error?.includes("minutes")
          ? "00–59 min only"
          : startRes.error?.includes("hour")
          ? "Invalid hour"
          : "Invalid time";
        return {
          hasError: true,
          error: `Start time: ${startRes.error}`,
          shortError: `Start: ${short}`,
          errorField: "start" as const,
          start24: "",
          end24: "",
        };
      }
      if (!endRes.valid) {
        const short = endRes.error?.includes("minutes")
          ? "00–59 min only"
          : endRes.error?.includes("hour")
          ? "Invalid hour"
          : "Invalid time";
        return {
          hasError: true,
          error: `End time: ${endRes.error}`,
          shortError: `End: ${short}`,
          errorField: "end" as const,
          start24: "",
          end24: "",
        };
      }
      if (startRes.minutes >= endRes.minutes) {
        return {
          hasError: true,
          error: "Start time must be earlier than end time",
          shortError: "Start must precede end",
          errorField: "range" as const,
          start24: "",
          end24: "",
        };
      }
      return {
        hasError: false,
        error: null,
        shortError: null,
        errorField: null,
        start24: startRes.time24,
        end24: endRes.time24,
      };
    });
  }, [meetings]);

  const hasAnyTimeError = validationResults.some((r) => r.hasError);

  // Close on Escape key or revert edit mode
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, isEditing, onClose]);

  if (!isClient || !item) return null;

  const updateMeeting = (idx: number, updates: Partial<CustomClassMeeting>) => {
    setMeetings((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...updates } : m))
    );
  };

  const removeMeeting = (idx: number) => {
    setMeetings((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMeeting = () => {
    setMeetings((prev) => [
      ...prev,
      {
        id: `${normCode(item.courseCode)}_custom_${Date.now()}_${prev.length}`,
        day: "Saturday",
        startTime: "8:30 AM",
        endTime: "10:00 AM",
        room: prev[0]?.room || "",
        instructor: prev[0]?.instructor || "",
        classType: "theory",
        isCustom: true,
      },
    ]);
  };

  const handleSave = () => {
    if (!item) return;

    // Check if any meeting has an invalid time
    const firstError = validationResults.find((r) => r.hasError);
    if (firstError) {
      setSaveNotification(`Cannot save: ${firstError.error}`);
      return;
    }

    // Sanitize meetings times into verified canonical 24-hr "HH:MM"
    const sanitizedMeetings = meetings.map((m, mi) => {
      const vr = validationResults[mi];
      return {
        ...m,
        id: m.id || `${normCode(item.courseCode)}_custom_${mi}`,
        startTime: vr?.start24 || "08:30",
        endTime: vr?.end24 || "10:00",
        room: (m.room || "").trim(),
        instructor: (m.instructor || "").trim(),
        classType: m.classType || "theory",
        isCustom: true,
      };
    });

    if (onSaveCourseSchedule) {
      onSaveCourseSchedule(item.courseCode, sanitizedMeetings);
      setIsEditing(false);
      onClose();
    } else if (onSaveOverride && sanitizedMeetings[0]) {
      onSaveOverride(item.id, {
        day: sanitizedMeetings[0].day,
        startTime: sanitizedMeetings[0].startTime,
        endTime: sanitizedMeetings[0].endTime,
        room: sanitizedMeetings[0].room,
        instructor: sanitizedMeetings[0].instructor,
        isCustom: true,
      });
      setIsEditing(false);
      onClose();
    }
  };

  const handleReset = () => {
    if (!item) return;
    if (onResetCourseSchedule) {
      onResetCourseSchedule(item.courseCode);
      setIsEditing(false);
    } else if (onResetOverride) {
      onResetOverride(item.id);
      setIsEditing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm sm:backdrop-blur-xs overscroll-contain transition-opacity">
      <div className="bg-[var(--surface-card)] border-t sm:border border-[var(--surface-border)] rounded-t-[28px] sm:rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250">
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--surface-border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--surface-card)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-[var(--ink-primary)] tracking-tight">
                {item.courseCode}
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                {formatBatchSectionBadge(item)}
              </span>
              {isCustomCourse && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--surface-elevated)] text-[var(--brand-primary)] border border-[var(--surface-border)]">
                  Custom
                </span>
              )}
            </div>
            {item.courseTitle && (
              <p className="text-xs text-[var(--ink-secondary)] truncate mt-0.5">
                {item.courseTitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-ground)] transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 pb-5 space-y-3 overflow-y-auto flex-1 overscroll-contain [scrollbar-gutter:stable]">
          {saveNotification && (
            <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl text-xs text-[var(--ink-primary)] flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <CheckIcon className="w-4 h-4 text-[var(--ink-primary)] shrink-0" />
              <span className="font-semibold">{saveNotification}</span>
            </div>
          )}

          {hasConflict && (
            <div className="px-3.5 py-2.5 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl text-xs text-[var(--ink-secondary)] flex items-center gap-2.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)] shrink-0" />
              <span className="font-medium text-[var(--ink-primary)]">
                Time slot overlap detected with another scheduled course.
              </span>
            </div>
          )}

          {isCustomCourse && !isEditing && (
            <div className="px-3.5 py-2 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl text-xs text-[var(--ink-secondary)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-secondary)] shrink-0" />
              <span>Custom schedule modified from standard routine.</span>
            </div>
          )}

          {!isEditing ? (
            /* View Mode: All weekly sessions for this course */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-mono font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                  Weekly Schedule ({courseMeetings.length})
                </span>
              </div>

              <div className="space-y-2">
                {courseMeetings.map((session, index) => {
                  return (
                    <div
                      key={session.id || index}
                      className="p-3 sm:p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] transition-all"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-xs mb-2">
                        <span className="font-bold text-[var(--ink-primary)]">
                          Session {index + 1}
                        </span>
                        <span className="text-[var(--ink-muted)]">·</span>
                        <span className="font-semibold text-[var(--ink-primary)]">
                          {session.day}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-xs font-mono bg-[var(--surface-ground)]/60 rounded-lg p-2.5 sm:p-3 border border-[var(--surface-border-subtle)]">
                        <div className="min-w-0 shrink-0">
                          <span className="block text-[10px] text-[var(--ink-muted)] uppercase font-semibold">Time</span>
                          <span className="font-semibold text-[var(--ink-primary)] tabular-nums text-xs whitespace-nowrap block mt-0.5">
                            {formatTimeSlot12(session.startTime)} – {formatTimeSlot12(session.endTime)}
                          </span>
                        </div>

                        <div className="hidden sm:block w-px h-6 bg-[var(--surface-border)] shrink-0" />

                        <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                          <div className="min-w-0">
                            <span className="block text-[10px] text-[var(--ink-muted)] uppercase font-semibold">Room</span>
                            <span className="font-semibold text-[var(--ink-primary)] text-xs whitespace-nowrap block mt-0.5">
                              {session.room || "TBA"}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <span className="block text-[10px] text-[var(--ink-muted)] uppercase font-semibold">Faculty</span>
                            <span className="font-semibold text-[var(--ink-primary)] text-xs whitespace-nowrap block mt-0.5">
                              {session.instructor || "TBA"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Edit Schedule Form: Edit ALL days / meetings for this course */
            <div className="space-y-3.5">
              <div className="space-y-3">
                {meetings.map((meeting, index) => {
                  const sessionValidation = validationResults[index];
                  return (
                  <div
                    key={meeting.id || index}
                    className="p-3.5 sm:p-4 bg-[var(--surface-ground)] rounded-2xl border border-[var(--surface-border)] space-y-3 shadow-2xs transition-all"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border-subtle)]">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-secondary)]" />
                        <span className="text-xs font-bold text-[var(--ink-primary)]">
                          Session {index + 1}
                        </span>
                      </div>

                      {meetings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMeeting(index)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[var(--surface-border)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-card)] cursor-pointer active:scale-95 transition-all shadow-2xs"
                          title="Remove this session"
                          aria-label="Remove session"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {/* Row 1: Day of Week & Time Range */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1 min-h-[16px]">
                            <label className="block text-[10.5px] font-mono font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                              Day of Week
                            </label>
                          </div>
                          <div className="relative">
                            <select
                              value={meeting.day}
                              onChange={(e) => updateMeeting(index, { day: e.target.value as DayOfWeek })}
                              className="w-full h-8.5 sm:h-9 pl-3 pr-8 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl text-xs font-mono font-medium text-[var(--ink-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 cursor-pointer appearance-none shadow-2xs transition-colors"
                            >
                              {ACADEMIC_DAYS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                            <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1 min-h-[16px]">
                            <label className="block text-[10.5px] font-mono font-semibold text-[var(--ink-muted)] uppercase tracking-wider whitespace-nowrap">
                              Time
                            </label>
                            {sessionValidation?.hasError && (
                              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-400 font-medium tracking-tight truncate">
                                {sessionValidation.shortError}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <input
                              type="text"
                              value={meeting.startTime}
                              onChange={(e) => updateMeeting(index, { startTime: e.target.value })}
                              onBlur={() => {
                                const parsed = parseTimeInput(meeting.startTime);
                                if (parsed.valid) {
                                  updateMeeting(index, { startTime: parsed.time12 });
                                }
                              }}
                              placeholder="08:30 AM"
                              aria-label="Start Time"
                              className={`flex-1 min-w-0 h-8.5 sm:h-9 px-2.5 bg-[var(--surface-card)] border rounded-xl text-xs font-mono font-medium text-[var(--ink-primary)] outline-none focus:border-[var(--brand-primary)] tabular-nums shadow-2xs transition-colors text-center placeholder:text-[var(--ink-faint)] ${
                                sessionValidation?.hasError && (sessionValidation.errorField === "start" || sessionValidation.errorField === "range")
                                  ? "border-zinc-400 dark:border-zinc-400"
                                  : "border-[var(--surface-border)]"
                              }`}
                            />

                            <span className="text-xs font-mono text-[var(--ink-faint)] select-none shrink-0">–</span>

                            <input
                              type="text"
                              value={meeting.endTime}
                              onChange={(e) => updateMeeting(index, { endTime: e.target.value })}
                              onBlur={() => {
                                const parsed = parseTimeInput(meeting.endTime);
                                if (parsed.valid) {
                                  updateMeeting(index, { endTime: parsed.time12 });
                                }
                              }}
                              placeholder="11:30 AM"
                              aria-label="End Time"
                              className={`flex-1 min-w-0 h-8.5 sm:h-9 px-2.5 bg-[var(--surface-card)] border rounded-xl text-xs font-mono font-medium text-[var(--ink-primary)] outline-none focus:border-[var(--brand-primary)] tabular-nums shadow-2xs transition-colors text-center placeholder:text-[var(--ink-faint)] ${
                                sessionValidation?.hasError && (sessionValidation.errorField === "end" || sessionValidation.errorField === "range")
                                  ? "border-zinc-400 dark:border-zinc-400"
                                  : "border-[var(--surface-border)]"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Room & Faculty */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div>
                          <label className="block text-[10.5px] font-mono font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-1">
                            Room
                          </label>
                          <input
                            type="text"
                            value={meeting.room || ""}
                            onChange={(e) => updateMeeting(index, { room: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSave();
                              }
                            }}
                            placeholder="KT-501"
                            className="w-full h-8.5 sm:h-9 px-3 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl text-xs font-mono font-medium text-[var(--ink-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 shadow-2xs transition-colors placeholder:text-[var(--ink-faint)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-mono font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-1">
                            Faculty Initial
                          </label>
                          <input
                            type="text"
                            value={meeting.instructor || ""}
                            onChange={(e) => updateMeeting(index, { instructor: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSave();
                              }
                            }}
                            placeholder="MAM"
                            className="w-full h-8.5 sm:h-9 px-3 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl text-xs font-mono font-medium text-[var(--ink-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 shadow-2xs transition-colors placeholder:text-[var(--ink-faint)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addMeeting}
                  className="w-full py-2.5 border border-dashed border-[var(--surface-border)] hover:border-[var(--ink-muted)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-xs font-mono font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Session</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Native Footer */}
        <div className="px-4 sm:px-6 py-3 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--surface-border)] bg-[var(--surface-card)] flex items-center justify-between gap-3 shrink-0">
          <div>
            {!isEditing && isCustomCourse && (onResetCourseSchedule || onResetOverride) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title="Revert to published routine schedule"
              >
                <RotateCcwIcon className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                <span className="hidden sm:inline">Reset to Official</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {(onSaveCourseSchedule || onSaveOverride) && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-[var(--ink-primary)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-ground)] border border-[var(--surface-border)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <SlidersIcon className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                    <span>Edit Schedule</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={hasAnyTimeError}
                  onMouseDown={(e) => {
                    if (hasAnyTimeError) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    handleSave();
                  }}
                  onClick={handleSave}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-md select-none ${
                    hasAnyTimeError
                      ? "text-zinc-400 dark:text-zinc-500 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 cursor-not-allowed opacity-60"
                      : "text-white dark:text-zinc-900 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white active:scale-95 cursor-pointer"
                  }`}
                  title={hasAnyTimeError ? "Fix invalid time inputs to save" : "Save course changes (Enter)"}
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
