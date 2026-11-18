/**
 * RoutineKit Data Models
 * Follows IMPLEMENTATION_PLAN.md specifications
 */

export type DayOfWeek = "Saturday" | "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export type ClassType = "theory" | "lab" | "unknown";

export interface RoutineClass {
  id: string; // Unique deterministic hash/id for class meeting
  courseCode: string; // e.g. "CSE 311" or "CSE311"
  courseTitle?: string; // e.g. "Database Systems"
  batch: string; // e.g. "64"
  section: string; // e.g. "D" or "64_D"
  subsection?: string; // e.g. "A1", "D1", or empty
  day: DayOfWeek;
  startTime: string; // 24-hr format "HH:MM" e.g. "08:30"
  endTime: string; // 24-hr format "HH:MM" e.g. "10:00"
  room: string; // e.g. "AB4-602"
  instructor: string; // e.g. "MNA" or full name
  classType: ClassType;
  rawSlot?: string; // e.g. "08:30-10:00" from source
  slotIndex?: number; // mapped time slot index
  isCustom?: boolean;
}

export interface PublishedRoutine {
  schema_version: string;
  semester_id: string; // e.g. "2026-fall"
  semester_label: string; // e.g. "Fall 2026"
  start_date: string; // "YYYY-MM-DD" e.g. "2026-09-01"
  end_date: string; // "YYYY-MM-DD" e.g. "2026-12-31"
  timezone: string; // "Asia/Dhaka"
  routine_version: string; // e.g. "V4.1"
  source_notice_url?: string;
  source_pdf_url?: string;
  fetched_at: string; // ISO 8601
  published_at: string; // ISO 8601
  source_checksum: string; // sha256
  classes: RoutineClass[];
}

export type SetupMode = "batch-section" | "courses" | "mixed";

export interface StudentCourseSelection {
  courseCode: string;
  batch?: string; // offering batch e.g. "64", "RE", "62"
  section: string;
  isRetake?: boolean;
  creditOverride?: number; // Optional credit override
  customLabel?: string;
}

export interface ClassCustomOverride {
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  room?: string;
  instructor?: string;
  isCustom?: boolean;
}

export interface CustomClassMeeting {
  id?: string;
  day: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  room?: string;
  instructor?: string;
  classType?: ClassType;
  isCustom?: boolean;
}

export interface StudentSetup {
  schema_version: string; // e.g. "1.0"
  semester_id: string;
  mode: SetupMode;
  department?: string; // e.g. "CSE"
  batch?: string; // e.g. "64"
  section?: string; // e.g. "D"
  courses: StudentCourseSelection[];
  customOverrides?: Record<string, ClassCustomOverride>;
  customCourseSchedules?: Record<string, CustomClassMeeting[]>;
  saved_at: string; // ISO 8601
  routine_version_seen?: string;
}

export type ScheduleItemOrigin = "batch" | "custom" | "retake";

export interface ScheduleItem extends RoutineClass {
  origin: ScheduleItemOrigin;
  isRetake: boolean;
  isCustom?: boolean;
  credit?: number;
  conflictsWith?: string[]; // IDs of other conflicting schedule items
  unmatchedWarning?: boolean; // if course or section was not found in published routine
}

export interface ScheduleConflict {
  classIdA: string;
  classIdB: string;
  day: DayOfWeek;
  startTimeA: string;
  endTimeA: string;
  startTimeB: string;
  endTimeB: string;
  reason: string;
}

export interface RoutineStatusInfo {
  current_version: string;
  semester_id: string;
  semester_label: string;
  source_date: string;
  last_successful_refresh: string;
  is_stale: boolean;
  under_review: boolean;
  notes?: string;
}

export interface CohortBreakdown {
  baseLabel: string;
  batch?: string;
  section?: string;
  mode: SetupMode;
  retakeCount: number;
  othersCount: number;
  customCount: number;
  conflictCount: number;
  semesterLabel?: string;
  routineVersion?: string;
  totalCoursesCount: number;
  classesPerWeek?: number;
  retakeCourses?: string[];
  customCourses?: string[];
  otherCourses?: string[];
}

export interface TeacherSummary {
  initials: string;
  avatarInitial: string;
  courses: string[];
  classCount: number;
  photoUrl?: string;
}
