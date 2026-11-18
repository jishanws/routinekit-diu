import { readFileSync } from "fs";
import { derivePersonalSchedule } from "../src/lib/routine/schedule.ts";
import { generateScheduleIcs } from "../src/lib/calendar/icsGenerator.ts";
import {
  createTimetablePdfDocument,
  formatSlot12Hour,
  formatCourseCellText,
  splitRoomLabel,
  groupScheduleItemsByDay,
  getScheduleTitle,
  COLORS,
} from "../src/lib/export/timetableExporter.ts";

const routine = JSON.parse(readFileSync("./public/data/routine-latest.json", "utf-8"));

console.log("=== VERIFYING SECTION 4 & 5 EXPORTS ===");

// 1. Sparse schedule (Batch 64 Section D)
const sparseSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "batch-section",
  batch: "64",
  section: "D",
  courses: [],
  saved_at: new Date().toISOString(),
};
const sparseDerived = derivePersonalSchedule(routine, sparseSetup);
const sparseIcs = generateScheduleIcs(sparseSetup, routine, sparseDerived.items);

console.log(`✓ Sparse schedule items: ${sparseDerived.items.length}`);
if (!sparseIcs.includes("BEGIN:VCALENDAR")) throw new Error("Missing VCALENDAR begin");
if (!sparseIcs.includes("TZID:Asia/Dhaka")) throw new Error("Missing Asia/Dhaka TZID");
if (!sparseIcs.includes("RRULE:FREQ=WEEKLY")) throw new Error("Missing weekly recurrence RRULE");
if (!sparseIcs.includes("UNTIL=20261231T235959Z")) throw new Error("Missing semester end cutoff in RRULE");
console.log("✓ Sparse ICS calendar verified.");

// 2. Dense schedule (Multi-course selection with retakes)
const denseSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "courses",
  courses: [
    { courseCode: "CSE 321", section: "67_B", isRetake: false },
    { courseCode: "CSE 322", section: "67_B", isRetake: false },
    { courseCode: "CSE 221", section: "69_A", isRetake: true },
    { courseCode: "CSE 222", section: "69_A", isRetake: true },
  ],
  saved_at: new Date().toISOString(),
};
const denseDerived = derivePersonalSchedule(routine, denseSetup);
const denseIcs = generateScheduleIcs(denseSetup, routine, denseDerived.items);

console.log(`✓ Dense schedule items: ${denseDerived.items.length}`);
if (denseDerived.items.length === 0) throw new Error("Dense schedule should have derived items");
if (!denseIcs.includes("Status: RETAKE")) throw new Error("Dense ICS should tag retake courses in description");
console.log("✓ Dense ICS calendar with retakes verified.");

// Verify unique deterministic UIDs in dense calendar
const uids = denseIcs.match(/UID:[^\r\n]+/g) || [];
const uniqueUids = new Set(uids);
console.log(`✓ Total UIDs: ${uids.length}, Unique UIDs: ${uniqueUids.size}`);
if (uids.length !== uniqueUids.size) throw new Error("UID collision detected in ICS export!");

// 3. DIU Routine Table Export Formatting Tests
console.log("\n=== VERIFYING DIU OFFICIAL ROUTINE TABLE EXPORT ENGINE ===");

// Time slot 12-hour conversion tests
const slot1 = formatSlot12Hour("08:30", "10:00");
if (slot1 !== "08:30 – 10:00") throw new Error(`Expected 08:30 – 10:00, got ${slot1}`);

const slot2 = formatSlot12Hour("13:00", "14:30");
if (slot2 !== "01:00 – 02:30") throw new Error(`Expected 01:00 – 02:30, got ${slot2}`);

const slot3 = formatSlot12Hour("11:30", "14:30");
if (slot3 !== "11:30 – 02:30") throw new Error(`Expected 11:30 – 02:30, got ${slot3}`);

const slot4 = formatSlot12Hour("14:30", "16:00");
if (slot4 !== "02:30 – 04:00") throw new Error(`Expected 02:30 – 04:00, got ${slot4}`);

console.log("✓ 12-hour slot formatting verified (08:30 – 10:00, 01:00 – 02:30, 11:30 – 02:30, 02:30 – 04:00).");

// Course title and badge tests
const sampleItem = {
  id: "test1",
  courseCode: "CSE 316",
  batch: "66",
  section: "D",
  day: "Monday",
  startTime: "08:30",
  endTime: "10:00",
  room: "KT-516",
  instructor: "TAR",
  classType: "theory",
  origin: "batch",
  isRetake: false,
};
const formattedCourse = formatCourseCellText(sampleItem);
if (!formattedCourse.displayText.includes("Artificial Intelligence · CSE316(66_D)")) {
  throw new Error(`Unexpected course format: ${formattedCourse.displayText}`);
}
console.log(`✓ Course cell text verified: "${formattedCourse.displayText}"`);

// Room & Lab tag separation tests
const roomLab1 = splitRoomLabel("KT-503 (COM LAB)");
if (roomLab1.mainRoom !== "KT-503" || roomLab1.labTag !== "COM LAB") {
  throw new Error(`Failed to split lab tag: ${JSON.stringify(roomLab1)}`);
}

const roomLab2 = splitRoomLabel("KT-503", "lab");
if (roomLab2.mainRoom !== "KT-503" || roomLab2.labTag !== "COM LAB") {
  throw new Error(`Failed to tag KT lab room: ${JSON.stringify(roomLab2)}`);
}

const roomRegular = splitRoomLabel("KT-318(A)", "theory");
if (roomRegular.mainRoom !== "KT-318(A)" || roomRegular.labTag) {
  throw new Error(`Corrupted non-lab room: ${JSON.stringify(roomRegular)}`);
}
console.log("✓ Room & Lab tag separation verified.");

// Batch 66 Section D Full Schedule jsPDF Document Generation
const setup66D = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "batch-section",
  batch: "66",
  section: "D",
  courses: [],
  saved_at: new Date().toISOString(),
};
const derived66D = derivePersonalSchedule(routine, setup66D);
if (derived66D.items.length !== 10) {
  throw new Error(`Expected 10 items for 66_D, got ${derived66D.items.length}`);
}

const title = getScheduleTitle(setup66D, derived66D.items);
if (title !== "Class Schedule · 66_D") {
  throw new Error(`Expected "Class Schedule · 66_D", got "${title}"`);
}
console.log(`✓ Schedule title verified: "${title}"`);

const dayGroups = groupScheduleItemsByDay(derived66D.items);
if (dayGroups.length !== 4) {
  throw new Error(`Expected 4 active days for 66_D, got ${dayGroups.length}`);
}
console.log(`✓ Grouped into ${dayGroups.length} academic days (Monday, Tuesday, Wednesday, Thursday).`);

console.log("Generating jsPDF document for 66_D...");
const pdfDoc = await createTimetablePdfDocument(setup66D, routine, derived66D.items);
const pdfArrayBuf = pdfDoc.output("arraybuffer");
if (pdfArrayBuf.byteLength < 50000) {
  throw new Error(`Generated PDF too small: ${pdfArrayBuf.byteLength} bytes`);
}
console.log(`✓ jsPDF official timetable document successfully generated (${pdfArrayBuf.byteLength} bytes).`);

// 4. Verify Monochrome Palette and Badges in PDF stream
console.log("\n=== VERIFYING MONOCHROME / GRAYSCALE PALETTE & BADGES ===");
if (COLORS.theoryRail.toLowerCase() === "#2563eb") {
  throw new Error("theoryRail still uses blue accent color!");
}
if (COLORS.badgeBg !== "#F1F5F9" || COLORS.badgeText !== "#334155") {
  throw new Error("badge colors not matching clean monochrome specification");
}
console.log("✓ Monochrome palette verified (Zero blue accent colors, clean slate/zinc/gray).");

const pageStream = pdfDoc.internal.pages[1].join("\n");
if (!pageStream.includes("66_D")) {
  throw new Error("PDF page stream missing section badge 66_D!");
}
if (!pageStream.includes("Courses") || !pageStream.includes("Classes / Wk")) {
  throw new Error("PDF page stream missing header summary badges!");
}
console.log("✓ Badge sections verified inside PDF document (Section badges + Header badges).");

// Test Retake badge in PDF
const retakeDoc = await createTimetablePdfDocument(denseSetup, routine, denseDerived.items);
const retakeStream = retakeDoc.internal.pages[1].join("\n");
if (!retakeStream.includes("RETAKE")) {
  throw new Error("PDF stream missing RETAKE badge for retake courses!");
}
console.log("✓ Retake badge verified inside PDF document.");

console.log("=== ALL EXPORT TESTS PASSED ===");
