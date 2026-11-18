import { readFileSync } from "fs";
import {
  derivePersonalSchedule,
  timesOverlap,
  isRetakeClass,
  isDepartmentalRetake,
  isOtherBatchClass,
  isBaseCohortClass,
  getCoursesForBatchAndSection,
  formatCourseCode,
  formatRetakeSection,
  formatBatchSectionBadge,
  checkRoutineVersionDrift,
  getTeacherAvatarInitial,
  extractTeachersFromSchedule,
} from "../src/lib/routine/schedule.ts";
import { formatAcademicWeekRange, parseTimeInput } from "../src/lib/routine/calendarLayout.ts";
import { DEFAULT_SETUP } from "../src/lib/storage/setupStore.ts";

const routine = JSON.parse(readFileSync("./public/data/routine-latest.json", "utf-8"));

console.log("=== VERIFYING SCHEDULE LOGIC & SEARCH-AND-ADD FLOW ===");

// 0. Formatting Helpers (Clean course codes like CSE123 and retake credits like RE_A(3C))
console.log("✓ Testing formatting helpers:");
if (formatCourseCode("CSE 123") !== "CSE123") throw new Error("Expected CSE123");
if (formatCourseCode("CSE 221") !== "CSE221") throw new Error("Expected CSE221");
if (formatCourseCode("MAT 101") !== "MAT101") throw new Error("Expected MAT101");
if (formatRetakeSection("RE", "A", 3) !== "RE_A(3C)") {
  throw new Error(`Expected RE_A(3C), got ${formatRetakeSection("RE", "A", 3)}`);
}
if (formatRetakeSection("General", "RE_A1(1.5C)") !== "RE_A1(1.5C)") {
  throw new Error("Expected RE_A1(1.5C)");
}
if (formatRetakeSection("General", "RE_A(2C") !== "RE_A(2C)") {
  throw new Error("Expected RE_A(2C)");
}
if (formatRetakeSection("RE", "RE_A(3C)") !== "RE_A(3C)") {
  throw new Error("Expected RE_A(3C)");
}
if (formatRetakeSection("RE", "RE_RE_A(3C)") !== "RE_A(3C)") {
  throw new Error("Expected RE_A(3C) when duplicate RE_ prefix is provided");
}

// formatBatchSectionBadge tests
if (formatBatchSectionBadge({ batch: "69", section: "F" }) !== "69_F") {
  throw new Error(`Expected 69_F, got ${formatBatchSectionBadge({ batch: "69", section: "F" })}`);
}
if (formatBatchSectionBadge({ batch: "RE", section: "RE_A(3C)", isRetake: true }) !== "RE_A(3C)") {
  throw new Error(`Expected RE_A(3C) without duplicate, got ${formatBatchSectionBadge({ batch: "RE", section: "RE_A(3C)", isRetake: true })}`);
}
if (formatBatchSectionBadge({ batch: "69", section: "RE_A(3C)", isRetake: true }) !== "RE_A(3C)") {
  throw new Error(`Expected RE_A(3C), got ${formatBatchSectionBadge({ batch: "69", section: "RE_A(3C)", isRetake: true })}`);
}
if (formatBatchSectionBadge({ batch: "69", section: "RE_RE_A(3C)", isRetake: true }) !== "RE_A(3C)") {
  throw new Error(`Expected RE_A(3C) cleanup of RE_RE_, got ${formatBatchSectionBadge({ batch: "RE", section: "RE_RE_A(3C)", isRetake: true })}`);
}
// Subsection folding tests (e.g. 69_F (F2) -> 69_F2)
if (formatBatchSectionBadge({ batch: "69", section: "F", subsection: "F2" }) !== "69_F2") {
  throw new Error(`Expected 69_F2, got ${formatBatchSectionBadge({ batch: "69", section: "F", subsection: "F2" })}`);
}
if (formatBatchSectionBadge({ batch: "69", section: "F", subsection: "2" }) !== "69_F2") {
  throw new Error(`Expected 69_F2, got ${formatBatchSectionBadge({ batch: "69", section: "F", subsection: "2" })}`);
}
if (formatBatchSectionBadge({ batch: "72", section: "B", subsection: "B1" }) !== "72_B1") {
  throw new Error(`Expected 72_B1, got ${formatBatchSectionBadge({ batch: "72", section: "B", subsection: "B1" })}`);
}
if (formatBatchSectionBadge({ section: "F", subsection: "F2" }) !== "F2") {
  throw new Error(`Expected F2, got ${formatBatchSectionBadge({ section: "F", subsection: "F2" })}`);
}

// Time parsing and validation tests
console.log("✓ Testing time parsing & invalid input rejection:");
if (parseTimeInput("8:80 a.m.").valid !== false) {
  throw new Error("Expected 8:80 a.m. to be invalid");
}
if (parseTimeInput("8:80").valid !== false) {
  throw new Error("Expected 8:80 to be invalid");
}
if (parseTimeInput("25:00").valid !== false) {
  throw new Error("Expected 25:00 to be invalid");
}
if (parseTimeInput("13:00 AM").valid !== false) {
  throw new Error("Expected 13:00 AM to be invalid");
}
if (parseTimeInput("").valid !== false) {
  throw new Error("Expected empty string to be invalid");
}
const valid1 = parseTimeInput("8:30 a.m.");
if (!valid1.valid || valid1.time24 !== "08:30" || valid1.time12 !== "8:30 AM") {
  throw new Error(`Expected 8:30 a.m. -> 08:30 / 8:30 AM, got ${JSON.stringify(valid1)}`);
}
const valid2 = parseTimeInput("1:00 pm");
if (!valid2.valid || valid2.time24 !== "13:00" || valid2.time12 !== "1:00 PM") {
  throw new Error(`Expected 1:00 pm -> 13:00 / 1:00 PM, got ${JSON.stringify(valid2)}`);
}
const valid3 = parseTimeInput("14:30");
if (!valid3.valid || valid3.time24 !== "14:30" || valid3.time12 !== "2:30 PM") {
  throw new Error(`Expected 14:30 -> 14:30 / 2:30 PM, got ${JSON.stringify(valid3)}`);
}
console.log("  → Correctly rejected '8:80 a.m.', '8:80', '25:00', and normalized valid 12h/24h times!");
// formatAcademicWeekRange tests
const d1 = new Date(2026, 9, 19); // Oct 19, 2026 (Saturday is Oct 17)
if (formatAcademicWeekRange(d1) !== "Oct 17 – 22, 2026") {
  throw new Error(`Expected 'Oct 17 – 22, 2026', got '${formatAcademicWeekRange(d1)}'`);
}
const d2 = new Date(2026, 9, 31); // Oct 31, 2026 (Crosses into Nov 5)
if (formatAcademicWeekRange(d2) !== "Oct 31 – Nov 5, 2026") {
  throw new Error(`Expected 'Oct 31 – Nov 5, 2026', got '${formatAcademicWeekRange(d2)}'`);
}
const d3 = new Date(2026, 11, 28); // Dec 28, 2026 (Crosses into Jan 2, 2027)
if (formatAcademicWeekRange(d3) !== "Dec 26 – 31, 2026") {
  throw new Error(`Expected 'Dec 26 – 31, 2026', got '${formatAcademicWeekRange(d3)}'`);
}
console.log("  → formatCourseCode, formatRetakeSection, formatBatchSectionBadge, and formatAcademicWeekRange verified successfully.");

// 1. Base Batch & Section Schedule
const baseSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "mixed",
  batch: "64",
  section: "D",
  courses: [],
  saved_at: new Date().toISOString(),
};
const baseResult = derivePersonalSchedule(routine, baseSetup);
console.log(`✓ Base Batch 64_D classes derived: ${baseResult.items.length}`);
if (baseResult.items.length === 0) throw new Error("Batch 64_D should have classes");
for (const item of baseResult.items) {
  if (item.courseCode.includes(" ")) {
    throw new Error(`Expected clean course code like CSE123, got ${item.courseCode}`);
  }
}

// 2. Retake Rule Verification (isRetakeClass, isDepartmentalRetake, isOtherBatchClass)
console.log("✓ Testing isRetakeClass and isDepartmentalRetake rules:");
if (!isRetakeClass({ batch: "RE", section: "A" }, "64")) {
  throw new Error("RE batch must be recognized as retake");
}
if (!isRetakeClass({ batch: "General", section: "RE_A1(1C)" }, "64")) {
  throw new Error("RE_ prefixed section must be recognized as retake");
}
if (isRetakeClass({ batch: "69", section: "A" }, "64")) {
  throw new Error("Cross-batch class (69 vs 64) must NOT be recognized as retake");
}
if (isRetakeClass({ batch: "64", section: "D" }, "64")) {
  throw new Error("Own batch class (64 vs 64) must NOT be recognized as retake");
}

// Departmental Retake rules
if (!isDepartmentalRetake({ batch: "RE", section: "A" })) {
  throw new Error("RE batch must be recognized as departmental retake");
}
if (!isDepartmentalRetake({ batch: "General", section: "RE_A1(1C)" })) {
  throw new Error("RE_ prefixed section must be recognized as departmental retake");
}
if (isDepartmentalRetake({ batch: "69", section: "A" })) {
  throw new Error("Regular batch 69 section must NOT be recognized as departmental retake");
}

// Other batch rules & base cohort recognition
if (!isOtherBatchClass({ batch: "69", section: "A" }, "64")) {
  throw new Error("Regular batch 69 section must be recognized as other batch relative to 64");
}
if (isOtherBatchClass({ batch: "64", section: "D" }, "64")) {
  throw new Error("Base batch class must NOT be recognized as other batch");
}
if (isOtherBatchClass({ batch: "RE", section: "A" }, "64")) {
  throw new Error("Departmental retake must NOT be categorized as normal other batch");
}
if (!isBaseCohortClass({ batch: "64", section: "D" }, "64", "D")) {
  throw new Error("Base cohort (64_D) must be recognized as base cohort");
}
if (!isBaseCohortClass({ batch: "64", section: "D1" }, "64", "D")) {
  throw new Error("Base cohort lab subsection (64_D1) must be recognized as base cohort");
}
if (isBaseCohortClass({ batch: "69", section: "A" }, "64", "D")) {
  throw new Error("Other batch class must NOT be recognized as base cohort");
}

// Verify that for CSE 221, filtering by retake shows ONLY the retake section (RE_A(3C))
const cse221Classes = routine.classes.filter(
  (c) => formatCourseCode(c.courseCode) === "CSE221"
);
const cse221OfferingsMap = new Map();
cse221Classes.forEach((c) => {
  const key = `${c.batch}:::${c.section}`;
  if (!cse221OfferingsMap.has(key)) cse221OfferingsMap.set(key, c);
});
const all221Keys = Array.from(cse221OfferingsMap.keys());
const retakeOnly221Keys = all221Keys.filter((k) => {
  const [b, s] = k.split(":::");
  return isDepartmentalRetake({ batch: b, section: s });
});
console.log(`✓ CSE 221 total offerings: ${all221Keys.length}, retake-only offerings: ${retakeOnly221Keys.length}`);
if (retakeOnly221Keys.length !== 1 || retakeOnly221Keys[0] !== "RE:::A") {
  throw new Error(`Expected exactly ['RE:::A'] for CSE 221 retake offerings, got: ${JSON.stringify(retakeOnly221Keys)}`);
}
console.log("  → When retake label is chosen, only retake section RE_A(3C) is shown (zero batch 69 regular sections).");
console.log("  → All retake rules verified successfully.");

// 3. Batch Disambiguation: CSE 221 has both (Batch 69, Sec A) and (Batch RE, Sec A)
const reSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "mixed",
  batch: "64",
  section: "none",
  courses: [
    { courseCode: "CSE 221", batch: "RE", section: "A" },
  ],
  saved_at: new Date().toISOString(),
};
const reResult = derivePersonalSchedule(routine, reSetup);
console.log(`✓ CSE 221 (Batch RE, Sec A) meetings: ${reResult.items.length}`);
if (reResult.items.length === 0) throw new Error("Expected CSE 221 RE offerings");
for (const item of reResult.items) {
  if (item.batch !== "RE") {
    throw new Error(`Expected only batch RE, got batch ${item.batch}`);
  }
  if (!item.isRetake) {
    throw new Error("Batch RE offering must be marked isRetake: true");
  }
  if (item.origin !== "retake") {
    throw new Error("Batch RE offering must have origin: 'retake'");
  }
  if (item.courseCode !== "CSE221") {
    throw new Error(`Expected clean courseCode CSE221, got ${item.courseCode}`);
  }
  if (item.section !== "RE_A(3C)") {
    throw new Error(`Expected retake section mentioned with credit RE_A(3C), got ${item.section}`);
  }
}
console.log("  → Correctly selected Batch RE with RE_A(3C) credit mention and CSE221 clean formatting!");

// 4. Added Course Overrides Base Batch Course
// Batch 64_D originally has CSE 438. Let's override it with Section A of Batch 64.
const overrideSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "mixed",
  batch: "64",
  section: "D",
  courses: [
    { courseCode: "CSE 438", batch: "64", section: "A", isRetake: false },
    { courseCode: "CSE 221", batch: "RE", section: "A" }, // Plus extra retake course
  ],
  saved_at: new Date().toISOString(),
};
const overrideResult = derivePersonalSchedule(routine, overrideSetup);
console.log(`✓ Override setup derived items: ${overrideResult.items.length}`);

// Verify CSE 438 in schedule is Section A, NOT Section D
const cse438Items = overrideResult.items.filter((i) => i.courseCode.includes("438"));
if (cse438Items.length === 0) throw new Error("Expected CSE 438 in schedule");
for (const item of cse438Items) {
  if (item.section !== "A") {
    throw new Error(`Expected overridden section A for CSE 438, got ${item.section}`);
  }
}
console.log("  → CSE 438 base offering properly overridden by selected offering!");

// Verify CSE 221 retake actually appears in schedule
const cse221Items = overrideResult.items.filter((i) => i.courseCode.includes("221"));
if (cse221Items.length === 0) throw new Error("Expected added CSE 221 in resulting schedule");
if (!cse221Items.some((i) => i.isRetake)) {
  throw new Error("Expected added CSE 221 to have isRetake: true");
}
console.log("  → Added CSE 221 retake offering successfully present in resulting schedule!");

// 5. Unmatched Offering Detection (Does not silently match wrong class)
const nonExistentSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "mixed",
  batch: "64",
  section: "D",
  courses: [
    { courseCode: "CSE 999", batch: "99", section: "Z" },
  ],
  saved_at: new Date().toISOString(),
};
const unmatchedResult = derivePersonalSchedule(routine, nonExistentSetup);
console.log(`✓ Unmatched selections detected: ${unmatchedResult.unmatchedSelections.length}`);
if (unmatchedResult.unmatchedSelections.length !== 1) {
  throw new Error("Expected unmatched selection to be caught");
}
console.log(`  → Detected: ${unmatchedResult.unmatchedSelections[0]}`);

// 6. Overlap & Conflict Check
console.log("✓ Overlap test:", timesOverlap("10:00", "11:30", "11:00", "12:30") === true ? "PASS" : "FAIL");

// 8. Add by Batch Workflow: Everything in Added Courses
console.log("✓ Testing Add by Batch into Added Courses workflow:");
const batch64DCourses = getCoursesForBatchAndSection(routine, "64", "D");
console.log(`  → Batch 64_D extracted courses: ${batch64DCourses.map((c) => c.courseCode).join(", ")}`);
if (batch64DCourses.length !== 2) {
  throw new Error(`Expected 2 courses in Batch 64_D, got ${batch64DCourses.length}`);
}

// Student starts with batch courses in Added Courses list
let studentAddedCourses = [...batch64DCourses];

// Student drops/removes CSE438 from their Added Courses list
studentAddedCourses = studentAddedCourses.filter((c) => formatCourseCode(c.courseCode) !== "CSE438");
if (studentAddedCourses.length !== 1 || formatCourseCode(studentAddedCourses[0].courseCode) !== "CSE437") {
  throw new Error("Expected only CSE437 after removing CSE438");
}

// Student adds retake CSE221 (Batch RE, Sec A) to their Added Courses list
studentAddedCourses.push({
  courseCode: "CSE221",
  batch: "RE",
  section: "A",
  isRetake: true,
});

const unifiedSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "courses",
  batch: "64",
  section: "D",
  courses: studentAddedCourses,
  saved_at: new Date().toISOString(),
};

const unifiedResult = derivePersonalSchedule(routine, unifiedSetup);
console.log(`  → Unified schedule meetings derived: ${unifiedResult.items.length}`);

// Verify CSE437 is present
const has437 = unifiedResult.items.some((i) => i.courseCode === "CSE437");
if (!has437) throw new Error("Expected CSE437 in schedule");

// Verify dropped CSE438 is NOT present
const has438 = unifiedResult.items.some((i) => i.courseCode === "CSE438");
if (has438) throw new Error("Dropped CSE438 must NOT be in schedule");

// Verify added CSE221 retake IS present with credit mentioned
const cse221Retake = unifiedResult.items.filter((i) => i.courseCode === "CSE221");
if (cse221Retake.length === 0) throw new Error("Expected added CSE221 in schedule");
for (const item of cse221Retake) {
  if (!item.isRetake) throw new Error("CSE221 must be marked isRetake: true");
  if (item.batch !== "RE") throw new Error("CSE221 must be from Batch RE");
  if (item.section !== "RE_A(3C)") throw new Error(`Expected section RE_A(3C), got ${item.section}`);
}
console.log("  → Successfully verified Add by Batch, removal of course, and addition of retake in Added Courses list!");

// 6. Default None Verification for Batch and Section
console.log("✓ Testing default None batch and section configuration:");
if (DEFAULT_SETUP.batch !== "none") throw new Error(`Expected DEFAULT_SETUP.batch to be 'none', got '${DEFAULT_SETUP.batch}'`);
if (DEFAULT_SETUP.section !== "none") throw new Error(`Expected DEFAULT_SETUP.section to be 'none', got '${DEFAULT_SETUP.section}'`);
const defaultResult = derivePersonalSchedule(routine, DEFAULT_SETUP);
if (defaultResult.items.length !== 0) throw new Error(`Expected 0 items from empty default setup, got ${defaultResult.items.length}`);

// When courses are added to a None batch setup, courses derive properly without base batch classes
const noneWithCourses = {
  ...DEFAULT_SETUP,
  courses: [
    { courseCode: "CSE 221", batch: "RE", section: "A" }
  ]
};
const noneWithCoursesResult = derivePersonalSchedule(routine, noneWithCourses);
if (noneWithCoursesResult.items.length === 0) throw new Error("Expected courses to derive when batch is none");
for (const item of noneWithCoursesResult.items) {
  if (item.courseCode !== "CSE221") throw new Error(`Expected CSE221, got ${item.courseCode}`);
}
console.log("  → Verified default setup has batch and section 'none', producing 0 meetings initially and correctly deriving added courses!");

// 7. Teacher Schedule Change & Custom Overrides Verification
console.log("✓ Testing custom schedule override when teacher changes schedule:");
const classToOverride = baseResult.items[0];
const overrideClassId = classToOverride.id;
const customOverrideSetup = {
  ...baseSetup,
  customOverrides: {
    [overrideClassId]: {
      day: "Friday",
      startTime: "14:30",
      endTime: "16:00",
      room: "KT-CUSTOM",
      instructor: "TEACHER_NEW",
      isCustom: true,
    },
  },
};
const customScheduleResult = derivePersonalSchedule(routine, customOverrideSetup);
const overriddenItem = customScheduleResult.items.find((i) => i.id === overrideClassId);
if (!overriddenItem) throw new Error("Expected overridden item in schedule");
if (overriddenItem.day !== "Friday") throw new Error(`Expected day Friday, got ${overriddenItem.day}`);
if (overriddenItem.startTime !== "14:30") throw new Error(`Expected startTime 14:30, got ${overriddenItem.startTime}`);
if (overriddenItem.endTime !== "16:00") throw new Error(`Expected endTime 16:00, got ${overriddenItem.endTime}`);
if (overriddenItem.room !== "KT-CUSTOM") throw new Error(`Expected room KT-CUSTOM, got ${overriddenItem.room}`);
if (overriddenItem.instructor !== "TEACHER_NEW") throw new Error(`Expected instructor TEACHER_NEW, got ${overriddenItem.instructor}`);
if (overriddenItem.isCustom !== true) throw new Error("Expected overridden item to have isCustom: true");
if (overriddenItem.origin !== "custom") throw new Error("Expected overridden item to have origin: 'custom'");

// Ensure other non-overridden classes remain non-custom
const nonOverriddenItems = customScheduleResult.items.filter((i) => i.id !== overrideClassId);
for (const item of nonOverriddenItems) {
  if (item.isCustom === true) {
    throw new Error(`Non-overridden class ${item.courseCode} should NOT have isCustom: true`);
  }
}
console.log("  → Successfully verified that only student-edited schedule items are marked as custom!");

// 8. Multi-day course schedule editing (editing all meeting days of a course)
console.log("✓ Testing multi-day course schedule custom editing:");
const multiDaySetup = {
  ...baseSetup,
  customCourseSchedules: {
    "CSE437": [
      {
        day: "Wednesday",
        startTime: "09:00",
        endTime: "10:30",
        room: "KT-ROOM-1",
        instructor: "INS1",
        classType: "theory",
        isCustom: true,
      },
      {
        day: "Thursday",
        startTime: "11:00",
        endTime: "12:30",
        room: "KT-ROOM-2",
        instructor: "INS2",
        classType: "theory",
        isCustom: true,
      },
    ],
  },
};
const multiDayResult = derivePersonalSchedule(routine, multiDaySetup);
const cse437CustomItems = multiDayResult.items.filter((i) => i.courseCode.includes("437"));
if (cse437CustomItems.length !== 2) {
  throw new Error(`Expected exactly 2 customized meetings for CSE437, got ${cse437CustomItems.length}`);
}
for (const item of cse437CustomItems) {
  if (item.isCustom !== true) throw new Error("Expected all customized course meetings to have isCustom: true");
  if (item.origin !== "custom") throw new Error("Expected all customized course meetings to have origin: 'custom'");
}
const wedMeeting = cse437CustomItems.find((i) => i.day === "Wednesday");
const thuMeeting = cse437CustomItems.find((i) => i.day === "Thursday");
if (!wedMeeting || wedMeeting.startTime !== "09:00" || wedMeeting.room !== "KT-ROOM-1") {
  throw new Error("Wednesday meeting did not match customized parameters");
}
if (!thuMeeting || thuMeeting.startTime !== "11:00" || thuMeeting.room !== "KT-ROOM-2") {
  throw new Error("Thursday meeting did not match customized parameters");
}
console.log("  → Successfully verified multi-day custom course schedule with both Wednesday and Thursday meetings!");

// Cohort summary label format tests
function computeCohortLabel(items, setup) {
  const hasBatch = setup.batch && setup.batch !== "none";
  const hasSection = setup.section && setup.section !== "none";

  const customCourses = new Set(
    items.filter((item) => item.isCustom).map((item) => item.courseCode)
  );
  const customCount = customCourses.size;

  const retakeCourses = new Set(
    items
      .filter((item) => item.isRetake && !item.isCustom)
      .map((item) => item.courseCode)
  );
  const retakeCount = retakeCourses.size;

  const othersCourses = new Set(
    items
      .filter(
        (item) =>
          !item.isRetake &&
          !item.isCustom &&
          !isBaseCohortClass(item, setup.batch, setup.section)
      )
      .map((item) => item.courseCode)
  );
  const othersCount = othersCourses.size;

  let base = "Not Configured";
  if (hasBatch && hasSection) {
    base = `Batch ${setup.batch}_${setup.section}`;
  } else if (hasBatch) {
    base = `Batch ${setup.batch}`;
  } else if (setup.courses && setup.courses.length > 0) {
    base = `${setup.courses.length} course${setup.courses.length > 1 ? "s" : ""}`;
  }

  const tags = [];
  if (othersCount > 0) {
    tags.push(`+${othersCount} other${othersCount > 1 ? "s" : ""}`);
  }
  if (retakeCount > 0) {
    tags.push(`+${retakeCount} retake`);
  }
  if (customCount > 0) {
    tags.push(`+${customCount} custom`);
  }

  return tags.length > 0 ? `${base} (${tags.join(", ")})` : base;
}

const cohortTestSetup = { batch: "64", section: "D" };
const baseItems = [
  { courseCode: "CSE437", batch: "64", section: "D", isRetake: false, isCustom: false },
  { courseCode: "CSE438", batch: "64", section: "D1", isRetake: false, isCustom: false },
];
if (computeCohortLabel(baseItems, cohortTestSetup) !== "Batch 64_D") {
  throw new Error(`Expected Batch 64_D, got ${computeCohortLabel(baseItems, cohortTestSetup)}`);
}

const withOthersItems = [
  ...baseItems,
  { courseCode: "CSE111", batch: "69", section: "A", isRetake: false, isCustom: false },
  { courseCode: "CSE112", batch: "69", section: "B", isRetake: false, isCustom: false },
  { courseCode: "CSE113", batch: "70", section: "C", isRetake: false, isCustom: false },
];
if (computeCohortLabel(withOthersItems, cohortTestSetup) !== "Batch 64_D (+3 others)") {
  throw new Error(`Expected Batch 64_D (+3 others), got ${computeCohortLabel(withOthersItems, cohortTestSetup)}`);
}

const withOthersAndRetakeItems = [
  ...withOthersItems,
  { courseCode: "CSE221", batch: "RE", section: "RE_A(3C)", isRetake: true, isCustom: false },
  { courseCode: "CSE222", batch: "RE", section: "RE_B(1.5C)", isRetake: true, isCustom: false },
];
if (computeCohortLabel(withOthersAndRetakeItems, cohortTestSetup) !== "Batch 64_D (+3 others, +2 retake)") {
  throw new Error(`Expected Batch 64_D (+3 others, +2 retake), got ${computeCohortLabel(withOthersAndRetakeItems, cohortTestSetup)}`);
}

const withAllItems = [
  ...withOthersAndRetakeItems,
  { courseCode: "CSE999", batch: "64", section: "D", isRetake: false, isCustom: true },
];
if (computeCohortLabel(withAllItems, cohortTestSetup) !== "Batch 64_D (+3 others, +2 retake, +1 custom)") {
  throw new Error(`Expected Batch 64_D (+3 others, +2 retake, +1 custom), got ${computeCohortLabel(withAllItems, cohortTestSetup)}`);
}
console.log("  → Verified cohort label: 'Batch 64_D (+3 others)', 'Batch 64_D (+3 others, +2 retake)', and custom combinations!");

// Subsection Schedule & Conflict-Free Verification
console.log("✓ Testing student cohort schedule derivation and zero-conflict guarantee:");
const testCohorts = [
  { batch: "69", section: "A1" },
  { batch: "69", section: "A2" },
  { batch: "71", section: "B1" },
  { batch: "71", section: "B2" },
  { batch: "68", section: "C1" },
  { batch: "66", section: "F1" },
  { batch: "67", section: "K1" },
];

for (const { batch, section } of testCohorts) {
  const cohortRes = derivePersonalSchedule(routine, {
    schema_version: "1.0",
    semester_id: "2026-fall",
    mode: "mixed",
    batch,
    section,
    courses: [],
    saved_at: new Date().toISOString(),
  });
  if (cohortRes.items.length === 0) {
    throw new Error(`Expected classes for Batch ${batch}_${section}, got 0`);
  }
  if (cohortRes.conflicts.length > 0) {
    console.error(`Conflicts in ${batch}_${section}:`, cohortRes.conflicts);
    throw new Error(`Expected 0 conflicts for regular cohort Batch ${batch}_${section}, found ${cohortRes.conflicts.length}`);
  }
  console.log(`  → Batch ${batch}_${section}: ${cohortRes.items.length} classes, 0 conflicts verified.`);
}

// 10. Whole Section (No Partition) Verification
console.log("✓ Testing Whole Section (Section A, B, C) setup and lab division removal:");
const wholeSectionCourses = getCoursesForBatchAndSection(routine, "66", "A");
for (const c of wholeSectionCourses) {
  if (c.section !== "A") {
    throw new Error(`Expected whole section 'A' for all extracted courses, but ${c.courseCode} had section '${c.section}'`);
  }
}
console.log(`  → Batch 66 Section A extracted ${wholeSectionCourses.length} courses, all with whole section 'A' (no A1/A2 partition).`);

// Deriving schedule for Batch 66 Section A includes all 10 meetings (including both lab A1 and lab A2)
const wholeSectionRes = derivePersonalSchedule(routine, {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "courses",
  batch: "66",
  section: "A",
  courses: wholeSectionCourses,
  saved_at: new Date().toISOString(),
});
if (wholeSectionRes.items.length !== 10) {
  throw new Error(`Expected 10 total meetings for Batch 66 Section A (all lab partitions included), got ${wholeSectionRes.items.length}`);
}
const labMeetings = wholeSectionRes.items.filter((i) => i.courseCode.includes("324"));
if (labMeetings.length !== 2) {
  throw new Error(`Expected both lab meetings (A1 and A2) to be included in routine, got ${labMeetings.length}`);
}
console.log("  → Both lab sessions (A1 on Monday and A2 on Tuesday) are present in the whole section routine initially.");

// When teacher divides students into A1, student can remove the A2 meeting via customCourseSchedules
const customScheduleWithRemovedA2 = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "courses",
  batch: "66",
  section: "A",
  courses: wholeSectionCourses,
  customCourseSchedules: {
    "CSE324": [
      {
        day: "Monday",
        startTime: "11:30",
        endTime: "14:30",
        room: "G1-014",
        instructor: "TBA",
        classType: "lab",
        isCustom: true,
      },
    ],
  },
  saved_at: new Date().toISOString(),
};
const studentA1Res = derivePersonalSchedule(routine, customScheduleWithRemovedA2);
if (studentA1Res.items.length !== 9) {
  throw new Error(`Expected 9 meetings after student removes A2 session, got ${studentA1Res.items.length}`);
}
const studentLabMeetings = studentA1Res.items.filter((i) => i.courseCode.includes("324"));
if (studentLabMeetings.length !== 1 || studentLabMeetings[0].day !== "Monday") {
  throw new Error("Expected only Monday A1 lab session to remain in student's schedule");
}
console.log("  → Verified student can keep A1 and remove A2 from their routine when divided by teacher!");

// 10. Testing Routine Version Update & Customization Preservation / Reset Flow
console.log("✓ Testing Routine Version Update & Customization Preservation / Reset Flow:");
const setupWithOldVersion = {
  ...customScheduleWithRemovedA2,
  routine_version_seen: "V3.9",
};
const driftCheck = checkRoutineVersionDrift(setupWithOldVersion, routine);
if (!driftCheck.hasDrift) throw new Error("Expected drift when old version V3.9 != current version");
if (driftCheck.oldVersion !== "V3.9") throw new Error("Expected oldVersion V3.9");
if (driftCheck.newVersion !== routine.routine_version) throw new Error(`Expected newVersion ${routine.routine_version}`);
if (!driftCheck.hasCustomizations) throw new Error("Expected hasCustomizations to be true");
if (driftCheck.customCourseCount !== 1) throw new Error("Expected 1 customized course");

// Verify that when routine updates, student's custom schedule is preserved
const preservedDerived = derivePersonalSchedule(routine, setupWithOldVersion);
if (preservedDerived.items.length !== 9) {
  throw new Error(`Expected customizations to be preserved across version update, got ${preservedDerived.items.length}`);
}

// Verify that resetting customizations returns to full official routine (10 meetings for Batch 66 Sec A)
const resetSetup = {
  ...setupWithOldVersion,
  customCourseSchedules: {},
  customOverrides: {},
  routine_version_seen: routine.routine_version,
};
const resetDerived = derivePersonalSchedule(routine, resetSetup);
if (resetDerived.items.length !== 10) {
  throw new Error(`Expected reset to return to 10 official meetings, got ${resetDerived.items.length}`);
}
const resetDrift = checkRoutineVersionDrift(resetSetup, routine);
if (resetDrift.hasDrift) throw new Error("Expected no drift after acknowledging new version");
if (resetDrift.hasCustomizations) throw new Error("Expected no customizations after reset");
console.log("  → Verified routine drift detection, custom schedule preservation across versions, and clean 1-click reset to official routine!");

// Verify teacher extraction and avatar initial derivation
console.log("✓ Testing teacher aggregation and avatar initial derivation:");
if (getTeacherAvatarInitial("MHN") !== "M") throw new Error("Expected M for MHN");
if (getTeacherAvatarInitial("AKC") !== "A") throw new Error("Expected A for AKC");
if (getTeacherAvatarInitial("DMAT") !== "D") throw new Error("Expected D for DMAT");
if (getTeacherAvatarInitial("AS") !== "AS") throw new Error("Expected AS for AS");
if (getTeacherAvatarInitial("M") !== "M") throw new Error("Expected M for M");
if (getTeacherAvatarInitial("NT-1") !== "N") throw new Error("Expected N for NT-1");
if (getTeacherAvatarInitial("EEE_1") !== "E") throw new Error("Expected E for EEE_1");
if (getTeacherAvatarInitial("") !== "?") throw new Error("Expected ? for empty string");

// Test extractTeachersFromSchedule with mock items
const mockItems = [
  { courseCode: "CSE 113", instructor: "MHN" },
  { courseCode: "CSE 113", instructor: "MHN" },
  { courseCode: "CSE 114", instructor: "MHN" },
  { courseCode: "CSE 114", instructor: "MHN" },
  { courseCode: "MAT 102", instructor: "AKC" },
  { courseCode: "MAT 102", instructor: "AKC" },
  { courseCode: "PHY 101", instructor: "DMAT" },
  { courseCode: "ENG 102", instructor: "SMH" },
  { courseCode: "GEN 100", instructor: "TBA" },
  { courseCode: "GEN 101", instructor: "-" },
  { courseCode: "CSE 300", instructor: "MUM / MSK" },
  { courseCode: "CSE 311", instructor: "TAA + RBA" },
  { courseCode: "CSE 312", instructor: "KMA, NSH & ZAH" },
];
const extracted = extractTeachersFromSchedule(mockItems);
const teacherMap = new Map(extracted.map((t) => [t.initials, t]));

if (teacherMap.has("TBA") || teacherMap.has("-")) {
  throw new Error("Expected TBA and - to be filtered out");
}
if (!teacherMap.has("MHN") || !teacherMap.has("AKC") || !teacherMap.has("DMAT") || !teacherMap.has("SMH")) {
  throw new Error("Expected MHN, AKC, DMAT, and SMH to be extracted");
}
const mhn = teacherMap.get("MHN");
if (mhn.avatarInitial !== "M") throw new Error(`Expected avatarInitial M for MHN, got ${mhn.avatarInitial}`);
if (mhn.classCount !== 4) throw new Error(`Expected classCount 4 for MHN, got ${mhn.classCount}`);
if (mhn.courses.length !== 2 || !mhn.courses.includes("CSE113") || !mhn.courses.includes("CSE114")) {
  throw new Error("Expected courses [CSE113, CSE114] for MHN");
}
if (!teacherMap.has("MUM") || !teacherMap.has("MSK")) {
  throw new Error("Expected multi-instructor slot to split into MUM and MSK");
}
if (!teacherMap.has("TAA") || !teacherMap.has("RBA")) {
  throw new Error("Expected plus-separated instructors (TAA + RBA) to split into TAA and RBA");
}
if (!teacherMap.has("KMA") || !teacherMap.has("NSH") || !teacherMap.has("ZAH")) {
  throw new Error("Expected comma and ampersand separated instructors to split into KMA, NSH, and ZAH");
}
console.log("  → Verified avatar initials, class counts, course assignments, multi-instructor splitting (+, /, &, ,), and TBA filtering successfully!");

console.log("=== ALL SCHEDULE LOGIC & SEARCH-AND-ADD CHECKS PASSED ===");


