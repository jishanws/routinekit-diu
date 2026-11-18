import { ScheduleItem, PublishedRoutine, StudentSetup, DayOfWeek } from "@/types/routine";
import { formatBatchSectionBadge } from "@/lib/routine/schedule";

const DAY_MAP: Record<DayOfWeek, { byday: string; dayIndex: number }> = {
  Sunday: { byday: "SU", dayIndex: 0 },
  Monday: { byday: "MO", dayIndex: 1 },
  Tuesday: { byday: "TU", dayIndex: 2 },
  Wednesday: { byday: "WE", dayIndex: 3 },
  Thursday: { byday: "TH", dayIndex: 4 },
  Friday: { byday: "FR", dayIndex: 5 },
  Saturday: { byday: "SA", dayIndex: 6 },
};

/**
 * Finds the first calendar Date occurring on or after startDate that falls on targetDayOfWeek.
 */
function getFirstOccurrenceDate(startDateStr: string, targetDay: DayOfWeek): Date {
  const [year, month, day] = startDateStr.split("-").map(Number);
  // Month is 0-indexed in JS Date
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const targetDayIdx = DAY_MAP[targetDay].dayIndex;

  while (d.getUTCDay() !== targetDayIdx) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function formatDateToICSLocal(date: Date, timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const y = date.getUTCFullYear();
  const mon = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${mon}${d}T${h}${m}00`;
}

function formatUntilDateUTC(endDateStr: string): string {
  const [year, month, day] = endDateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  const y = d.getUTCFullYear();
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${mon}${dayStr}T235959Z`;
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content.
 */
export function generateScheduleIcs(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): string {
  const cohortLabel =
    setup.mode === "batch-section"
      ? `Batch ${setup.batch}_${setup.section}`
      : setup.mode === "courses"
      ? `Custom Courses (${setup.courses.length})`
      : `Mixed (${setup.batch}_${setup.section})`;

  const calName = `RoutineKit - ${routine.semester_label} (${cohortLabel})`;
  const untilUtc = formatUntilDateUTC(routine.end_date || "2026-12-31");
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RoutineKit//DIU CSE Timetable Studio//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:Asia/Dhaka",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Dhaka",
    "X-LIC-LOCATION:Asia/Dhaka",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0600",
    "TZOFFSETTO:+0600",
    "TZNAME:BST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const item of items) {
    const firstDate = getFirstOccurrenceDate(
      routine.start_date || "2026-09-01",
      item.day
    );
    const dtStart = formatDateToICSLocal(firstDate, item.startTime);
    const dtEnd = formatDateToICSLocal(firstDate, item.endTime);
    const byDay = DAY_MAP[item.day].byday;

    // Follow Jishan's event convention:
    // Course code as title; room and teacher initials in description.
    const summary = `${item.courseCode} (${item.section})`;
    const description = [
      `Room: ${item.room || "TBA"}`,
      `Instructor: ${item.instructor || "TBA"}`,
      `Batch/Section: ${formatBatchSectionBadge(item)}`,
      `Type: ${item.classType.toUpperCase()}`,
      item.isRetake ? "Status: RETAKE" : "",
      `Routine Version: ${routine.routine_version}`,
    ]
      .filter(Boolean)
      .join("\\n");

    const location = item.room
      ? `${item.room}, DIU Daffodil Smart City, Ashulia`
      : "DIU Daffodil Smart City";

    // Deterministic UID based on semester, course, section, day, start time
    const uid = `${routine.semester_id}-${item.id}@routinekit.diu`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `DTSTART;TZID=Asia/Dhaka:${dtStart}`,
      `DTEND;TZID=Asia/Dhaka:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${untilUtc};BYDAY=${byDay}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Downloads the .ics file to user's device.
 */
export function exportScheduleIcsFile(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): void {
  const icsContent = generateScheduleIcs(setup, routine, items);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const sem = (setup.semester_id || "semester").replace(/[^a-zA-Z0-9]/g, "_");
  const label =
    setup.mode === "batch-section" && setup.batch && setup.section
      ? `${setup.batch}_${setup.section}`
      : "schedule";

  a.href = url;
  a.download = `RoutineKit_${sem}_${label}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
