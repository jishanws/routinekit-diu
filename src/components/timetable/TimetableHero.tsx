"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CohortBreakdown, ScheduleItem } from "@/types/routine";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  RotateCcwIcon,
  BookOpenIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
} from "@/components/ui/Icons";
import { formatAcademicWeekRange, formatThreeDayRange } from "@/lib/routine/calendarLayout";
import { extractTeachersFromSchedule } from "@/lib/routine/schedule";

export type TimetableViewMode = "agenda" | "day" | "three-day" | "week";

interface TimetableHeroProps {
  cohort: CohortBreakdown;
  items?: ScheduleItem[];
  viewMode: TimetableViewMode;
  selectedDate: Date;
  isCurrentWeek: boolean;
  onReturnToCurrentWeek: () => void;
  viewSwitcher: React.ReactNode;
  onOpenSetup?: () => void;
  // Navigation for Grid modes (Day, 3-Day, Week)
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
}

export default function TimetableHero({
  cohort,
  items,
  viewMode,
  selectedDate,
  isCurrentWeek,
  onReturnToCurrentWeek,
  viewSwitcher,
  onPrev,
  onNext,
  onToday,
}: TimetableHeroProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("routinekit_hero_scope_collapsed");
        if (saved !== null) {
          return saved === "true";
        }
      } catch {
        return true;
      }
    }
    return true;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("routinekit_hero_scope_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const isGridMode = viewMode !== "agenda";

  const dateRangeLabel = useMemo(() => {
    if (viewMode === "day") {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(selectedDate);
    }
    if (viewMode === "three-day") {
      return formatThreeDayRange(selectedDate);
    }
    if (viewMode === "week") {
      return formatAcademicWeekRange(selectedDate);
    }
    return null;
  }, [viewMode, selectedDate]);

  const hasBatch = Boolean(cohort.batch && cohort.batch !== "none");
  const hasSection = Boolean(cohort.section && cohort.section !== "none");
  const isStudentSelected = hasBatch && hasSection;

  const totalCourses = useMemo(() => {
    if (cohort.totalCoursesCount) return cohort.totalCoursesCount;
    if (items) return new Set(items.map((i) => i.courseCode)).size;
    return 0;
  }, [cohort.totalCoursesCount, items]);

  const classesPerWeek = useMemo(() => {
    if (cohort.classesPerWeek !== undefined) return cohort.classesPerWeek;
    if (items) return items.length;
    return 0;
  }, [cohort.classesPerWeek, items]);

  const semesterLabel = cohort.semesterLabel || "Fall 2026";
  const semesterShort = useMemo(() => {
    return semesterLabel.replace(/semester/i, "").trim();
  }, [semesterLabel]);

  const retakeList = useMemo(() => {
    if (cohort.retakeCourses && cohort.retakeCourses.length > 0) return cohort.retakeCourses;
    if (items) {
      return Array.from(new Set(items.filter((i) => i.isRetake).map((i) => i.courseCode)));
    }
    return [];
  }, [cohort.retakeCourses, items]);

  const customList = useMemo(() => {
    if (cohort.customCourses && cohort.customCourses.length > 0) return cohort.customCourses;
    if (items) {
      return Array.from(new Set(items.filter((i) => i.isCustom).map((i) => i.courseCode)));
    }
    return [];
  }, [cohort.customCourses, items]);

  const othersList = useMemo(() => {
    if (cohort.otherCourses && cohort.otherCourses.length > 0) return cohort.otherCourses;
    if (items && cohort.batch && cohort.batch !== "none") {
      const bUpper = cohort.batch.trim().toUpperCase();
      return Array.from(
        new Set(
          items
            .filter(
              (i) =>
                !i.isRetake &&
                !i.isCustom &&
                i.batch &&
                i.batch !== "none" &&
                i.batch.trim().toUpperCase() !== bUpper
            )
            .map((i) => i.courseCode)
        )
      );
    }
    return [];
  }, [cohort.otherCourses, items, cohort.batch]);

  const conflictSummary = useMemo(() => {
    if (!items || cohort.conflictCount === 0) return null;
    const pairs: string[] = [];
    const seen = new Set<string>();

    for (const it of items) {
      if (it.conflictsWith && it.conflictsWith.length > 0) {
        for (const otherId of it.conflictsWith) {
          const other = items.find((x) => x.id === otherId);
          if (other) {
            const sortedCodes = [it.courseCode, other.courseCode].sort().join(" & ");
            const dayShort = it.day.slice(0, 3);
            const key = `${sortedCodes}_${dayShort}`;
            if (!seen.has(key)) {
              seen.add(key);
              pairs.push(`${dayShort} ${it.startTime} (${sortedCodes})`);
            }
          }
        }
      }
    }

    if (pairs.length > 0) {
      return `${cohort.conflictCount} Overlap: ${pairs.join(", ")}`;
    }
    return `${cohort.conflictCount} Overlap${cohort.conflictCount > 1 ? "s" : ""}`;
  }, [items, cohort.conflictCount]);

  const teachers = useMemo(() => {
    return extractTeachersFromSchedule(items);
  }, [items]);

  const triggerLabel = useMemo(() => {
    if (isStudentSelected) {
      const base = `Batch ${cohort.batch} · Sec ${cohort.section}`;
      const extra = cohort.othersCount + cohort.retakeCount + cohort.customCount;
      if (extra > 0) {
        return `${base} (+${extra})`;
      }
      return base;
    }

    if (hasBatch) {
      const base = `Batch ${cohort.batch}`;
      const extra = cohort.othersCount + cohort.retakeCount + cohort.customCount;
      if (extra > 0) {
        return `${base} (+${extra})`;
      }
      return base;
    }

    return `Custom Schedule (${totalCourses} ${totalCourses === 1 ? "Course" : "Courses"})`;
  }, [
    isStudentSelected,
    hasBatch,
    cohort.batch,
    cohort.section,
    cohort.othersCount,
    cohort.retakeCount,
    cohort.customCount,
    totalCourses,
  ]);

  return (
    <div className="bg-[var(--surface-card)]/95 backdrop-blur-sm border border-[var(--surface-border)] rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-all">
      {/* Primary Row: Title, Scope Toggle Button, Date Navigation, and View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-4 w-full">
        {/* Left / Header Area: Title, Scope Toggle, and Date Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 min-w-0 w-full lg:w-auto">
          {/* Main Header Bar (Single Line on Mobile, Tablet & Desktop) */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full lg:w-auto min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 lg:flex-initial">
              <h2 className="font-sans font-bold text-xs sm:text-base text-[var(--ink-primary)] tracking-tight shrink-0 select-none">
                Class Timetable
              </h2>

              {/* Scope / Batch Details Toggle Button: Matching High-Craft Capsule */}
              <button
                type="button"
                onClick={toggleCollapse}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "Expand routine scope details" : "Collapse routine scope details"}
                className={`h-7.5 sm:h-8 px-2 sm:px-2.5 inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border text-[11.5px] sm:text-xs font-sans font-medium transition-all cursor-pointer active:scale-95 group min-w-0 max-w-[155px] min-[390px]:max-w-[195px] sm:max-w-[240px] lg:max-w-none shrink shadow-2xs ${
                  !isCollapsed
                    ? "bg-[var(--surface-muted)] text-[var(--ink-primary)] border-[var(--ink-primary)]/30 ring-1 ring-[var(--surface-border)]"
                    : "bg-[var(--surface-elevated)] hover:bg-[var(--surface-muted)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-[var(--surface-border)] hover:border-[var(--brand-border)]"
                }`}
                title={isCollapsed ? "Show timetable scope details" : "Hide timetable scope details"}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--ink-secondary)] group-hover:bg-[var(--ink-primary)] transition-colors" />
                <span className="truncate">{triggerLabel}</span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] shrink-0 transition-transform duration-200 ${
                    isCollapsed ? "" : "rotate-180"
                  }`}
                />
              </button>
            </div>

            {/* Mobile/Tablet (< lg) View Switcher */}
            <div className="lg:hidden shrink-0">
              {viewSwitcher}
            </div>
          </div>

          {/* Calendar Navigation for Grid Modes: Positioned on the left so buttons NEVER shift */}
          {isGridMode && onPrev && onNext && onToday && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
              <span className="hidden lg:block h-4 w-px bg-[var(--surface-border)] mx-0.5" />

              <div className="inline-flex items-center bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-lg p-0.5 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={onPrev}
                  className="p-1 rounded-md text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                  title={
                    viewMode === "three-day"
                      ? "Previous 3 days"
                      : viewMode === "day"
                      ? "Previous day"
                      : "Previous week"
                  }
                  aria-label="Previous"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="p-1 rounded-md text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                  title={
                    viewMode === "three-day"
                      ? "Next 3 days"
                      : viewMode === "day"
                      ? "Next day"
                      : "Next week"
                  }
                  aria-label="Next"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Date Label */}
              <AnimatePresence mode="wait" initial={false}>
                {dateRangeLabel && (
                  <motion.span
                    key={dateRangeLabel}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-xs sm:text-[13px] font-sans font-semibold text-[var(--ink-primary)] tracking-tight tabular-nums ml-0.5 whitespace-nowrap shrink-0"
                  >
                    {dateRangeLabel}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Today Button right after the date */}
              <AnimatePresence initial={false}>
                {!isCurrentWeek && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={onReturnToCurrentWeek}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-sans font-medium bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--surface-border)] shadow-2xs hover:border-[var(--brand-border)] transition-all cursor-pointer active:scale-95 ml-1 shrink-0"
                    title="Return to today"
                  >
                    <RotateCcwIcon className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                    <span>Today</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Side: View Switcher (Desktop Only >= lg) */}
        <div className="hidden lg:flex items-center justify-end shrink-0">
          {viewSwitcher}
        </div>
      </div>

      {/* Well-Designed Dropdown / Collapsible Area (Whole Timetable Scope) */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-[var(--surface-border-subtle)] space-y-2.5">
              {/* 3-Column Academic Metrics Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                {/* 1. Total Courses */}
                <div className="bg-[var(--surface-elevated)]/60 border border-[var(--surface-border)] rounded-xl p-1.5 sm:p-3 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--ink-muted)] mb-0.5 sm:mb-1">
                    <BookOpenIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--ink-muted)] shrink-0" />
                    <span className="text-[8.5px] sm:text-[10px] font-sans font-bold uppercase tracking-wider truncate">Courses</span>
                  </div>
                  <span className="text-[11px] min-[420px]:text-xs sm:text-sm font-bold font-mono text-[var(--ink-primary)] block tabular-nums truncate">
                    {totalCourses} {totalCourses === 1 ? "Course" : "Courses"}
                  </span>
                  <span className="text-[8.5px] sm:text-[10px] text-[var(--ink-muted)] block truncate mt-0.5">
                    Enrolled
                  </span>
                </div>

                {/* 2. Classes Per Week */}
                <div className="bg-[var(--surface-elevated)]/60 border border-[var(--surface-border)] rounded-xl p-1.5 sm:p-3 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--ink-muted)] mb-0.5 sm:mb-1">
                    <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--ink-muted)] shrink-0" />
                    <span className="text-[8.5px] sm:text-[10px] font-sans font-bold uppercase tracking-wider truncate">Schedule</span>
                  </div>
                  <span className="text-[11px] min-[420px]:text-xs sm:text-sm font-bold font-mono text-[var(--ink-primary)] block tabular-nums truncate">
                    {classesPerWeek} Cls/wk
                  </span>
                  <span className="text-[8.5px] sm:text-[10px] text-[var(--ink-muted)] block truncate mt-0.5">
                    Weekly sessions
                  </span>
                </div>

                {/* 3. Routine Version */}
                <div className="bg-[var(--surface-elevated)]/60 border border-[var(--surface-border)] rounded-xl p-1.5 sm:p-3 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--ink-muted)] mb-0.5 sm:mb-1">
                    <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--ink-muted)] shrink-0" />
                    <span className="text-[8.5px] sm:text-[10px] font-sans font-bold uppercase tracking-wider truncate">CAC Routine</span>
                  </div>
                  <span className="text-[9.5px] min-[390px]:text-[10px] min-[420px]:text-xs sm:text-sm font-bold font-mono text-[var(--ink-primary)] block truncate">
                    Version - {cohort.routineVersion || "V4.1"}
                  </span>
                  <span className="text-[8.5px] sm:text-[10px] text-[var(--ink-muted)] block truncate mt-0.5">
                    {semesterShort}
                  </span>
                </div>
              </div>

              {/* Space-Efficient Adjustments & Overlap Shelf */}
              <div className="px-2.5 sm:px-3 py-1.5 sm:py-2.5 bg-[var(--surface-elevated)]/50 border border-[var(--surface-border)] rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs">
                {/* Left: Active Adjustments (Retakes, Custom, Cross-batch) or Standard Status */}
                {cohort.retakeCount > 0 || cohort.customCount > 0 || cohort.othersCount > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {cohort.retakeCount > 0 && (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[var(--ink-muted)] shrink-0">
                          Retake:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {retakeList.map((cCode) => (
                            <span
                              key={cCode}
                              className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-primary)] border border-[var(--surface-border)]"
                            >
                              {cCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {cohort.customCount > 0 && (
                      <div className="inline-flex items-center gap-1.5">
                        {cohort.retakeCount > 0 && <span className="text-[var(--ink-faint)]">·</span>}
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[var(--ink-muted)] shrink-0">
                          Customized:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {customList.map((cCode) => (
                            <span
                              key={cCode}
                              className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface-card)] text-[var(--ink-secondary)] border border-[var(--surface-border)]"
                            >
                              {cCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {cohort.othersCount > 0 && (
                      <div className="inline-flex items-center gap-1.5">
                        {(cohort.retakeCount > 0 || cohort.customCount > 0) && (
                          <span className="text-[var(--ink-faint)]">·</span>
                        )}
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[var(--ink-muted)] shrink-0">
                          Cross-Batch:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {othersList.map((cCode) => (
                            <span
                              key={cCode}
                              className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface-card)] text-[var(--ink-secondary)] border border-[var(--surface-border)]"
                            >
                              {cCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--ink-secondary)] font-sans">
                    <span>Enrolled in standard courses</span>
                  </div>
                )}

                {/* Right: Concise Overlap Notice (Monochrome, zero green dots) */}
                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-[var(--ink-secondary)] shrink-0">
                  <span>{cohort.conflictCount > 0 ? conflictSummary : "0 Overlaps"}</span>
                </div>
              </div>

              {/* Teachers / Faculty Shelf at the bottom */}
              {teachers.length > 0 && (
                <div className="bg-[var(--surface-elevated)]/50 border border-[var(--surface-border)] rounded-xl p-2.5 sm:p-3 space-y-2 shadow-2xs">
                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
                      <UserIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider">
                        Teachers
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--surface-border)] tabular-nums">
                        {teachers.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-sans text-[var(--ink-muted)] hidden sm:inline">
                      Faculty in routine · Profiles coming soon
                    </span>
                  </div>

                  {/* Teacher Profiles List: Circular Picture with Name Below */}
                  <div className="flex flex-wrap items-center gap-3.5 sm:gap-4.5 pt-0.5">
                    {teachers.map((teacher) => (
                      <div
                        key={teacher.initials}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                          }
                        }}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer active:scale-95 transition-all select-none focus:outline-hidden"
                        title={`Faculty: ${teacher.initials} · Profile coming soon`}
                      >
                        {/* Circular Profile Picture (Displays initial now, ready for photo) */}
                        <div
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[var(--surface-card)] to-[var(--surface-elevated)] border-2 border-[var(--surface-border)] flex items-center justify-center shrink-0 font-sans font-bold text-sm sm:text-base text-[var(--ink-primary)] shadow-2xs overflow-hidden select-none"
                          aria-hidden="true"
                        >
                          {teacher.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={teacher.photoUrl}
                              alt={teacher.initials}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className={teacher.avatarInitial.length > 1 ? "text-xs tracking-tight" : "text-sm sm:text-base"}>
                              {teacher.avatarInitial}
                            </span>
                          )}
                        </div>

                        {/* Teacher's Name / Initials Below */}
                        <span className="font-mono text-xs font-bold text-[var(--ink-primary)] tracking-tight text-center truncate max-w-[64px] sm:max-w-[72px]">
                          {teacher.initials}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
