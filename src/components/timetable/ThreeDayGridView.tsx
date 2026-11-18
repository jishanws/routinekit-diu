"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ScheduleItem } from "@/types/routine";
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  PIXELS_PER_HOUR,
  PIXELS_PER_MINUTE,
  formatHourLabel12,
  getDhakaNow,
  getThreeDays,
  layoutDayEvents,
} from "@/lib/routine/calendarLayout";
import CalendarEventBlock from "./CalendarEventBlock";
import { CoffeeIcon } from "@/components/ui/Icons";

interface ThreeDayGridViewProps {
  items: ScheduleItem[];
  selectedDate: Date;
  onSelectClass: (item: ScheduleItem) => void;
  onSelectDate?: (date: Date) => void;
}

export default function ThreeDayGridView({
  items,
  selectedDate,
  onSelectClass,
  onSelectDate,
}: ThreeDayGridViewProps) {
  // Live updating current time in Asia/Dhaka
  const [currentTime, setCurrentTime] = useState<Date>(() => getDhakaNow());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getDhakaNow());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const todayDhaka = useMemo(() => currentTime, [currentTime]);
  const currentMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  // 3 consecutive calendar days starting from selectedDate (defaults to today)
  const threeDays = useMemo(() => {
    return getThreeDays(selectedDate, todayDhaka);
  }, [selectedDate, todayDhaka]);

  // Determine active time bounds across the 3 days
  const { startHour, endHour, totalHours } = useMemo(() => {
    const relevantDays = new Set(threeDays.map((d) => d.dayOfWeek));
    const threeDayItems = items.filter((i) => relevantDays.has(i.day));

    if (threeDayItems.length === 0) {
      return {
        startHour: GRID_START_HOUR,
        endHour: GRID_END_HOUR,
        totalHours: GRID_END_HOUR - GRID_START_HOUR,
      };
    }

    let minH = GRID_START_HOUR;
    let maxH = GRID_END_HOUR;

    for (const item of threeDayItems) {
      const [sh] = item.startTime.split(":").map(Number);
      const [eh, em] = item.endTime.split(":").map(Number);
      const endCeil = em > 0 ? eh + 1 : eh;

      if (!isNaN(sh) && sh < minH) minH = Math.max(7, sh);
      if (!isNaN(endCeil) && endCeil > maxH) maxH = Math.min(21, endCeil);
    }

    return {
      startHour: minH,
      endHour: maxH,
      totalHours: maxH - minH,
    };
  }, [items, threeDays]);

  const gridHeight = totalHours * PIXELS_PER_HOUR;

  const hourSlots = useMemo(() => {
    const slots: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      slots.push(h);
    }
    return slots;
  }, [startHour, endHour]);

  // Current time position relative to grid
  const currentTimeTop = useMemo(() => {
    const startMin = startHour * 60;
    const endMin = endHour * 60;
    if (currentMinutes < startMin || currentMinutes > endMin) return null;
    return (currentMinutes - startMin) * PIXELS_PER_MINUTE;
  }, [currentMinutes, startHour, endHour]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl shadow-xs overflow-hidden">
      {/* Scrollable Container (Smooth horizontal scroll on very narrow screens, sticky time column) */}
      <div className="relative overflow-x-auto overscroll-x-contain pb-3 scroll-smooth">
        <div className="min-w-[360px] sm:min-w-full">
          
          {/* Header Row: 3 Day Columns (Google Calendar Layout: Day Name on top, Date Circle below) */}
          <div className="flex bg-[var(--surface-card)] z-20">
            {/* Corner time header spacer */}
            <div
              className="w-14 sm:w-20 shrink-0 border-r border-[var(--surface-border)] px-2 py-3 sticky left-0 bg-[var(--surface-card)] z-30 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]"
              aria-hidden="true"
            />

            {/* 3 Day Headers (border-b applied to days, not crossing into time ruler) */}
            {threeDays.map((dayMeta) => {
              const isFriday = dayMeta.dayOfWeek === "Friday";
              const dayClassesCount = items.filter((i) => i.day === dayMeta.dayOfWeek).length;

              return (
                <button
                  key={`${dayMeta.dayOfWeek}-${dayMeta.date.toISOString()}`}
                  type="button"
                  onClick={() => onSelectDate?.(dayMeta.date)}
                  title={`Open ${dayMeta.dayOfWeek} (${dayMeta.monthShort} ${dayMeta.dateNumber}) in Day view`}
                  className={`flex-1 min-w-[100px] sm:min-w-[120px] py-2 sm:py-2.5 px-2 text-center border-b border-r last:border-r-0 border-[var(--surface-border)] transition-all cursor-pointer group hover:bg-[var(--surface-elevated)] ${
                    dayMeta.isToday ? "bg-[var(--surface-elevated)]/60" : ""
                  }`}
                >
                  {/* 1. Day of Week on Top */}
                  <div className={`text-[11px] font-sans uppercase tracking-wider transition-colors ${
                    dayMeta.isToday
                      ? "text-[var(--ink-primary)] font-semibold"
                      : "text-[var(--ink-muted)] font-medium group-hover:text-[var(--ink-primary)]"
                  }`}>
                    {dayMeta.dayOfWeek.slice(0, 3)}
                  </div>

                  {/* 2. Date number circle */}
                  <div className="mt-1 flex items-center justify-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-sans transition-all group-hover:scale-105 ${
                        dayMeta.isToday
                          ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                          : "text-[var(--ink-primary)] font-medium group-hover:bg-[var(--surface-card)]"
                      }`}
                    >
                      {dayMeta.dateNumber}
                    </span>
                  </div>

                  {/* 3. Class count / Holiday label */}
                  <div className="text-[10px] font-sans text-[var(--ink-muted)] mt-0.5">
                    {isFriday && dayClassesCount === 0
                      ? "Holiday"
                      : dayClassesCount > 0
                      ? `${dayClassesCount} ${dayClassesCount === 1 ? "class" : "classes"}`
                      : "No classes"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Body Area: Time Ruler & 3 Columns Grid */}
          <div className="flex relative" style={{ height: `${gridHeight}px` }}>
            
            {/* Sticky Time Ruler Column (Google Calendar font-sans style) */}
            <div
              className="w-14 sm:w-20 shrink-0 border-r border-[var(--surface-border)] select-none bg-[var(--surface-card)] sticky left-0 z-30 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]"
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

            {/* 3 Day Columns */}
            {threeDays.map((dayMeta) => {
              const isFriday = dayMeta.dayOfWeek === "Friday";
              const dayClasses = items.filter((i) => i.day === dayMeta.dayOfWeek);
              const positioned = layoutDayEvents(dayClasses, startHour, PIXELS_PER_MINUTE);

              return (
                <div
                  key={`${dayMeta.dayOfWeek}-${dayMeta.date.toISOString()}`}
                  className={`flex-1 min-w-[100px] sm:min-w-[120px] relative border-r last:border-r-0 border-[var(--surface-border-subtle)] ${
                    dayMeta.isToday ? "bg-[var(--brand-surface)]/20" : "bg-[var(--surface-ground)]/30"
                  }`}
                  style={{ height: `${gridHeight}px` }}
                >
                  {/* Horizontal Hour Lines (skip idx 0 as header border-b defines the top) */}
                  {hourSlots.map((hour, idx) => {
                    if (idx === 0) return null;
                    const top = idx * PIXELS_PER_HOUR;
                    return (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-[var(--surface-border-subtle)]"
                        style={{ top: `${top}px` }}
                      >
                        {idx < hourSlots.length - 1 && (
                          <div
                            className="absolute left-0 right-0 border-t border-[var(--surface-border-subtle)]/30 border-dashed"
                            style={{ top: `${PIXELS_PER_HOUR / 2}px` }}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Friday Holiday Placeholder if no classes */}
                  {isFriday && dayClasses.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none opacity-40">
                      <CoffeeIcon className="w-6 h-6 text-[var(--ink-muted)] mb-1" />
                      <span className="text-xs font-sans font-medium text-[var(--ink-muted)]">
                        Friday Holiday
                      </span>
                    </div>
                  )}

                  {/* Class Blocks */}
                  {positioned.map((event) => {
                    const [eh, em] = event.item.endTime.split(":").map(Number);
                    const endMin = eh * 60 + (em || 0);
                    const [sh, sm] = event.item.startTime.split(":").map(Number);
                    const startMin = sh * 60 + (sm || 0);

                    const dayDateStr = `${dayMeta.date.getFullYear()}-${String(dayMeta.date.getMonth() + 1).padStart(2, "0")}-${String(dayMeta.date.getDate()).padStart(2, "0")}`;
                    const todayDateStr = `${todayDhaka.getFullYear()}-${String(todayDhaka.getMonth() + 1).padStart(2, "0")}-${String(todayDhaka.getDate()).padStart(2, "0")}`;
                    const isPastDay = dayDateStr < todayDateStr;

                    const isPast = isPastDay || (dayMeta.isToday && endMin <= currentMinutes);
                    const isCurrent = dayMeta.isToday && startMin <= currentMinutes && currentMinutes < endMin;

                    return (
                      <CalendarEventBlock
                        key={event.item.id}
                        event={event}
                        onSelectClass={onSelectClass}
                        compact={false}
                        isPast={isPast}
                        isCurrent={isCurrent}
                      />
                    );
                  })}

                  {/* Current Time Indicator on Today's Column (Asia/Dhaka) */}
                  {dayMeta.isToday && currentTimeTop !== null && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                      style={{ top: `${currentTimeTop}px` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-accent)] ring-2 ring-[var(--surface-card)] shadow-xs -ml-1 animate-pulse" />
                      <div className="flex-1 border-t-2 border-[var(--brand-accent)]" />
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
