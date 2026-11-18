"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ScheduleItem, DayOfWeek } from "@/types/routine";
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  PIXELS_PER_HOUR,
  PIXELS_PER_MINUTE,
  formatMinutesToTime,
  formatMinutesToTime12,
  formatHourLabel12,
  getDhakaNow,
  getDayOfWeekFromDate,
  layoutDayEvents,
} from "@/lib/routine/calendarLayout";
import CalendarEventBlock from "./CalendarEventBlock";
import { ClockIcon, CoffeeIcon, ChevronRightIcon } from "@/components/ui/Icons";

interface DayTimeGridViewProps {
  items: ScheduleItem[];
  selectedDate: Date;
  onSelectClass: (item: ScheduleItem) => void;
  onNavigateDate?: (date: Date) => void;
}

function getSessionDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const totalMinutes = eh * 60 + (em || 0) - (sh * 60 + (sm || 0));
  if (totalMinutes <= 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

interface GridBreakItem {
  id: string;
  top: number;
  height: number;
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
  durationLabel: string;
}

export default function DayTimeGridView({
  items,
  selectedDate: rawSelectedDate,
  onSelectClass,
  onNavigateDate,
}: DayTimeGridViewProps) {
  const selectedDate = useMemo(() => {
    return rawSelectedDate instanceof Date && !isNaN(rawSelectedDate.getTime())
      ? rawSelectedDate
      : getDhakaNow();
  }, [rawSelectedDate]);

  // Day of week for the currently selected date
  const activeDay: DayOfWeek = useMemo(() => {
    return getDayOfWeekFromDate(selectedDate);
  }, [selectedDate]);

  const todayDhaka = useMemo(() => getDhakaNow(), []);
  const isToday = useMemo(() => {
    return (
      selectedDate.getFullYear() === todayDhaka.getFullYear() &&
      selectedDate.getMonth() === todayDhaka.getMonth() &&
      selectedDate.getDate() === todayDhaka.getDate()
    );
  }, [selectedDate, todayDhaka]);

  const isPastDay = useMemo(() => {
    const sDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const tDate = new Date(todayDhaka.getFullYear(), todayDhaka.getMonth(), todayDhaka.getDate());
    return sDate < tDate;
  }, [selectedDate, todayDhaka]);

  // Live updating current time in Asia/Dhaka
  const [currentTime, setCurrentTime] = useState<Date>(() => getDhakaNow());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getDhakaNow());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const currentMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  // Filter items for the active day
  const dayItems = useMemo(() => {
    return items.filter((i) => i.day === activeDay);
  }, [items, activeDay]);

  // Dynamic grid start/end hours to ensure no class is clipped
  const { startHour, endHour, totalHours } = useMemo(() => {
    let minH = GRID_START_HOUR;
    let maxH = GRID_END_HOUR;
    dayItems.forEach((item) => {
      const [sh] = item.startTime.split(":").map(Number);
      const [eh, em] = item.endTime.split(":").map(Number);
      if (sh < minH) minH = sh;
      const endCeil = (em || 0) > 0 ? eh + 1 : eh;
      if (endCeil > maxH) maxH = endCeil;
    });
    return {
      startHour: minH,
      endHour: maxH,
      totalHours: maxH - minH,
    };
  }, [dayItems]);

  const gridHeight = totalHours * PIXELS_PER_HOUR;

  // Layout events with interval graph coloring for side-by-side overlapping lanes
  const positionedEvents = useMemo(() => {
    return layoutDayEvents(dayItems, startHour, PIXELS_PER_MINUTE);
  }, [dayItems, startHour]);

  // Proportional break blocks between consecutive classes (threshold >= 15 mins)
  const breakItems = useMemo((): GridBreakItem[] => {
    if (dayItems.length < 2) return [];
    const sorted = [...dayItems].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const breaks: GridBreakItem[] = [];
    let maxEndMin = 0;

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const [sh, sm] = item.startTime.split(":").map(Number);
      const [eh, em] = item.endTime.split(":").map(Number);
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);

      if (i > 0 && startMin > maxEndMin) {
        const gapMin = startMin - maxEndMin;
        if (gapMin >= 15) {
          const top = (maxEndMin - startHour * 60) * PIXELS_PER_MINUTE;
          const height = gapMin * PIXELS_PER_MINUTE;
          const startTimeStr = formatMinutesToTime(maxEndMin);
          const endTimeStr = formatMinutesToTime(startMin);
          const durationLabel = getSessionDuration(startTimeStr, endTimeStr);

          breaks.push({
            id: `break-${maxEndMin}-${startMin}`,
            top,
            height,
            startMin: maxEndMin,
            endMin: startMin,
            startTime: startTimeStr,
            endTime: endTimeStr,
            durationLabel,
          });
        }
      }

      if (endMin > maxEndMin) {
        maxEndMin = endMin;
      }
    }

    return breaks;
  }, [dayItems, startHour]);

  // Current time line position (Dhaka local time)
  const currentTimeTop = useMemo(() => {
    if (!isToday) return null;
    const startMin = startHour * 60;
    const endMin = endHour * 60;
    if (currentMinutes < startMin || currentMinutes > endMin) return null;
    return (currentMinutes - startMin) * PIXELS_PER_MINUTE;
  }, [isToday, currentMinutes, startHour, endHour]);

  const hourSlots = useMemo(() => {
    const slots: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      slots.push(h);
    }
    return slots;
  }, [startHour, endHour]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl shadow-xs overflow-hidden">
      {/* Calendar Day Header */}
      <div className="flex bg-[var(--surface-card)] z-20">
        {/* Corner time header aligned with ruler */}
        <div className="w-14 sm:w-20 shrink-0 border-r border-[var(--surface-border)] px-2 py-3" aria-hidden="true" />

        {/* Day Header Canvas aligned with column */}
        <div className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-sm sm:text-base font-sans transition-all ${
                isToday
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                  : "text-[var(--ink-primary)] font-semibold bg-[var(--surface-elevated)] border border-[var(--surface-border)]"
              }`}
            >
              {selectedDate.getDate()}
            </span>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-sm sm:text-base text-[var(--ink-primary)] leading-tight">
                  {activeDay}
                </h3>
                {activeDay === "Friday" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                    Holiday
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ink-muted)] font-sans mt-0.5">
                {activeDay === "Friday"
                  ? "Weekly holiday · No classes scheduled"
                  : dayItems.length === 0
                  ? "No classes scheduled"
                  : `${dayItems.length} class${dayItems.length > 1 ? "es" : ""} scheduled`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeDay === "Friday" ? (
        <div className="py-16 px-6 text-center flex flex-col items-center justify-center bg-[var(--surface-card)]">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center mb-3 text-[var(--ink-secondary)]">
            <CoffeeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--ink-primary)]">Friday · Weekly Holiday</h3>
          <p className="text-xs text-[var(--ink-muted)] max-w-sm mt-1 leading-relaxed">
            No classes are scheduled on Friday. The academic week at DIU runs from Saturday to Thursday.
          </p>
          {onNavigateDate && (
            <button
              type="button"
              onClick={() => {
                const nextSat = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
                onNavigateDate(nextSat);
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>View Saturday Routine</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <div className="flex w-full" style={{ height: `${gridHeight}px` }}>
            
            {/* Vertical Time Ruler (Left) */}
            <div
              className="w-14 sm:w-20 shrink-0 border-r border-[var(--surface-border)] select-none bg-[var(--surface-card)] relative"
              style={{ height: `${gridHeight}px` }}
            >
              {hourSlots.map((hour, idx) => {
                const top = idx * PIXELS_PER_HOUR;
                return (
                  <div
                    key={hour}
                    className={`absolute right-2 text-[11px] font-sans text-[var(--ink-muted)] font-normal ${
                      idx === 0 ? "top-1" : "-translate-y-1/2"
                    }`}
                    style={idx === 0 ? undefined : { top: `${top}px` }}
                  >
                    {formatHourLabel12(hour)}
                  </div>
                );
              })}
            </div>

          {/* Single Day Column Canvas */}
          <div
            className="flex-1 relative bg-[var(--surface-ground)]/40 overflow-hidden"
            style={{ height: `${gridHeight}px` }}
          >
            {/* Horizontal Hour Grid Lines (skip idx 0 as header border-b defines top) */}
            {hourSlots.map((hour, idx) => {
              if (idx === 0) return null;
              const top = idx * PIXELS_PER_HOUR;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-[var(--surface-border-subtle)]"
                  style={{ top: `${top}px` }}
                >
                  {/* Half-hour subtle dashed guide */}
                  {idx < hourSlots.length - 1 && (
                    <div
                      className="absolute left-0 right-0 border-t border-[var(--surface-border-subtle)]/40 border-dashed"
                      style={{ top: `${PIXELS_PER_HOUR / 2}px` }}
                    />
                  )}
                </div>
              );
            })}

            {/* Empty Day State Indicator */}
            {dayItems.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-auto">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-card)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-muted)] mb-2 shadow-2xs">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-[var(--ink-primary)]">
                  Free Day on {activeDay}
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-xs mt-0.5 font-mono">
                  No classes scheduled in your routine for this day.
                </p>
              </div>
            )}

            {/* Proportional Break Blocks */}
            {breakItems.map((b) => {
              const isPastBreak = isPastDay || (isToday && b.endMin <= currentMinutes);
              return (
                <div
                  key={b.id}
                  style={{
                    top: `${b.top}px`,
                    height: `${b.height}px`,
                    left: "2px",
                    right: "2px",
                  }}
                  className={`absolute rounded-xl border border-[var(--surface-border)] hatched-break-pattern flex items-center justify-between px-3 sm:px-4 py-1 overflow-hidden pointer-events-none select-none z-5 ${
                    isPastBreak
                      ? "opacity-60 text-[var(--ink-muted)]"
                      : "text-[var(--ink-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <CoffeeIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">
                      Break · {b.durationLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums opacity-80">
                    {b.startTime} – {b.endTime}
                  </span>
                </div>
              );
            })}

            {/* Render Positioned Class Blocks */}
            {positionedEvents.map((event) => {
              const [eh, em] = event.item.endTime.split(":").map(Number);
              const [sh, sm] = event.item.startTime.split(":").map(Number);
              const endMin = eh * 60 + (em || 0);
              const startMin = sh * 60 + (sm || 0);
              const isPast = isPastDay || (isToday && endMin <= currentMinutes);
              const isCurrent = isToday && startMin <= currentMinutes && currentMinutes < endMin;

              return (
                <CalendarEventBlock
                  key={event.item.id}
                  event={event}
                  onSelectClass={onSelectClass}
                  isPast={isPast}
                  isCurrent={isCurrent}
                />
              );
            })}

            {/* Current Time Line (Asia/Dhaka time) */}
            {currentTimeTop !== null && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-0.5 rounded-r-md bg-[var(--brand-accent)] text-white text-[10px] font-mono font-bold shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>Now · {formatMinutesToTime12(currentMinutes)}</span>
                </div>
                <div className="flex-1 border-t-2 border-[var(--brand-accent)] shadow-xs" />
              </div>
            )}

          </div>
        </div>
      </div>
    )}
    </div>
  );
}
