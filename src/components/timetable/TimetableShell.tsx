"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ScheduleItem, ClassCustomOverride, CustomClassMeeting, DayOfWeek, CohortBreakdown } from "@/types/routine";
import DayAgendaView from "./DayAgendaView";
import DayTimeGridView from "./DayTimeGridView";
import ThreeDayGridView from "./ThreeDayGridView";
import WeekGridView from "./WeekGridView";

const ClassDetailModal = dynamic(() => import("./ClassDetailModal"), { ssr: false });
import TimetableHero, { TimetableViewMode } from "./TimetableHero";
import {
  ChevronDownIcon,
  CheckIcon,
} from "@/components/ui/Icons";
import {
  getDhakaNow,
  getSaturdayOfWeek,
  ALL_DAYS,
} from "@/lib/routine/calendarLayout";
import { TRANSITIONS } from "@/lib/ui/transitions";

interface TimetableShellProps {
  items: ScheduleItem[];
  cohortLabel?: string;
  cohortBreakdown?: CohortBreakdown;
  onOpenSetup?: () => void;
  onSaveOverride?: (classId: string, override: ClassCustomOverride) => void;
  onResetOverride?: (classId: string) => void;
  onSaveCourseSchedule?: (courseCode: string, meetings: CustomClassMeeting[]) => void;
  onResetCourseSchedule?: (courseCode: string) => void;
}

export type { TimetableViewMode };

export default function TimetableShell({
  items,
  cohortLabel,
  cohortBreakdown,
  onOpenSetup,
  onSaveOverride,
  onResetOverride,
  onSaveCourseSchedule,
  onResetCourseSchedule,
}: TimetableShellProps) {
  // Unified view mode: "agenda" (default), "day", "three-day", or "week"
  const [viewMode, setViewMode] = useState<TimetableViewMode>("agenda");

  // Selected date for calendar-style views
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = getDhakaNow();
    if (now.getDay() === 5) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    return now;
  });
  const [selectedClass, setSelectedClass] = useState<ScheduleItem | null>(null);

  const todayDhaka = useMemo(() => getDhakaNow(), []);

  const selectedDayName = useMemo(() => {
    const dayStr = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Dhaka",
    }).format(selectedDate) as DayOfWeek;
    return ALL_DAYS.includes(dayStr) ? dayStr : "Saturday";
  }, [selectedDate]);

  const isSelectedToday = useMemo(() => {
    return (
      selectedDate.getFullYear() === todayDhaka.getFullYear() &&
      selectedDate.getMonth() === todayDhaka.getMonth() &&
      selectedDate.getDate() === todayDhaka.getDate()
    );
  }, [selectedDate, todayDhaka]);

  const isCurrentWindow = useMemo(() => {
    if (viewMode === "three-day" || viewMode === "day") {
      return isSelectedToday;
    }
    const todaySat = getSaturdayOfWeek(todayDhaka);
    const selSat = getSaturdayOfWeek(selectedDate);
    return (
      todaySat.getFullYear() === selSat.getFullYear() &&
      todaySat.getMonth() === selSat.getMonth() &&
      todaySat.getDate() === selSat.getDate()
    );
  }, [viewMode, isSelectedToday, selectedDate, todayDhaka]);

  const handlePrev = () => {
    setSelectedDate((prev) => {
      const copy = new Date(prev);
      if (viewMode === "day") {
        copy.setDate(copy.getDate() - 1);
      } else if (viewMode === "three-day") {
        copy.setDate(copy.getDate() - 3);
      } else {
        copy.setDate(copy.getDate() - 7);
      }
      return copy;
    });
  };

  const handleNext = () => {
    setSelectedDate((prev) => {
      const copy = new Date(prev);
      if (viewMode === "day") {
        copy.setDate(copy.getDate() + 1);
      } else if (viewMode === "three-day") {
        copy.setDate(copy.getDate() + 3);
      } else {
        copy.setDate(copy.getDate() + 7);
      }
      return copy;
    });
  };

  const handlePrevWeek = () => {
    setSelectedDate((prev) => {
      const copy = new Date(prev);
      copy.setDate(copy.getDate() - 7);
      return copy;
    });
  };

  const handleNextWeek = () => {
    setSelectedDate((prev) => {
      const copy = new Date(prev);
      copy.setDate(copy.getDate() + 7);
      return copy;
    });
  };

  const handleToday = () => {
    setSelectedDate(getDhakaNow());
  };

  // Global keyboard shortcuts for timetable navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.shiftKey || e.altKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevWeek();
      } else if ((e.shiftKey || e.altKey) && e.key === "ArrowRight") {
        e.preventDefault();
        handleNextWeek();
      } else if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleToday();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSaveOverride = (classId: string, override: ClassCustomOverride) => {
    if (onSaveOverride) {
      onSaveOverride(classId, override);
    }
    setSelectedClass(null);
    toast.success("Saved class changes");
  };

  const handleSaveCourseSchedule = (
    courseCode: string,
    meetings: CustomClassMeeting[]
  ) => {
    if (onSaveCourseSchedule) {
      onSaveCourseSchedule(courseCode, meetings);
    }
    setSelectedClass(null);

    if (meetings.length > 0) {
      const firstMeeting = meetings[0];
      const targetDay = firstMeeting.day;
      const dayOffsetMap: Record<DayOfWeek, number> = {
        Saturday: 0,
        Sunday: 1,
        Monday: 2,
        Tuesday: 3,
        Wednesday: 4,
        Thursday: 5,
        Friday: 6,
      };
      const sat = getSaturdayOfWeek(selectedDate);
      const newDate = new Date(
        sat.getFullYear(),
        sat.getMonth(),
        sat.getDate() + (dayOffsetMap[targetDay] ?? 0)
      );
      setSelectedDate(newDate);

      const summary = meetings
        .map((m) => `${m.day.slice(0, 3)} ${m.startTime}`)
        .join(", ");
      toast.success(`Saved custom schedule for ${courseCode} (${summary})`);
    }
  };

  const handleResetCourseSchedule = (courseCode: string) => {
    if (onResetCourseSchedule) {
      onResetCourseSchedule(courseCode);
    }
    setSelectedClass(null);
    toast.info(`Reverted ${courseCode} to official routine`);
  };

  const handleResetOverride = (classId: string) => {
    if (onResetOverride) {
      onResetOverride(classId);
    }
    setSelectedClass(null);
    toast.info("Reverted class to official routine");
  };

  // Google Calendar-Style View Switcher
  const viewSwitcher = (
    <div className="shrink-0">
      {/* Desktop & Tablet: Clean Segmented Tab Control with Fluid Spring Animation */}
      <div className="hidden sm:inline-flex items-center p-0.5 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl shadow-2xs">
        {(
          [
            { id: "agenda", label: "Agenda" },
            { id: "day", label: "Day" },
            { id: "three-day", label: "3 Days" },
            { id: "week", label: "Week" },
          ] as const
        ).map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setViewMode(tab.id);
                if (tab.id === "three-day") {
                  setSelectedDate(getDhakaNow());
                }
              }}
              className={`relative px-3 py-1 text-xs font-sans rounded-lg transition-colors cursor-pointer select-none ${
                isActive
                  ? "text-[var(--ink-primary)] font-semibold"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] font-medium"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeViewTabPill"
                  className="absolute inset-0 rounded-lg bg-[var(--surface-card)] shadow-xs z-0"
                  transition={TRANSITIONS.spring}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile: Clean View Mode Dropdown Selector */}
      <div className="sm:hidden shrink-0">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="h-7.5 sm:h-8 px-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[var(--brand-border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-muted)] text-xs font-sans font-medium text-[var(--ink-primary)] flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <span>
                {viewMode === "agenda"
                  ? "Agenda"
                  : viewMode === "day"
                  ? "Day"
                  : viewMode === "three-day"
                  ? "3 Days"
                  : "Week"}
              </span>
              <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-44 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl shadow-xl p-1 space-y-0.5 text-[var(--ink-primary)] animate-in fade-in zoom-in-95 duration-100"
            >
              {(
                [
                  { id: "agenda", label: "Agenda View" },
                  { id: "day", label: "Day Grid" },
                  { id: "three-day", label: "3-Day Grid" },
                  { id: "week", label: "Week Grid" },
                ] as const
              ).map((item) => (
                <DropdownMenu.Item
                  key={item.id}
                  onSelect={() => {
                    setViewMode(item.id);
                    if (item.id === "three-day") setSelectedDate(getDhakaNow());
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-sans flex items-center justify-between cursor-pointer outline-hidden select-none transition-colors ${
                    viewMode === item.id
                      ? "bg-[var(--surface-elevated)] font-semibold text-[var(--ink-primary)]"
                      : "hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)]"
                  }`}
                >
                  <span>{item.label}</span>
                  {viewMode === item.id && (
                    <CheckIcon className="w-3.5 h-3.5 text-[var(--ink-primary)] shrink-0" />
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Small Cohesive Timetable Hero Section */}
      <TimetableHero
        cohort={
          cohortBreakdown || {
            baseLabel: cohortLabel || "Class Timetable",
            mode: "batch-section",
            retakeCount: 0,
            othersCount: 0,
            customCount: 0,
            conflictCount: 0,
            totalCoursesCount: items ? new Set(items.map((i) => i.courseCode)).size : 0,
            classesPerWeek: items?.length || 0,
          }
        }
        items={items}
        onOpenSetup={onOpenSetup}
        viewMode={viewMode}
        selectedDate={selectedDate}
        isCurrentWeek={isCurrentWindow}
        onReturnToCurrentWeek={handleToday}
        viewSwitcher={viewSwitcher}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      {/* Render Selected View with Silky Smooth Cross-fade Animation */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={TRANSITIONS.snappy}
        >
          {viewMode === "agenda" && (
            <DayAgendaView
              items={items}
              selectedDate={selectedDate}
              onSelectClass={setSelectedClass}
              initialDay={selectedDayName}
              onSelectDay={(day) => {
                const dayOffsetMap: Record<DayOfWeek, number> = {
                  Saturday: 0,
                  Sunday: 1,
                  Monday: 2,
                  Tuesday: 3,
                  Wednesday: 4,
                  Thursday: 5,
                  Friday: 6,
                };
                const sat = getSaturdayOfWeek(selectedDate);
                const newDate = new Date(
                  sat.getFullYear(),
                  sat.getMonth(),
                  sat.getDate() + (dayOffsetMap[day] ?? 0)
                );
                setSelectedDate(newDate);
              }}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onToday={handleToday}
              isCurrentWeek={isCurrentWindow}
            />
          )}

          {viewMode === "day" && (
            <DayTimeGridView
              items={items}
              selectedDate={selectedDate}
              onSelectClass={setSelectedClass}
              onNavigateDate={(date) => setSelectedDate(date)}
            />
          )}

          {viewMode === "three-day" && (
            <ThreeDayGridView
              items={items}
              selectedDate={selectedDate}
              onSelectClass={setSelectedClass}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setViewMode("day");
              }}
            />
          )}

          {viewMode === "week" && (
            <WeekGridView
              items={items}
              selectedDate={selectedDate}
              onSelectClass={setSelectedClass}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setViewMode("day");
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Class Inspector Modal */}
      {selectedClass && (
        <ClassDetailModal
          item={selectedClass}
          allItems={items}
          onClose={() => setSelectedClass(null)}
          onSaveOverride={handleSaveOverride}
          onResetOverride={handleResetOverride}
          onSaveCourseSchedule={handleSaveCourseSchedule}
          onResetCourseSchedule={handleResetCourseSchedule}
        />
      )}
    </div>
  );
}
