import { StudentSetup, SetupMode, StudentCourseSelection, ClassCustomOverride, CustomClassMeeting } from "@/types/routine";

const STORAGE_KEY = "routinekit_student_setup_v1";

export const DEFAULT_SETUP: StudentSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "courses",
  department: "CSE",
  batch: "none",
  section: "none",
  courses: [],
  saved_at: new Date().toISOString(),
  routine_version_seen: "V5.1",
};

export function validateSetupSchema(data: unknown): {
  isValid: boolean;
  errors: string[];
  setup?: StudentSetup;
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Setup configuration must be a valid JSON object."] };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.schema_version !== "string") {
    errors.push("Missing or invalid 'schema_version' (expected string like '1.0').");
  }

  if (typeof obj.semester_id !== "string") {
    errors.push("Missing or invalid 'semester_id' (expected string).");
  }

  const validModes: SetupMode[] = ["batch-section", "courses", "mixed"];
  if (!validModes.includes(obj.mode as SetupMode)) {
    errors.push(`Invalid 'mode' (expected one of: ${validModes.join(", ")}).`);
  }

  if (obj.courses && !Array.isArray(obj.courses)) {
    errors.push("'courses' field must be an array.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const sanitized: StudentSetup = {
    schema_version: String(obj.schema_version || "1.0"),
    semester_id: String(obj.semester_id || "2026-fall"),
    mode: obj.mode as SetupMode,
    batch: obj.batch ? String(obj.batch) : undefined,
    section: obj.section ? String(obj.section) : undefined,
    courses: Array.isArray(obj.courses)
      ? obj.courses
          .filter((c): c is StudentCourseSelection => typeof c === "object" && c !== null)
          .map((c) => ({
            courseCode: String(c.courseCode || ""),
            batch: c.batch ? String(c.batch) : undefined,
            section: String(c.section || ""),
            isRetake: Boolean(c.isRetake),
            creditOverride: typeof c.creditOverride === "number" ? c.creditOverride : undefined,
            customLabel: c.customLabel ? String(c.customLabel) : undefined,
          }))
      : [],
    customOverrides:
      obj.customOverrides && typeof obj.customOverrides === "object"
        ? (obj.customOverrides as Record<string, ClassCustomOverride>)
        : undefined,
    customCourseSchedules:
      obj.customCourseSchedules && typeof obj.customCourseSchedules === "object"
        ? (obj.customCourseSchedules as Record<string, CustomClassMeeting[]>)
        : undefined,
    saved_at: typeof obj.saved_at === "string" ? obj.saved_at : new Date().toISOString(),
    routine_version_seen: typeof obj.routine_version_seen === "string" ? obj.routine_version_seen : undefined,
  };

  return { isValid: true, errors: [], setup: sanitized };
}

export function loadSavedSetup(): StudentSetup | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { isValid, setup } = validateSetupSchema(parsed);
    return isValid && setup ? setup : null;
  } catch (err) {
    console.warn("Failed to read setup from localStorage:", err);
    return null;
  }
}

export function saveSetup(setup: StudentSetup): void {
  if (typeof window === "undefined") return;

  const toSave: StudentSetup = {
    ...setup,
    saved_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave, null, 2));
  } catch (err) {
    console.error("Failed to persist setup to localStorage:", err);
  }
}

export function forgetSetup(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to remove setup from localStorage:", err);
  }
}

export function exportSetupToFile(setup: StudentSetup): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(setup, null, 2));
  const downloadAnchor = document.createElement("a");
  const filename = `routinekit-setup-${setup.mode}-${setup.semester_id}.json`;

  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
