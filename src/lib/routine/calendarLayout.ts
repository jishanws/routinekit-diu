import { ScheduleItem, DayOfWeek } from "@/types/routine";

export const ALL_DAYS: DayOfWeek[] = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export const ACADEMIC_DAYS: DayOfWeek[] = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

export function sortClassesByDayAndTime<T extends { day: DayOfWeek; startTime: string }>(
  classes: T[]
): T[] {
  return [...classes].sort((a, b) => {
    const dayA = ALL_DAYS.indexOf(a.day);
    const dayB = ALL_DAYS.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return a.startTime.localeCompare(b.startTime);
  });
}


export const GRID_START_HOUR = 8; // 08:00
export const GRID_END_HOUR = 18; // 18:00
export const PIXELS_PER_HOUR = 68;
export const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60; // ~1.133px per min

export interface TimeValidationResult {
  valid: boolean;
  time24: string;
  time12: string;
  minutes: number;
  error?: string;
}

/**
 * Validates and parses time inputs from users, supporting:
 * - 24-hour: "08:30", "13:00", "14:30"
 * - 12-hour: "8:30 AM", "8:30 a.m.", "8:30am", "1:00 PM", "2:30pm"
 * - University afternoon inference: "1:00" -> 13:00, "2:30" -> 14:30
 * Strictly rejects invalid times like "8:80 a.m.", "25:00", "14:60", etc.
 */
export function parseTimeInput(raw: string): TimeValidationResult {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { valid: false, time24: "", time12: "", minutes: 0, error: "Time is required" };
  }
  const clean = raw.trim().toLowerCase().replace(/\./g, "");
  if (!clean) {
    return { valid: false, time24: "", time12: "", minutes: 0, error: "Time is required" };
  }

  const match = clean.match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})(?::\d{1,2})?(?:\s*([ap]m))?$/);
  if (!match) {
    return {
      valid: false,
      time24: "",
      time12: "",
      minutes: 0,
      error: "Invalid format (use e.g. 08:30 or 8:30 AM)",
    };
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3];

  if (isNaN(minute) || minute < 0 || minute > 59) {
    return {
      valid: false,
      time24: "",
      time12: "",
      minutes: 0,
      error: `Invalid minutes: ${minute} (must be 00–59)`,
    };
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return {
        valid: false,
        time24: "",
        time12: "",
        minutes: 0,
        error: `Invalid hour: ${hour} (must be 1–12 for 12-hour time)`,
      };
    }
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  } else {
    if (hour < 0 || hour > 23) {
      return {
        valid: false,
        time24: "",
        time12: "",
        minutes: 0,
        error: `Invalid hour: ${hour} (must be 00–23)`,
      };
    }
    // University daytime context: 1:00-6:00 without AM/PM is afternoon (13:00 - 18:00)
    if (hour >= 1 && hour <= 6) {
      hour += 12;
    }
  }

  const hStr = hour.toString().padStart(2, "0");
  const mStr = minute.toString().padStart(2, "0");
  const time24 = `${hStr}:${mStr}`;
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const time12 = `${h12}:${mStr} ${period}`;

  return {
    valid: true,
    time24,
    time12,
    minutes: hour * 60 + minute,
  };
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parsed = parseTimeInput(timeStr);
  if (parsed.valid) return parsed.minutes;
  const [h, m] = timeStr.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Formats minutes from midnight into 12-hour format ("10:35 AM", "1:00 PM").
 */
export function formatMinutesToTime12(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Formats a 24-hour time string ("13:00", "08:30") into standard 12-hour format ("1:00 PM", "8:30 AM").
 */
export function formatTimeSlot12(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Formats an hour integer (8, 13) into compact hour label ("8 AM", "1 PM").
 */
export function formatHourLabel12(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

export interface PositionedEvent {
  item: ScheduleItem;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
  laneIndex: number;
  totalLanes: number;
}

/**
 * Returns current Date object evaluated in Bangladesh (Asia/Dhaka) timezone.
 */
export function getDhakaNow(): Date {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(now);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  } catch {
    return new Date();
  }
}

/**
 * Returns the minutes since midnight for the current time in Asia/Dhaka.
 */
export function getDhakaCurrentMinutes(): number {
  const d = getDhakaNow();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Given any date, returns the Saturday (start of DIU academic week) for that week.
 */
export function getSaturdayOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jsDay = copy.getDay(); // 0 is Sun, 1 is Mon ... 6 is Sat
  const daysSinceSaturday = (jsDay + 1) % 7;
  copy.setDate(copy.getDate() - daysSinceSaturday);
  return copy;
}

/**
 * Maps a Date to DIU DayOfWeek. Returns real weekday including Friday.
 */
export function getDayOfWeekFromDate(d: Date): DayOfWeek {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d) as DayOfWeek;
  return ALL_DAYS.includes(name) ? name : "Saturday";
}

export interface CalendarDayMeta {
  dayOfWeek: DayOfWeek;
  date: Date;
  isToday: boolean;
  dateNumber: number;
  monthShort: string;
}

/**
 * Returns the 7 academic days (Saturday - Friday) starting from a given Saturday.
 */
export function getWeekDays(saturday: Date, todayDate: Date): CalendarDayMeta[] {
  return ACADEMIC_DAYS.map((dayName, idx) => {
    const date = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + idx);
    const isToday =
      date.getFullYear() === todayDate.getFullYear() &&
      date.getMonth() === todayDate.getMonth() &&
      date.getDate() === todayDate.getDate();

    return {
      dayOfWeek: dayName,
      date,
      isToday,
      dateNumber: date.getDate(),
      monthShort: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    };
  });
}

/**
 * Returns 3 consecutive calendar days starting from a given date.
 */
export function getThreeDays(startDate: Date, todayDate: Date): CalendarDayMeta[] {
  return [0, 1, 2].map((offset) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + offset);
    const dayOfWeek = getDayOfWeekFromDate(date);
    const isToday =
      date.getFullYear() === todayDate.getFullYear() &&
      date.getMonth() === todayDate.getMonth() &&
      date.getDate() === todayDate.getDate();

    return {
      dayOfWeek,
      date,
      isToday,
      dateNumber: date.getDate(),
      monthShort: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    };
  });
}

/**
 * Formats 3 consecutive calendar days into a readable range label,
 * e.g. "Oct 24 – 26, 2026" or "Oct 30 – Nov 1, 2026".
 */
export function formatThreeDayRange(startDate: Date): string {
  const day3 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 2);

  const m1 = new Intl.DateTimeFormat("en-US", { month: "short" }).format(startDate);
  const m3 = new Intl.DateTimeFormat("en-US", { month: "short" }).format(day3);

  if (startDate.getFullYear() !== day3.getFullYear()) {
    return `${m1} ${startDate.getDate()}, ${startDate.getFullYear()} – ${m3} ${day3.getDate()}, ${day3.getFullYear()}`;
  }
  if (m1 !== m3) {
    return `${m1} ${startDate.getDate()} – ${m3} ${day3.getDate()}, ${startDate.getFullYear()}`;
  }
  return `${m1} ${startDate.getDate()} – ${day3.getDate()}, ${startDate.getFullYear()}`;
}

/**
 * Formats the 6 academic days (Saturday to Thursday) into a readable range label,
 * e.g. "Oct 17 – 22, 2026" or "Oct 31 – Nov 5, 2026".
 */
export function formatAcademicWeekRange(referenceDate: Date): string {
  const sat = getSaturdayOfWeek(referenceDate);
  const thu = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 5);

  const satMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(sat);
  const thuMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(thu);

  if (sat.getFullYear() !== thu.getFullYear()) {
    return `${satMonth} ${sat.getDate()}, ${sat.getFullYear()} – ${thuMonth} ${thu.getDate()}, ${thu.getFullYear()}`;
  }
  if (satMonth !== thuMonth) {
    return `${satMonth} ${sat.getDate()} – ${thuMonth} ${thu.getDate()}, ${sat.getFullYear()}`;
  }
  return `${satMonth} ${sat.getDate()} – ${thu.getDate()}, ${sat.getFullYear()}`;
}

/**
 * Layouts day events into vertical lanes according to actual start/end times.
 * Employs interval graph coloring so overlapping classes sit in side-by-side lanes.
 */
export function layoutDayEvents(
  items: ScheduleItem[],
  gridStartHour: number = GRID_START_HOUR,
  pixelsPerMin: number = PIXELS_PER_MINUTE
): PositionedEvent[] {
  if (items.length === 0) return [];

  const gridStartMin = gridStartHour * 60;

  // Sort by start time ascending, then longer duration first
  const sorted = [...items].sort((a, b) => {
    const startA = timeToMinutes(a.startTime);
    const startB = timeToMinutes(b.startTime);
    if (startA !== startB) return startA - startB;
    const durA = timeToMinutes(a.endTime) - startA;
    const durB = timeToMinutes(b.endTime) - startB;
    return durB - durA;
  });

  // Cluster overlapping events together
  const clusters: ScheduleItem[][] = [];
  let currentCluster: ScheduleItem[] = [];
  let clusterEnd = -1;

  for (const item of sorted) {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);

    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedEvent[] = [];

  for (const cluster of clusters) {
    // Greedy lane assignment
    const laneEndTimes: number[] = [];
    const laneAssignments = new Map<string, number>();

    for (const item of cluster) {
      const start = timeToMinutes(item.startTime);
      const end = timeToMinutes(item.endTime);

      let chosenLane = -1;
      for (let l = 0; l < laneEndTimes.length; l++) {
        if (laneEndTimes[l] <= start) {
          chosenLane = l;
          laneEndTimes[l] = end;
          break;
        }
      }

      if (chosenLane === -1) {
        chosenLane = laneEndTimes.length;
        laneEndTimes.push(end);
      }

      laneAssignments.set(item.id, chosenLane);
    }

    const totalLanes = laneEndTimes.length;

    for (const item of cluster) {
      const start = timeToMinutes(item.startTime);
      const end = timeToMinutes(item.endTime);

      const top = Math.max(0, (start - gridStartMin) * pixelsPerMin);
      const rawHeight = (end - start) * pixelsPerMin;
      const height = Math.max(48, rawHeight);
      const laneIndex = laneAssignments.get(item.id) || 0;

      result.push({
        item,
        startMinutes: start,
        endMinutes: end,
        top,
        height,
        laneIndex,
        totalLanes,
      });
    }
  }

  return result;
}
