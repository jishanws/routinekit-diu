"use client";

import React from "react";
import { ScheduleItem } from "@/types/routine";
import { PositionedEvent, formatTimeSlot12 } from "@/lib/routine/calendarLayout";
import { formatBatchSectionBadge } from "@/lib/routine/schedule";
import { MapPinIcon } from "@/components/ui/Icons";

interface CalendarEventBlockProps {
  event: PositionedEvent;
  onSelectClass: (item: ScheduleItem) => void;
  compact?: boolean;
  isPast?: boolean;
  isCurrent?: boolean;
  showTime?: boolean;
}

export default function CalendarEventBlock({
  event,
  onSelectClass,
  isPast = false,
  isCurrent = false,
  showTime = false,
}: CalendarEventBlockProps) {
  const { item, top, height, laneIndex, totalLanes } = event;
  const hasConflict = Boolean(item.conflictsWith && item.conflictsWith.length > 0);
  const isRetake = Boolean(item.isRetake);

  // Positioning calculations
  const leftPercent = (laneIndex / totalLanes) * 100;
  const widthPercent = 100 / totalLanes;

  const batchSecBadge = formatBatchSectionBadge(item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectClass(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectClass(item);
        }
      }}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${leftPercent}% + 1.5px)`,
        width: `calc(${widthPercent}% - 3px)`,
      }}
      title={`${item.courseCode} (${item.startTime} - ${item.endTime}) in ${item.room || "Room TBA"}${isPast ? " (Past)" : ""}`}
      className={`group absolute rounded-lg border text-left p-1.5 sm:p-2 transition-all duration-150 ease-out cursor-pointer overflow-hidden z-10 flex flex-col justify-start hover:z-20 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0 ${
        isCurrent
          ? "bg-[var(--surface-card)] ring-2 ring-[var(--status-live)] border-[var(--status-live)] shadow-xs"
          : isPast
          ? "bg-[var(--surface-elevated)]/60 border-[var(--surface-border-subtle)] opacity-75 text-[var(--ink-muted)]"
          : isRetake
          ? "bg-[var(--brand-surface)]/40 border-[var(--brand-border)]/70 hover:border-[var(--brand-border)]"
          : "bg-[var(--surface-card)] border-[var(--surface-border)] hover:border-[var(--brand-border)] shadow-2xs"
      }`}
    >
      {/* Main Event Content Container */}
      <div className="flex flex-col justify-between h-full min-w-0">
        <div>
          {/* Line 1: Course Title + Section */}
          <div className="flex items-center gap-1.5 leading-tight truncate">
            {/* Live Indicator Dot if ongoing */}
            {isCurrent && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-live)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-live)]" />
              </span>
            )}

            {/* Quiet Neutral Conflict Dot if overlapping */}
            {hasConflict && (
              <span
                title="Time slot overlap notice"
                className="w-1.5 h-1.5 rounded-full bg-[var(--ink-secondary)] shrink-0"
              />
            )}

            {/* Course Code */}
            <span
              className={`font-sans font-semibold text-xs sm:text-[13px] tracking-normal truncate ${
                isPast
                  ? "text-[var(--ink-muted)]"
                  : "text-[var(--ink-primary)]"
              }`}
            >
              {item.courseCode}
            </span>

            {/* Section Tag */}
            <span className="font-sans font-normal text-[11px] text-[var(--ink-muted)] truncate shrink-0">
              · {batchSecBadge}
            </span>

            {/* Discreet Retake / Custom marker */}
            {isRetake && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)] shrink-0">
                Retake
              </span>
            )}
            {item.isCustom && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)] shrink-0">
                Custom
              </span>
            )}
          </div>

          {/* Line 2: Room & Instructor */}
          {height >= 44 && (
            <div className="flex items-center gap-1 text-[11px] font-sans text-[var(--ink-secondary)] truncate mt-0.5">
              <MapPinIcon className="w-3 h-3 text-[var(--ink-muted)] shrink-0" />
              <span className="truncate">{item.room || "Room TBA"}</span>
              {item.instructor && item.instructor !== "-" && (
                <>
                  <span className="text-[var(--ink-faint)]">·</span>
                  <span className="truncate text-[var(--ink-muted)]">{item.instructor}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Optional Time Line (if showTime explicitly enabled) */}
        {showTime && (
          <div className="text-[10px] font-sans text-[var(--ink-muted)] tabular-nums truncate">
            {formatTimeSlot12(item.startTime)} – {formatTimeSlot12(item.endTime)}
          </div>
        )}
      </div>
    </div>
  );
}
