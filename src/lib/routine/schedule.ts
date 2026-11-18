import {
  PublishedRoutine,
  RoutineClass,
  StudentSetup,
  ScheduleItem,
  ScheduleConflict,
  StudentCourseSelection,
  TeacherSummary,
} from "@/types/routine";

/**
 * Converts a time string "HH:MM" into minutes from midnight for interval math.
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Checks if two time intervals on the same day overlap.
 */
export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeStringToMinutes(startA);
  const aEnd = timeStringToMinutes(endA);
  const bStart = timeStringToMinutes(startB);
  const bEnd = timeStringToMinutes(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Standard course credits in DIU CSE if not specified
 * (Labs are typically 1.0 - 1.5, theory is typically 3.0 credits).
 */
export function inferDefaultCredit(classType: string): number {
  return classType === "lab" ? 1.5 : 3.0;
}

/**
 * Formats course codes cleanly without spaces, e.g. "CSE123" instead of "CSE 123".
 */
export function formatCourseCode(code: string): string {
  return code ? code.replace(/\s+/g, "").toUpperCase() : "";
}

/**
 * Formats retake section labels with credit mentioned, e.g. "RE_A(3C)" or "RE_A1(1.5C)".
 */
export function formatRetakeSection(
  batch: string,
  section: string,
  creditOrType?: number | string
): string {
  let sec = (section || "").trim();
  // Fix unclosed parenthesis from source, e.g. "RE_A(2C" -> "RE_A(2C)"
  if (/\(\d+(?:\.\d+)?C$/i.test(sec)) {
    sec = sec + ")";
  }
  // Strip duplicate RE_ prefixes
  sec = sec.replace(/^(?:RE_)+/i, "RE_");

  // If section already mentions credit, e.g. "RE_A1(1.5C)" or "RE_A(3C)"
  if (/\(\d+(?:\.\d+)?\s*C\)/i.test(sec)) {
    return sec;
  }

  const b = (batch || "").trim().toUpperCase();
  const isRE = b === "RE" || b.startsWith("RE_") || sec.toUpperCase().startsWith("RE");
  if (isRE) {
    const cleanLetter = sec.replace(/^RE_?/i, "");
    let credit = 3;
    if (typeof creditOrType === "number") {
      credit = creditOrType;
    } else if (typeof creditOrType === "string") {
      credit = creditOrType.toLowerCase() === "lab" ? 1.5 : 3;
    }
    return `RE_${cleanLetter}(${credit}C)`;
  }
  return sec;
}

/**
 * Combines batch and section into a clean badge label (e.g. "69_F", "69_F2", "RE_A(3C)").
 * Eliminates duplicate prefixes such as "RE_RE_A(3C)" or "69_69_F", and folds
 * subsections into the section label directly (e.g. "69_F2" instead of "69_F (F2)").
 */
export function formatBatchSectionBadge(item: {
  batch?: string;
  section?: string;
  subsection?: string;
  isRetake?: boolean;
}): string {
  let sec = (item.section || "").trim();

  // Strip duplicate RE_ prefixes if present
  sec = sec.replace(/^(?:RE_)+/i, "RE_");

  let sectionLabel = sec;
  if (item.subsection) {
    const cleanSub = item.subsection.trim();
    if (cleanSub) {
      if (cleanSub.toUpperCase().startsWith(sec.toUpperCase())) {
        // e.g. sec="F", subsection="F2" -> "F2"
        sectionLabel = cleanSub;
      } else if (/^\d+$/.test(cleanSub)) {
        // e.g. sec="F", subsection="2" -> "F2"
        sectionLabel = `${sec}${cleanSub}`;
      } else if (sec.toUpperCase().includes(cleanSub.toUpperCase())) {
        sectionLabel = sec;
      } else if (!/^\d+(?:\.\d+)?C$/i.test(cleanSub)) {
        sectionLabel = `${sec}${cleanSub}`;
      }
    }
  }

  if (!item.batch || item.batch === "none") {
    return sectionLabel;
  }

  const b = item.batch.trim().toUpperCase();
  const secUpper = sectionLabel.trim().toUpperCase();

  // If retake class, or batch is RE, or section already starts with RE_ or `${b}_`
  if (
    item.isRetake ||
    b === "RE" ||
    b.startsWith("RE_") ||
    b === "RETAKE" ||
    secUpper.startsWith("RE_") ||
    secUpper.startsWith("RETAKE") ||
    secUpper.startsWith(`${b}_`)
  ) {
    return sectionLabel;
  }

  return `${item.batch}_${sectionLabel}`;
}

/**
 * Genuine departmental retake sections are identified by routine metadata:
 * Batch is RE / RETAKE / RE_* or section starts with RE / RETAKE.
 */
export function isDepartmentalRetake(cls: { batch?: string; section?: string }): boolean {
  if (!cls) return false;
  const b = (cls.batch || "").trim().toUpperCase();
  const s = (cls.section || "").trim().toUpperCase();
  return (
    b === "RE" ||
    b.startsWith("RE_") ||
    b.startsWith("RETAKE") ||
    s.startsWith("RE") ||
    s.includes("RETAKE")
  );
}

/**
 * Determines whether a class is a retake class based on routine data.
 * Genuine departmental retakes are sections designated with departmental markers (RE batch or RE_* / RETAKE section).
 */
export function isRetakeClass(
  cls: { batch?: string; section?: string },
  _studentBatch?: string
): boolean {
  void _studentBatch;
  if (!cls) return false;
  return isDepartmentalRetake(cls);
}

/**
 * Determines whether an offering is from another batch relative to the student's base batch,
 * and is not a departmental retake.
 */
export function isOtherBatchClass(
  cls: { batch?: string; section?: string },
  studentBatch?: string
): boolean {
  if (!cls || !studentBatch || !cls.batch) return false;
  if (isDepartmentalRetake(cls)) return false;
  const sb = studentBatch.trim().toUpperCase();
  const b = cls.batch.trim().toUpperCase();
  return Boolean(sb && sb !== "NONE" && b && b !== "GENERAL" && b !== "NONE" && b !== sb);
}

/**
 * Determines whether a class belongs to the student's base cohort (batch and section).
 */
export function isBaseCohortClass(
  cls: { batch?: string; section?: string; subsection?: string },
  studentBatch?: string,
  studentSection?: string
): boolean {
  if (!cls || !studentBatch) return false;
  const sb = studentBatch.trim().toUpperCase();
  if (!sb || sb === "NONE") return false;
  if (isDepartmentalRetake(cls)) return false;

  const b = (cls.batch || "").trim().toUpperCase();
  if (b !== sb) return false;

  const ss = (studentSection || "").trim().toUpperCase();
  if (!ss || ss === "NONE") return true;

  const s = (cls.section || "").trim().toUpperCase();
  const sub = (cls.subsection || "").trim().toUpperCase();

  const m = ss.match(/^([A-Z])(\d*)$/);
  if (m && m[2]) {
    const baseLetter = m[1];
    if (s === baseLetter) {
      return sub === "" || sub === ss;
    }
    return s === ss;
  }

  return s === ss || s.startsWith(ss);
}

/**
 * Extracts distinct course offerings available for a given batch and section.
 */
export function getCoursesForBatchAndSection(
  routine: PublishedRoutine,
  batch: string,
  section: string
): StudentCourseSelection[] {
  if (!batch || !section || section.toLowerCase() === "none") return [];
  const b = batch.trim().toUpperCase();
  const s = section.trim().toUpperCase();

  const secMatch = s.match(/^([A-Z])(\d*)$/);
  const baseLetter = secMatch ? secMatch[1] : s;
  const hasSub = Boolean(secMatch && secMatch[2]);

  const matching = routine.classes.filter((c) => {
    if (c.batch.toUpperCase() !== b) return false;
    const cSec = c.section.toUpperCase();
    const cSub = (c.subsection || "").toUpperCase();
    if (hasSub) {
      return cSec === baseLetter && (cSub === "" || cSub === s);
    }
    return cSec === s;
  });

  const map = new Map<string, StudentCourseSelection>();
  for (const cls of matching) {
    const code = formatCourseCode(cls.courseCode);
    if (!map.has(code)) {
      map.set(code, {
        courseCode: code,
        batch: cls.batch,
        section: hasSub ? (cls.subsection || cls.section) : cls.section,
        isRetake: false,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode));
}

/**
 * Derives a student's personal schedule from the published routine and student setup.
 */
export function derivePersonalSchedule(
  routine: PublishedRoutine,
  setup: StudentSetup
): {
  items: ScheduleItem[];
  conflicts: ScheduleConflict[];
  unmatchedSelections: string[];
} {
  const items: ScheduleItem[] = [];
  const unmatchedSelections: string[] = [];

  const normCode = (c: string) => c.replace(/\s+/g, "").toUpperCase();

  const targetBatch =
    setup.batch && setup.batch.toLowerCase() !== "none"
      ? setup.batch.trim().toUpperCase()
      : undefined;
  const targetSec =
    setup.section && setup.section.toLowerCase() !== "none"
      ? setup.section.trim().toUpperCase()
      : undefined;

  // Include base batch classes unless mode is explicitly courses-only
  const includeBase = setup.mode !== "courses" && !!targetBatch && !!targetSec;

  const secMatch = targetSec?.match(/^([A-Z])(\d*)$/);
  const baseLetter = secMatch ? secMatch[1] : targetSec;
  const hasSub = Boolean(secMatch && secMatch[2]);

  const batchClasses = includeBase
    ? routine.classes.filter((c) => {
        if (c.batch.toUpperCase() !== targetBatch) return false;
        const cSec = c.section.toUpperCase();
        const cSub = (c.subsection || "").toUpperCase();
        if (hasSub) {
          return cSec === baseLetter && (cSub === "" || cSub === targetSec);
        }
        return cSec === targetSec;
      })
    : [];

  // Track which course codes were added/overridden
  const customCodes = new Set(setup.courses.map((c) => normCode(c.courseCode)));

  const handledCustomCourseCodes = new Set<string>();

  // 1. Add base batch classes (excluding those overridden by added courses)
  for (const cls of batchClasses) {
    const code = normCode(cls.courseCode);
    if (!customCodes.has(code)) {
      const customMeetings = setup.customCourseSchedules?.[code];
      if (customMeetings !== undefined) {
        if (!handledCustomCourseCodes.has(code)) {
          handledCustomCourseCodes.add(code);
          customMeetings.forEach((cm, mi) => {
            items.push({
              ...cls,
              id: cm.id || `${cls.id}_custom_${mi}_${cm.day}_${(cm.startTime || "").replace(":", "")}`,
              courseCode: formatCourseCode(cls.courseCode),
              day: cm.day,
              startTime: cm.startTime,
              endTime: cm.endTime,
              room: cm.room !== undefined ? cm.room : cls.room,
              instructor: cm.instructor !== undefined ? cm.instructor : cls.instructor,
              classType: cm.classType || cls.classType,
              origin: "custom",
              isRetake: false,
              isCustom: true,
              credit: inferDefaultCredit(cm.classType || cls.classType),
            });
          });
        }
      } else {
        const override = setup.customOverrides?.[cls.id];
        const isCustom = Boolean(override?.isCustom);
        items.push({
          ...cls,
          courseCode: formatCourseCode(cls.courseCode),
          day: override?.day || cls.day,
          startTime: override?.startTime || cls.startTime,
          endTime: override?.endTime || cls.endTime,
          room: override?.room !== undefined ? override.room : cls.room,
          instructor: override?.instructor !== undefined ? override.instructor : cls.instructor,
          origin: isCustom ? "custom" : "batch",
          isRetake: false,
          isCustom,
          credit: inferDefaultCredit(cls.classType),
        });
      }
    }
  }

  // Index classes by normalized course code for O(1) candidate lookup (Rule js-index-maps)
  const courseCodeMap = new Map<string, RoutineClass[]>();
  for (const c of routine.classes) {
    const code = normCode(c.courseCode);
    let list = courseCodeMap.get(code);
    if (!list) {
      list = [];
      courseCodeMap.set(code, list);
    }
    list.push(c);
  }

  // 2. Add explicitly selected/added courses
  for (const sel of setup.courses) {
    const codeMatch = normCode(sel.courseCode);
    const secMatch = sel.section.trim().toUpperCase();
    const selBatch = sel.batch?.trim().toUpperCase();

    const candidates = courseCodeMap.get(codeMatch) || [];
    const matchingClasses = candidates.filter((c) => {
      // When offering batch is specified, strictly enforce matching offering batch
      if (selBatch && c.batch.trim().toUpperCase() !== selBatch) {
        return false;
      }

      const cSec = c.section.trim().toUpperCase();
      const cSub = (c.subsection || "").trim().toUpperCase();
      const cBatchSec = `${c.batch}_${c.section}`.toUpperCase();
      const cBatchSub = `${c.batch}_${cSub}`.toUpperCase();
      const cRetakeSec = formatRetakeSection(c.batch, c.section, inferDefaultCredit(c.classType)).toUpperCase();
      const stripParen = (s: string) => s.replace(/\([^)]*\)/g, "").replace(/\s+/g, "").toUpperCase();

      return (
        cSec === secMatch ||
        (cSub && cSub === secMatch) ||
        (cSub && cBatchSub === secMatch) ||
        cBatchSec === secMatch ||
        cRetakeSec === secMatch ||
        stripParen(cSec) === stripParen(secMatch) ||
        stripParen(cBatchSec) === stripParen(secMatch)
      );
    });

    const customMeetings = setup.customCourseSchedules?.[codeMatch];
    if (customMeetings !== undefined) {
      if (!handledCustomCourseCodes.has(codeMatch)) {
        handledCustomCourseCodes.add(codeMatch);
        const template = matchingClasses[0];
        const isRetake = (template && isRetakeClass(template, setup.batch)) || Boolean(sel.isRetake);
        const sectionMatch = sel.section.match(/\((\d+(?:\.\d+)?)\s*C/i);
        const hasTheory = matchingClasses.some((c) => c.classType === "theory");
        const defaultCourseCredit = hasTheory ? 3.0 : 1.5;
        const finalCredit = sel.creditOverride ?? (sectionMatch ? parseFloat(sectionMatch[1]) : defaultCourseCredit);
        const displaySection = isRetake ? formatRetakeSection(sel.batch || template?.batch || "", sel.section, finalCredit) : sel.section;

        customMeetings.forEach((cm, mi) => {
          items.push({
            id: cm.id || `${codeMatch}_custom_${mi}_${cm.day}_${(cm.startTime || "").replace(":", "")}`,
            courseCode: formatCourseCode(sel.courseCode),
            courseTitle: template?.courseTitle,
            batch: sel.batch || template?.batch || setup.batch || "",
            section: displaySection,
            subsection: template?.subsection || "",
            day: cm.day,
            startTime: cm.startTime,
            endTime: cm.endTime,
            room: cm.room !== undefined ? cm.room : (template?.room || ""),
            instructor: cm.instructor !== undefined ? cm.instructor : (template?.instructor || ""),
            classType: cm.classType || template?.classType || "theory",
            origin: "custom",
            isRetake,
            isCustom: true,
            credit: finalCredit,
          });
        });
      }
    } else if (matchingClasses.length === 0) {
      const batchLabel = sel.batch ? ` [Batch ${sel.batch}]` : "";
      unmatchedSelections.push(`${formatCourseCode(sel.courseCode)} (${sel.section}${batchLabel})`);
    } else {
      // Determine overall course credit for this selection
      const sectionMatch = sel.section.match(/\((\d+(?:\.\d+)?)\s*C/i);
      const hasTheory = matchingClasses.some((c) => c.classType === "theory");
      const defaultCourseCredit = hasTheory ? 3.0 : 1.5;
      const finalCredit = sel.creditOverride ?? (sectionMatch ? parseFloat(sectionMatch[1]) : defaultCourseCredit);

      for (const cls of matchingClasses) {
          const isRetake = isRetakeClass(cls, setup.batch) || Boolean(sel.isRetake);
          const displaySection = isRetake ? formatRetakeSection(cls.batch, cls.section, finalCredit) : cls.section;

          const override = setup.customOverrides?.[cls.id];
          const isCustom = Boolean(override?.isCustom);

          items.push({
            ...cls,
            courseCode: formatCourseCode(cls.courseCode),
            section: displaySection,
            day: override?.day || cls.day,
            startTime: override?.startTime || cls.startTime,
            endTime: override?.endTime || cls.endTime,
            room: override?.room !== undefined ? override.room : cls.room,
            instructor: override?.instructor !== undefined ? override.instructor : cls.instructor,
            origin: isCustom ? "custom" : (isRetake ? "retake" : "batch"),
            isRetake,
            isCustom,
            credit: finalCredit,
          });
        }
      }
    }

  // 3. Ensure any customCourseSchedules not yet handled are also included
  if (setup.customCourseSchedules) {
    for (const [codeKey, customMeetings] of Object.entries(setup.customCourseSchedules)) {
      const codeMatch = normCode(codeKey);
      if (!handledCustomCourseCodes.has(codeMatch) && customMeetings && customMeetings.length > 0) {
        handledCustomCourseCodes.add(codeMatch);
        const template = routine.classes.find((c) => normCode(c.courseCode) === codeMatch);
        customMeetings.forEach((cm, mi) => {
          items.push({
            id: cm.id || `${codeMatch}_custom_${mi}_${cm.day}_${(cm.startTime || "").replace(":", "")}`,
            courseCode: formatCourseCode(codeKey),
            courseTitle: template?.courseTitle,
            batch: template?.batch || setup.batch || "",
            section: template?.section || "CUSTOM",
            subsection: template?.subsection || "",
            day: cm.day,
            startTime: cm.startTime,
            endTime: cm.endTime,
            room: cm.room !== undefined ? cm.room : (template?.room || ""),
            instructor: cm.instructor !== undefined ? cm.instructor : (template?.instructor || ""),
            classType: cm.classType || template?.classType || "theory",
            origin: "custom",
            isRetake: template ? isRetakeClass(template, setup.batch) : false,
            isCustom: true,
            credit: inferDefaultCredit(cm.classType || template?.classType || "theory"),
          });
        });
      }
    }
  }

  // Detect time conflicts among derived items
  const conflicts: ScheduleConflict[] = [];
  const conflictMap = new Map<string, Set<string>>();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      if (a.day === b.day && timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        conflicts.push({
          classIdA: a.id,
          classIdB: b.id,
          day: a.day,
          startTimeA: a.startTime,
          endTimeA: a.endTime,
          startTimeB: b.startTime,
          endTimeB: b.endTime,
          reason: `Overlap on ${a.day}: ${a.courseCode} (${a.startTime}-${a.endTime}) vs ${b.courseCode} (${b.startTime}-${b.endTime})`,
        });

        if (!conflictMap.has(a.id)) conflictMap.set(a.id, new Set());
        if (!conflictMap.has(b.id)) conflictMap.set(b.id, new Set());
        conflictMap.get(a.id)!.add(b.id);
        conflictMap.get(b.id)!.add(a.id);
      }
    }
  }

  // Tag items with conflict IDs
  for (const item of items) {
    if (conflictMap.has(item.id)) {
      item.conflictsWith = Array.from(conflictMap.get(item.id)!);
    }
  }

  return { items, conflicts, unmatchedSelections };
}

/**
 * Compares routine version seen in setup with current routine to find discrepancies.
 */
export function checkRoutineVersionDrift(
  setup: StudentSetup,
  routine: PublishedRoutine
): {
  hasDrift: boolean;
  oldVersion?: string;
  newVersion: string;
  hasCustomizations: boolean;
  customCourseCount: number;
} {
  const oldVersion = setup.routine_version_seen;
  const newVersion = routine.routine_version;
  const hasConfigured = Boolean(
    (setup.courses && setup.courses.length > 0) ||
    (setup.batch && setup.batch !== "none")
  );
  const hasDrift = Boolean(
    (oldVersion && oldVersion !== newVersion) ||
    (!oldVersion && hasConfigured)
  );
  const effectiveOldVersion = oldVersion || (hasDrift ? "prev" : undefined);
  const customScheduleCount = Object.keys(setup.customCourseSchedules || {}).length;
  const customOverridesCount = Object.keys(setup.customOverrides || {}).length;
  const hasCustomizations = customScheduleCount > 0 || customOverridesCount > 0;

  return {
    hasDrift,
    oldVersion: effectiveOldVersion,
    newVersion,
    hasCustomizations,
    customCourseCount: customScheduleCount,
  };
}

/**
 * Computes a clean avatar initial from an instructor's identifier.
 * - 1 or 2 characters: returns as-is (e.g., "AS", "M").
 * - 3+ characters (routine initials like "MUM", "AKC", "DMAT"): returns the primary initial (first character).
 */
export function getTeacherAvatarInitial(instructor: string): string {
  if (!instructor) return "?";
  const clean = instructor.replace(/[^a-zA-Z0-9]/g, "").trim();
  if (!clean) return instructor.charAt(0).toUpperCase() || "?";
  if (clean.length <= 2) {
    return clean.toUpperCase();
  }
  return clean.charAt(0).toUpperCase();
}

/**
 * Extracts and aggregates all unique teachers scheduled across routine items.
 */
export function extractTeachersFromSchedule(items?: ScheduleItem[]): TeacherSummary[] {
  if (!items || items.length === 0) return [];

  const map = new Map<string, { courses: Set<string>; classCount: number }>();

  for (const item of items) {
    const raw = item.instructor?.trim();
    if (!raw || raw === "-" || raw.toUpperCase() === "TBA" || raw.toUpperCase() === "TBD") {
      continue;
    }

    // Support comma, slash, ampersand, or plus separation if multiple instructors are listed
    const parts = raw.split(/[,/&+]+/).map((s) => s.trim()).filter(Boolean);
    const instructorList = parts.length > 0 ? parts : [raw];

    for (const inst of instructorList) {
      if (inst === "-" || inst.toUpperCase() === "TBA" || inst.toUpperCase() === "TBD") continue;

      const existing = map.get(inst);
      const cleanCourse = formatCourseCode(item.courseCode);
      if (existing) {
        if (cleanCourse) existing.courses.add(cleanCourse);
        existing.classCount += 1;
      } else {
        const set = new Set<string>();
        if (cleanCourse) set.add(cleanCourse);
        map.set(inst, { courses: set, classCount: 1 });
      }
    }
  }

  return Array.from(map.entries())
    .map(([initials, data]) => ({
      initials,
      avatarInitial: getTeacherAvatarInitial(initials),
      courses: Array.from(data.courses).sort(),
      classCount: data.classCount,
    }))
    .sort((a, b) => a.initials.localeCompare(b.initials));
}

/**
 * Derives the main schedule title matching RoutineKit academic conventions,
 * e.g. "Class Schedule · 66_D"
 */
export function getScheduleTitle(setup: StudentSetup, items: ScheduleItem[]): string {
  if (setup.mode === "batch-section" && setup.batch && setup.section) {
    const b = setup.batch.trim();
    const s = setup.section.trim();
    if (b.toLowerCase() !== "none" && s.toLowerCase() !== "none") {
      return `Class Schedule · ${b}_${s}`;
    }
  } else if (setup.mode === "mixed" && setup.batch && setup.section) {
    return `Class Schedule · ${setup.batch}_${setup.section} (Mixed)`;
  } else if (setup.mode === "courses") {
    return `Class Schedule · Custom Courses (${items.length})`;
  }
  return `Class Schedule · ${items.length} Classes`;
}

/**
 * Derives the headline for the header, e.g. "Batch 66 · Section D"
 */
export function getScheduleHeadline(setup: StudentSetup, items: ScheduleItem[]): string {
  if (setup.mode === "batch-section" && setup.batch && setup.section) {
    const b = setup.batch.trim();
    const s = setup.section.trim();
    if (b.toLowerCase() !== "none" && s.toLowerCase() !== "none") {
      return `Batch ${b} · Section ${s}`;
    }
  } else if (setup.mode === "mixed" && setup.batch && setup.section) {
    return `Batch ${setup.batch} · Section ${setup.section} (Mixed)`;
  } else if (setup.mode === "courses") {
    return `Custom Routine (${items.length} Classes)`;
  }
  return "Personal Schedule";
}
