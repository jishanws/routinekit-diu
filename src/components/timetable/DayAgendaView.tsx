"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScheduleItem, DayOfWeek } from "@/types/routine";
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CoffeeIcon,
  MapPinIcon,
  UserIcon,
} from "@/components/ui/Icons";
import {
  timeToMinutes,
  formatMinutesToTime,
  formatMinutesToTime12,
  formatTimeSlot12,
  getDhakaNow,
  getSaturdayOfWeek,
  getWeekDays,
  formatAcademicWeekRange,
} from "@/lib/routine/calendarLayout";
import { formatBatchSectionBadge } from "@/lib/routine/schedule";

const DAYS_ORDER: DayOfWeek[] = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

function getSessionDuration(startTime: string, endTime: string): string {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (diff <= 0) return "";
  if (diff >= 60) {
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${diff}m`;
}

function formatMinutesDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function parseBuildingCode(room?: string): { building: string; roomNum: string; label: string } | null {
  if (!room || room === "TBA" || room.toLowerCase().includes("tba")) return null;
  const parts = room.split("-");
  if (parts.length >= 2) {
    const b = parts[0].trim().toUpperCase();
    const r = parts.slice(1).join("-").trim();
    let label = b;
    if (b === "KT") label = "Knowledge Tower";
    else if (b === "ANX1") label = "Annex 1";
    else if (b === "ANX2") label = "Annex 2";
    else if (b === "ANX") label = "Annex Building";
    else if (b === "G1") label = "Green Garden 1";
    else if (b === "G2") label = "Green Garden 2";
    else if (b === "DT") label = "Digital Tower";
    else if (b === "AB1") label = "Academic 1";
    else if (b === "AB2") label = "Academic 2";
    return { building: b, roomNum: r, label };
  }
  return { building: room, roomNum: "", label: room };
}

export function getTransitGuidance(fromRoom?: string, toRoom?: string): string | null {
  if (!fromRoom || !toRoom || fromRoom === "TBA" || toRoom === "TBA") return null;
  const r1 = fromRoom.trim().toUpperCase();
  const r2 = toRoom.trim().toUpperCase();
  if (r1 === r2) {
    return `Same room (${fromRoom})`;
  }
  const b1 = parseBuildingCode(fromRoom);
  const b2 = parseBuildingCode(toRoom);
  if (b1 && b2) {
    if (b1.building === b2.building) {
      return `Stay in ${b1.label} · Room ${toRoom}`;
    }
    return `Transit: ${b1.building} → ${b2.building}`;
  }
  return `Move to ${toRoom}`;
}

interface TimelineClassItem {
  item: ScheduleItem;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  isPast: boolean;
  isCurrent: boolean;
  isNext: boolean;
  hasConflict: boolean;
}

interface TimelineClassGroupItem {
  type: "class-group";
  id: string;
  classes: TimelineClassItem[];
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  isOverlapping: boolean;
}

interface TimelineBreakItem {
  type: "break";
  id: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  label: string;
  isPast: boolean;
  hasCurrentTime: boolean;
  currentTimeMinutes: number | null;
  currentTimeProgressPercent: number;
  fromRoom?: string;
  toRoom?: string;
  transitHint?: string | null;
}

type TimelineItem = TimelineClassGroupItem | TimelineBreakItem;

interface DayAgendaViewProps {
  items: ScheduleItem[];
  onSelectClass: (item: ScheduleItem) => void;
  selectedDate?: Date;
  initialDay?: DayOfWeek;
  onSelectDay?: (day: DayOfWeek) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onToday?: () => void;
  isCurrentWeek?: boolean;
}

export default function DayAgendaView({
  items,
  onSelectClass,
  selectedDate,
  initialDay,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  isCurrentWeek,
}: DayAgendaViewProps) {
  // Real current day in Asia/Dhaka
  const realCurrentDayName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Dhaka",
    }).format(new Date()) as DayOfWeek;
  }, []);

  const currentDayName = DAYS_ORDER.includes(realCurrentDayName) ? realCurrentDayName : "Saturday";

  const [internalDay, setInternalDay] = useState<DayOfWeek>(() => initialDay || currentDayName);
  const activeDay = initialDay !== undefined ? initialDay : internalDay;

  const handleDayChange = (day: DayOfWeek) => {
    if (initialDay === undefined) {
      setInternalDay(day);
    }
    if (onSelectDay) {
      onSelectDay(day);
    }
  };

  // Mobile horizontal swipe gestures between academic days (Rule rerender-use-ref-transient-values)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Only switch days if horizontal swipe delta is significant and horizontal > vertical
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      const currentIndex = DAYS_ORDER.indexOf(activeDay);
      if (deltaX < 0 && currentIndex < DAYS_ORDER.length - 1) {
        // Swiped left -> next day
        const nextDay = DAYS_ORDER[currentIndex + 1];
        handleDayChange(nextDay);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swiped right -> previous day
        const prevDay = DAYS_ORDER[currentIndex - 1];
        handleDayChange(prevDay);
      }
    }
  };

  // Precompute class counts per day for O(1) tab badge lookups
  const classCountByDay = useMemo(() => {
    const map = new Map<DayOfWeek, number>();
    for (const d of DAYS_ORDER) map.set(d, 0);
    for (const item of items) {
      const prev = map.get(item.day) || 0;
      map.set(item.day, prev + 1);
    }
    return map;
  }, [items]);

  // Academic week days (Saturday - Thursday) with real dates
  const weekDays = useMemo(() => {
    const today = getDhakaNow();
    const refDate = selectedDate || today;
    const sat = getSaturdayOfWeek(refDate);
    return getWeekDays(sat, today);
  }, [selectedDate]);

  // Previous and next week range labels for tooltips and accessible labels
  const { prevWeekLabel, nextWeekLabel } = useMemo(() => {
    const today = getDhakaNow();
    const refDate = selectedDate || today;
    const sat = getSaturdayOfWeek(refDate);

    const prevSat = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() - 7);
    const nextSat = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 7);

    return {
      prevWeekLabel: formatAcademicWeekRange(prevSat),
      nextWeekLabel: formatAcademicWeekRange(nextSat),
    };
  }, [selectedDate]);

  // Current time in Asia/Dhaka with 30s interval: only triggers re-render when minute actually changes
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = getDhakaNow();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getDhakaNow();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      setNowMinutes((prev) => (prev !== currentMin ? currentMin : prev));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const isToday = useMemo(() => {
    const activeMeta = weekDays.find((d) => d.dayOfWeek === activeDay);
    return Boolean(activeMeta?.isToday);
  }, [weekDays, activeDay]);

  // Day classes sorted chronologically
  const dayItems = useMemo(() => {
    return items
      .filter((i) => i.day === activeDay)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [items, activeDay]);

  // Upcoming/next class today
  const nextClassToday = useMemo(() => {
    if (!isToday || nowMinutes === null) return null;
    const nowTimeStr = formatMinutesToTime(nowMinutes);
    return dayItems.find((c) => c.endTime > nowTimeStr) || null;
  }, [dayItems, isToday, nowMinutes]);

  // Build timeline items with capped hatched break blocks and clustered overlaps
  const timelineItems = useMemo((): TimelineItem[] => {
    if (dayItems.length === 0) return [];

    const activeMeta = weekDays.find((d) => d.dayOfWeek === activeDay);
    const todayDhaka = getDhakaNow();
    const todayMidnight = new Date(todayDhaka.getFullYear(), todayDhaka.getMonth(), todayDhaka.getDate()).getTime();
    const activeDateMidnight = activeMeta
      ? new Date(activeMeta.date.getFullYear(), activeMeta.date.getMonth(), activeMeta.date.getDate()).getTime()
      : 0;
    const isPastDay = activeDateMidnight < todayMidnight;

    const sorted = [...dayItems].sort((a, b) => {
      const startA = timeToMinutes(a.startTime);
      const startB = timeToMinutes(b.startTime);
      if (startA !== startB) return startA - startB;
      const durA = timeToMinutes(a.endTime) - startA;
      const durB = timeToMinutes(b.endTime) - startB;
      return durB - durA;
    });

    type RawCluster = {
      items: ScheduleItem[];
      startMin: number;
      endMin: number;
    };

    const clusters: RawCluster[] = [];
    let curItems: ScheduleItem[] = [];
    let curClusterStart = 0;
    let curClusterEnd = -1;

    for (const item of sorted) {
      const start = timeToMinutes(item.startTime);
      const end = timeToMinutes(item.endTime);

      if (curItems.length === 0 || start < curClusterEnd) {
        if (curItems.length === 0) {
          curClusterStart = start;
        }
        curItems.push(item);
        curClusterEnd = Math.max(curClusterEnd, end);
      } else {
        clusters.push({
          items: curItems,
          startMin: curClusterStart,
          endMin: curClusterEnd,
        });
        curItems = [item];
        curClusterStart = start;
        curClusterEnd = end;
      }
    }
    if (curItems.length > 0) {
      clusters.push({
        items: curItems,
        startMin: curClusterStart,
        endMin: curClusterEnd,
      });
    }

    const result: TimelineItem[] = [];
    let maxEndMinutes = 0;

    for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
      const cluster = clusters[cIdx];
      const startM = cluster.startMin;
      const endM = cluster.endMin;
      const clusterDurM = Math.max(15, endM - startM);
      const nextGroupId = `group-${cluster.items.map((i) => i.id).join("-")}`;

      // Free time gap between consecutive clusters
      if (cIdx > 0 && startM > maxEndMinutes) {
        const gapM = startM - maxEndMinutes;
        const startTimeStr = formatMinutesToTime(maxEndMinutes);
        const endTimeStr = formatMinutesToTime(startM);
        const durationLabel = getSessionDuration(startTimeStr, endTimeStr);

        const prevCluster = clusters[cIdx - 1];
        const prevItem = prevCluster?.items[prevCluster.items.length - 1];
        const nextItem = cluster?.items[0];
        const fromRoom = prevItem?.room;
        const toRoom = nextItem?.room;
        const transitHint = getTransitGuidance(fromRoom, toRoom);

        const hasNow =
          isToday &&
          nowMinutes !== null &&
          nowMinutes >= maxEndMinutes &&
          nowMinutes < startM;

        const progressPercent = hasNow
          ? Math.min(100, Math.max(0, ((nowMinutes! - maxEndMinutes) / gapM) * 100))
          : 0;

        const isBreakPast = isPastDay || (isToday && nowMinutes !== null && startM <= nowMinutes);

        result.push({
          type: "break",
          id: `break-${maxEndMinutes}-${startM}`,
          startMinutes: maxEndMinutes,
          endMinutes: startM,
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationMinutes: gapM,
          label: gapM >= 120 ? `Free time · ${durationLabel}` : `Break · ${durationLabel}`,
          fromRoom,
          toRoom,
          transitHint,
          isPast: isBreakPast,
          hasCurrentTime: hasNow,
          currentTimeMinutes: nowMinutes,
          currentTimeProgressPercent: progressPercent,
        });
      }

      const classItems: TimelineClassItem[] = cluster.items.map((item) => {
        const itemStart = timeToMinutes(item.startTime);
        const itemEnd = timeToMinutes(item.endTime);
        const itemDur = Math.max(15, itemEnd - itemStart);
        const hasConflict = !!(
          (item.conflictsWith && item.conflictsWith.length > 0) ||
          cluster.items.length > 1
        );
        const isCurrent =
          isToday && nowMinutes !== null && nowMinutes >= itemStart && nowMinutes < itemEnd;
        const isNext = isToday && nextClassToday?.id === item.id;
        const isClassPast = isPastDay || (isToday && nowMinutes !== null && itemEnd <= nowMinutes);

        return {
          item,
          startMinutes: itemStart,
          endMinutes: itemEnd,
          durationMinutes: itemDur,
          isPast: isClassPast,
          isCurrent,
          isNext,
          hasConflict,
        };
      });

      result.push({
        type: "class-group",
        id: nextGroupId,
        classes: classItems,
        startMinutes: startM,
        endMinutes: endM,
        durationMinutes: clusterDurM,
        isOverlapping: cluster.items.length > 1,
      });

      maxEndMinutes = Math.max(maxEndMinutes, endM);
    }

    return result;
  }, [dayItems, activeDay, isToday, nowMinutes, nextClassToday, weekDays]);

  const { firstClassStart, lastClassEnd } = useMemo(() => {
    if (dayItems.length === 0) return { firstClassStart: 0, lastClassEnd: 0 };
    return {
      firstClassStart: timeToMinutes(dayItems[0].startTime),
      lastClassEnd: Math.max(...dayItems.map((i) => timeToMinutes(i.endTime))),
    };
  }, [dayItems]);

  const showBeforeClassesNow =
    isToday &&
    nowMinutes !== null &&
    dayItems.length > 0 &&
    nowMinutes < firstClassStart;

  const showAfterClassesNow =
    isToday &&
    nowMinutes !== null &&
    dayItems.length > 0 &&
    nowMinutes >= lastClassEnd;

  return (
    <div
      className="space-y-4 sm:space-y-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 7.1 The 6-Day Academic Strip with Integrated Week Navigation */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 w-full bg-[var(--surface-card)] p-1 sm:p-1.5 rounded-2xl border border-[var(--surface-border)] shadow-2xs">
        {/* Previous Week Stylish Button */}
        {onPrevWeek && (
          <button
            type="button"
            onClick={onPrevWeek}
            title={`Previous week (${prevWeekLabel})`}
            aria-label={`Previous week (${prevWeekLabel})`}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] border border-transparent hover:border-[var(--surface-border)] transition-all cursor-pointer group active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] outline-hidden self-center"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}

        {/* The 6-Day Academic Tabs (SAT - THU) */}
        <div
          role="tablist"
          aria-label="Academic Days of the Week"
          className="grid grid-cols-6 gap-1 sm:gap-1.5 flex-1 min-w-0"
        >
          {weekDays.map((dayMeta) => {
            const day = dayMeta.dayOfWeek;
            const count = classCountByDay.get(day) || 0;
            const isSelected = activeDay === day;
            const isTodayDay = dayMeta.isToday;
            const isOff = count === 0;

            return (
              <button
                key={day}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleDayChange(day)}
                title={`${dayMeta.dayOfWeek}, ${dayMeta.monthShort} ${dayMeta.dateNumber} (${count > 0 ? `${count} classes` : "Off"})`}
                aria-label={`${dayMeta.monthShort} ${dayMeta.dateNumber}, ${dayMeta.dayOfWeek} (${count > 0 ? `${count} classes` : "Off"})`}
                className={`relative py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl text-center cursor-pointer transition-all duration-150 outline-hidden select-none group flex-1 flex flex-col justify-center items-center active:scale-95 ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md ring-1 ring-black/5 dark:ring-white/15"
                    : isOff
                    ? "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]/60 opacity-60 hover:opacity-100"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]/70"
                }`}
              >
                {/* Inner Content Stack */}
                <div className="relative z-10 flex flex-col items-center justify-center py-0.5 sm:py-1 w-full">
                  {/* 1. Day Name (Top) */}
                  <span
                    className={`text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold leading-none transition-colors ${
                      isSelected
                        ? "text-white/80 dark:text-zinc-700"
                        : "text-[var(--ink-muted)] group-hover:text-[var(--ink-secondary)]"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </span>

                  {/* 2. Date Number (Middle) */}
                  <span
                    className={`text-sm sm:text-base font-mono font-bold tracking-tight leading-none mt-1 sm:mt-1.5 transition-colors ${
                      isSelected
                        ? "text-white dark:text-zinc-900"
                        : "text-[var(--ink-primary)]"
                    }`}
                  >
                    {dayMeta.dateNumber}
                  </span>

                  {/* 3. Dedicated Today Dot Container (Bottom, cleanly separated) */}
                  <div className="h-1.5 flex items-center justify-center mt-1">
                    {isTodayDay && (
                      <span
                        title="Today"
                        aria-label="Today"
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-white dark:bg-zinc-900 shadow-xs"
                            : "bg-[var(--brand-primary)]"
                        }`}
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Next Week Stylish Button */}
        {onNextWeek && (
          <button
            type="button"
            onClick={onNextWeek}
            title={`Next week (${nextWeekLabel})`}
            aria-label={`Next week (${nextWeekLabel})`}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] border border-transparent hover:border-[var(--surface-border)] transition-all cursor-pointer group active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] outline-hidden self-center"
          >
            <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Friday Weekend / Holiday Notice */}
      {isCurrentWeek !== false && realCurrentDayName === "Friday" && (
        <div className="py-2.5 px-4 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--ink-secondary)] shrink-0" />
            <span className="font-bold text-[var(--ink-primary)]">Friday · Weekly Holiday</span>
            <span className="text-[var(--ink-muted)] hidden sm:inline">
              — DIU has no scheduled classes on Friday. Showing Saturday routine.
            </span>
          </div>
          <span className="text-[10px] font-semibold text-[var(--ink-secondary)] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
            Weekend
          </span>
        </div>
      )}

      {/* Instant, smooth GPU-accelerated agenda view container */}
      <AnimatePresence initial={false}>
        <motion.div
          key={activeDay}
          initial={{ opacity: 0.88, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="space-y-3 sm:space-y-4"
        >
          {dayItems.length === 0 ? (
            <div className="py-16 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--surface-border)] shadow-card space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center mx-auto text-[var(--ink-muted)]">
                <ClockIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-serif text-[var(--ink-primary)]">
                  No Classes on {activeDay}
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto mt-1 leading-relaxed">
                  You have no scheduled sessions on this day in your timetable.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Connected Route Timeline Spine: Classes and Transit Break Waypoints */}
              <div className="pt-1">
                {/* Current Time Indicator: Before First Class (Today Only) */}
                {showBeforeClassesNow && nowMinutes !== null && (
                  <div className="relative flex items-stretch gap-2.5 sm:gap-4 group">
                    {/* Left Spine: Pulsing Current Node + Dotted Line Down to First Class */}
                    <div className="flex flex-col items-center shrink-0 w-5 sm:w-6">
                      <div className="mt-3.5 sm:mt-4 flex items-center justify-center shrink-0">
                        <div
                          title="Current Time"
                          className="relative z-10 w-4.5 h-4.5 rounded-full bg-slate-900 dark:bg-zinc-100 flex items-center justify-center shadow-xs"
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 dark:bg-zinc-100 opacity-60" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />
                        </div>
                      </div>
                      <div className="flex-1 w-px border-l-2 border-dotted border-[var(--surface-border)] my-1.5 transition-colors group-hover:border-[var(--ink-muted)]" />
                    </div>

                    {/* Right Content: Aligned with class cards */}
                    <div className="flex-1 min-w-0 pb-3 sm:pb-3.5">
                      <div className="p-3 sm:p-3.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-[var(--ink-primary)] shrink-0">
                            Now · {formatMinutesToTime12(nowMinutes)}
                          </span>
                          <span className="text-[var(--ink-faint)] select-none shrink-0">·</span>
                          <span className="font-sans text-[var(--ink-muted)] truncate">
                            First class starts at {formatTimeSlot12(dayItems[0].startTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {timelineItems.map((timelineItem, idx) => {
                  const isLast = idx === timelineItems.length - 1;

                  // 1. Break / Transit Waypoint
                  if (timelineItem.type === "break") {
                    const isPastBreak = timelineItem.isPast;

                    return (
                      <div
                        key={timelineItem.id}
                        className="relative flex items-stretch gap-2.5 sm:gap-4 group"
                      >
                        {/* Left Spine: Break Node + Dotted Connector */}
                        <div className="flex flex-col items-center shrink-0 w-5 sm:w-6">
                          <div className="mt-2.5 flex items-center justify-center shrink-0">
                            <div
                              title="Break"
                              className="relative z-10 w-5 h-5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--ink-muted)] shadow-2xs"
                            >
                              <CoffeeIcon className="w-2.5 h-2.5 text-[var(--ink-muted)]" />
                            </div>
                          </div>
                          {(!isLast || showAfterClassesNow) && (
                            <div className="flex-1 w-px border-l-2 border-dotted border-[var(--surface-border)] my-1.5 transition-colors group-hover:border-[var(--ink-muted)]" />
                          )}
                        </div>

                        {/* Right Content: Break Card */}
                        <div className="flex-1 min-w-0 pb-3 sm:pb-3.5">
                          <div
                            className={`p-2.5 sm:p-3 rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-ground)]/60 transition-all ${
                              isPastBreak ? "opacity-60" : "hover:border-[var(--brand-border)]"
                            }`}
                          >
                            <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                {timelineItem.hasCurrentTime && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-primary)] animate-pulse shrink-0" />
                                )}
                                <span className="font-mono text-xs text-[var(--ink-secondary)]">
                                  {formatMinutesDuration(timelineItem.durationMinutes)} Break
                                </span>
                              </div>

                              <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)] shrink-0">
                                {formatTimeSlot12(timelineItem.startTime)} – {formatTimeSlot12(timelineItem.endTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. Class Group Rendering: Overlapping vs Single
                  if (timelineItem.isOverlapping) {
                    return (
                      <div
                        key={timelineItem.id}
                        className="relative flex items-stretch gap-2.5 sm:gap-4 group"
                      >
                        {/* Left Spine: Overlap Station Node */}
                        <div className="flex flex-col items-center shrink-0 w-5 sm:w-6">
                          <div className="mt-3.5 sm:mt-4 flex items-center justify-center shrink-0">
                            <div
                              title="Time Slot Overlap"
                              className="relative z-10 w-4.5 h-4.5 rounded-full border-2 border-[var(--ink-secondary)] bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--ink-secondary)] shadow-xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-secondary)]" />
                            </div>
                          </div>
                          {(!isLast || showAfterClassesNow) && (
                            <div className="flex-1 w-px border-l-2 border-dotted border-[var(--surface-border)] my-1.5 transition-colors group-hover:border-[var(--ink-muted)]" />
                          )}
                        </div>

                        {/* Right Content: Conflict Banner + Cards */}
                        <div className="flex-1 min-w-0 pb-3 sm:pb-3.5 space-y-2.5">
                          <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] border border-dashed border-[var(--surface-border)] text-xs text-[var(--ink-secondary)] flex items-center justify-between gap-2 font-mono">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Time Slot Overlap: {formatTimeSlot12(formatMinutesToTime(timelineItem.startMinutes))} – {formatTimeSlot12(formatMinutesToTime(timelineItem.endMinutes))}
                              </span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90 hidden sm:inline">
                              Tap a card to inspect
                            </span>
                          </div>

                          <div
                            className={`grid grid-cols-1 ${
                              timelineItem.classes.length > 2 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
                            } gap-2.5 items-stretch`}
                          >
                            {timelineItem.classes.map((cls) => {
                              const classItem = cls.item;
                              const isRetake = classItem.isRetake;
                              const isPastClass = cls.isPast;

                              return (
                                <div
                                  key={classItem.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onSelectClass(classItem)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      onSelectClass(classItem);
                                    }
                                  }}
                                  className={`relative w-full bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl p-3 sm:p-3.5 cursor-pointer transition-all duration-150 shadow-2xs hover:shadow-card hover:border-[var(--brand-border)] active:scale-[0.99] group overflow-hidden ${
                                    isPastClass ? "opacity-75" : ""
                                  }`}
                                >
                                  {/* Header: Course Code, Badges, Teacher */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <h3 className="font-mono text-base font-bold tracking-tight text-[var(--ink-primary)]">
                                        {classItem.courseCode}
                                      </h3>
                                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border-subtle)] text-[var(--ink-secondary)]">
                                        {formatBatchSectionBadge(classItem)}
                                      </span>
                                      {isRetake && (
                                        <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                          RETAKE
                                        </span>
                                      )}
                                      {classItem.isCustom && (
                                        <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                          CUSTOM
                                        </span>
                                      )}
                                      <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                        CONFLICT
                                      </span>
                                    </div>

                                    {classItem.instructor && classItem.instructor !== "-" && (
                                      <div
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
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border-subtle)] hover:bg-[var(--surface-card)] hover:border-[var(--brand-border)] text-xs font-mono font-semibold text-[var(--ink-secondary)] max-w-[120px] sm:max-w-[160px] min-w-0 shrink cursor-pointer active:scale-95 transition-all select-none"
                                        title={`Faculty: ${classItem.instructor} (Profile coming soon)`}
                                      >
                                        <UserIcon className="w-3 h-3 text-[var(--ink-muted)] shrink-0" />
                                        <span className="truncate">{classItem.instructor}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Footer: Room + Time */}
                                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-[var(--surface-border-subtle)] flex-wrap text-xs font-mono">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] font-bold text-[var(--ink-primary)] shadow-2xs">
                                      <MapPinIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                      <span>{classItem.room || "Room TBA"}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[var(--ink-secondary)] tabular-nums font-medium">
                                      <ClockIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                      <span>{formatTimeSlot12(classItem.startTime)} – {formatTimeSlot12(classItem.endTime)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 3. Single Class Route Stop
                  const cls = timelineItem.classes[0];
                  const classItem = cls.item;
                  const isRetake = classItem.isRetake;
                  const isCurrent = cls.isCurrent;
                  const isPastClass = cls.isPast;

                  return (
                    <div
                      key={timelineItem.id}
                      className="relative flex items-stretch gap-2.5 sm:gap-4 group"
                    >
                      {/* Left Spine: Station Node + Dotted Track Connector */}
                      <div className="flex flex-col items-center shrink-0 w-5 sm:w-6">
                        <div className="mt-3.5 sm:mt-4 flex items-center justify-center shrink-0">
                          {isCurrent ? (
                            <div
                              title="Live Now"
                              className="relative z-10 w-4.5 h-4.5 rounded-full bg-slate-900 dark:bg-zinc-100 flex items-center justify-center shadow-xs"
                            >
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 dark:bg-zinc-100 opacity-60" />
                              <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />
                            </div>
                          ) : cls.isNext ? (
                            <div
                              title="Up Next"
                              className="relative z-10 w-4.5 h-4.5 rounded-full border-2 border-slate-900 dark:border-zinc-100 bg-[var(--surface-card)] flex items-center justify-center shadow-xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-zinc-100" />
                            </div>
                          ) : isPastClass ? (
                            <div
                              title="Completed Stop"
                              className="relative z-10 w-3.5 h-3.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] flex items-center justify-center"
                            >
                              <div className="w-1 h-1 rounded-full bg-[var(--ink-faint)]" />
                            </div>
                          ) : (
                            <div
                              title="Scheduled Stop"
                              className="relative z-10 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface-border)] bg-[var(--surface-card)] group-hover:border-[var(--ink-secondary)] transition-colors"
                            />
                          )}
                        </div>
                        {(!isLast || showAfterClassesNow) && (
                          <div className="flex-1 w-px border-l-2 border-dotted border-[var(--surface-border)] my-1.5 transition-colors group-hover:border-[var(--ink-muted)]" />
                        )}
                      </div>

                      {/* Right: The Route Stop Card (NO harsh left border!) */}
                      <div className="flex-1 min-w-0 pb-3 sm:pb-3.5">
                        <div
                          id={timelineItem.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectClass(classItem)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectClass(classItem);
                            }
                          }}
                          className={`relative w-full bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl p-3 sm:p-4.5 cursor-pointer transition-all duration-150 shadow-2xs hover:shadow-card hover:border-[var(--brand-border)] active:scale-[0.99] group overflow-hidden ${
                            isPastClass ? "opacity-75" : ""
                          }`}
                        >
                          {/* Dedicated Mobile Card Layout */}
                          <div className="block sm:hidden space-y-2.5">
                            {/* Row 1: Course Code, Badges, Instructor, Chevron */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <h3 className="font-mono text-base font-bold tracking-tight text-[var(--ink-primary)]">
                                  {classItem.courseCode}
                                </h3>
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border-subtle)] text-[var(--ink-secondary)]">
                                  {formatBatchSectionBadge(classItem)}
                                </span>
                                {isRetake && (
                                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                    RETAKE
                                  </span>
                                )}
                                {classItem.isCustom && (
                                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                    CUSTOM
                                  </span>
                                )}
                                {!isCurrent && cls.isNext && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--surface-elevated)] text-[var(--ink-primary)] border border-[var(--surface-border)]">
                                    UP NEXT
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {classItem.instructor && classItem.instructor !== "-" && (
                                  <div
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
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border-subtle)] hover:bg-[var(--surface-card)] hover:border-[var(--brand-border)] text-xs font-mono font-semibold text-[var(--ink-secondary)] max-w-[120px] sm:max-w-[160px] min-w-0 shrink cursor-pointer active:scale-95 transition-all select-none"
                                    title={`Faculty: ${classItem.instructor} (Profile coming soon)`}
                                  >
                                    <UserIcon className="w-3 h-3 text-[var(--ink-muted)] shrink-0" />
                                    <span className="truncate">{classItem.instructor}</span>
                                  </div>
                                )}
                                <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>

                            {/* Row 2: Location Waypoint & Time Meta */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--surface-border-subtle)] flex-wrap text-xs font-mono">
                              {/* High-Glance Room Pill */}
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] font-bold text-[var(--ink-primary)] shadow-2xs">
                                <MapPinIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                <span>{classItem.room || "Room TBA"}</span>
                              </div>

                              {/* Time & Duration */}
                              <div className="flex items-center gap-1.5 text-[var(--ink-secondary)] tabular-nums font-medium">
                                <ClockIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                <span>
                                  {formatTimeSlot12(classItem.startTime)} – {formatTimeSlot12(classItem.endTime)}
                                </span>
                                <span className="text-[var(--ink-faint)]">·</span>
                                <span className="text-[var(--ink-muted)] text-[11px]">
                                  {getSessionDuration(classItem.startTime, classItem.endTime)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dedicated Desktop Card Layout (3-Column Horizontal Flow) */}
                          <div className="hidden sm:flex sm:items-center justify-between gap-6">
                            {/* Column 1: Time & Room */}
                            <div className="sm:w-60 shrink-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                <span className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-[var(--ink-primary)]">
                                  {formatTimeSlot12(classItem.startTime)} – {formatTimeSlot12(classItem.endTime)}
                                </span>
                                {!isCurrent && cls.isNext && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--surface-elevated)] text-[var(--ink-primary)] border border-[var(--surface-border)]">
                                    UP NEXT
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs font-mono">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border)] font-bold text-[var(--ink-primary)]">
                                  <MapPinIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                  <span>{classItem.room || "Room TBA"}</span>
                                </div>
                                <span className="text-[var(--ink-faint)]">·</span>
                                <span className="text-[var(--ink-muted)]">
                                  {getSessionDuration(classItem.startTime, classItem.endTime)}
                                </span>
                              </div>
                            </div>

                            {/* Inset Divider (Desktop Only) */}
                            <div className="hidden sm:block w-px self-stretch my-0.5 shrink-0 bg-[var(--surface-border-subtle)]" />

                            {/* Column 2 (Desktop): Course Code & Name Hierarchy */}
                            <div className="hidden sm:block flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-mono text-base font-bold tracking-tight text-[var(--ink-primary)]">
                                  {classItem.courseCode}
                                </h3>
                                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border-subtle)] text-[var(--ink-secondary)]">
                                  {formatBatchSectionBadge(classItem)}
                                </span>
                                {isRetake && (
                                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                    RETAKE
                                  </span>
                                )}
                                {classItem.isCustom && (
                                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                                    CUSTOM
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Column 3 (Desktop): Teacher Badge & Action */}
                            <div className="hidden sm:flex items-center justify-end gap-3 shrink-0 self-center">
                              {classItem.instructor && classItem.instructor !== "-" && (
                                <div
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
                                  className="inline-flex items-center gap-1.5 max-w-[140px] sm:max-w-[180px] min-w-0 shrink px-3 py-1.5 rounded-xl border border-[var(--surface-border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] hover:border-[var(--brand-border)] text-xs font-mono font-semibold text-[var(--ink-primary)] shadow-2xs cursor-pointer active:scale-95 transition-all select-none"
                                  title={`Faculty: ${classItem.instructor} (Profile coming soon)`}
                                >
                                  <UserIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                  <span className="truncate">{classItem.instructor}</span>
                                </div>
                              )}
                              <div className="text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-transform group-hover:translate-x-0.5">
                                <ChevronRightIcon className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Current Time Indicator: After Last Class (Today Only) */}
                {showAfterClassesNow && nowMinutes !== null && (
                  <div className="relative flex items-stretch gap-2.5 sm:gap-4 group">
                    {/* Left Spine: Terminal Stop Node */}
                    <div className="flex flex-col items-center shrink-0 w-5 sm:w-6">
                      <div className="mt-3.5 sm:mt-4 flex items-center justify-center shrink-0">
                        <div
                          title="All classes finished"
                          className="relative z-10 w-3.5 h-3.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] flex items-center justify-center shadow-2xs"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ink-secondary)]" />
                        </div>
                      </div>
                    </div>

                    {/* Right Content: Perfectly aligned with class cards */}
                    <div className="flex-1 min-w-0 pb-3 sm:pb-3.5">
                      <div className="p-3 sm:p-3.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[var(--ink-secondary)] shrink-0" />
                          <span className="font-mono font-bold text-[var(--ink-primary)] shrink-0">
                            Now · {formatMinutesToTime12(nowMinutes)}
                          </span>
                          <span className="text-[var(--ink-faint)] select-none shrink-0">·</span>
                          <span className="font-sans text-[var(--ink-muted)] truncate">
                            All classes finished for today
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
