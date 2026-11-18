import {
  StudentSetup,
  SetupMode,
  StudentCourseSelection,
  ClassCustomOverride,
  CustomClassMeeting,
  DayOfWeek,
} from "@/types/routine";
import { validateSetupSchema } from "@/lib/storage/setupStore";
import { formatBatchSectionBadge } from "./schedule";

export interface CompactSharePayload {
  v: 1;
  m: SetupMode;
  b?: string;
  s?: string;
  c?: [string, string, string | undefined, number | undefined, string | undefined][];
  o?: [string, string | undefined, string | undefined][];
  cs?: [string, string, string, string, string, string][];
}

/**
 * Base64URL string encoding with full UTF-8 Unicode support.
 */
export function encodeBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64url");
  }
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Base64URL string decoding with full UTF-8 Unicode support.
 */
export function decodeBase64Url(base64url: string): string {
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(base64url.length + (4 - (base64url.length % 4)) % 4, "=");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Converts a StudentSetup into a shareable URL.
 * Automatically chooses human-readable `#s=66_D` for standard cohorts,
 * or compact `#share=...` for custom/retake/override setups.
 */
export function generateShareUrl(setup: StudentSetup, origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://routinekit.vercel.app");

  // Check if setup is a pure batch-section with standard courses only (no retakes, no custom overrides)
  const isStandardBatch =
    setup.mode === "batch-section" &&
    Boolean(setup.batch && setup.batch !== "none") &&
    Boolean(setup.section && setup.section !== "none") &&
    (!setup.courses || setup.courses.every((c) => !c.isRetake && c.batch === setup.batch)) &&
    (!setup.customOverrides || Object.keys(setup.customOverrides).length === 0) &&
    (!setup.customCourseSchedules || Object.keys(setup.customCourseSchedules).length === 0);

  if (isStandardBatch) {
    const code = `${setup.batch}_${setup.section}`;
    return `${base}/#s=${encodeURIComponent(code)}`;
  }

  // Build compact payload for custom / mixed / retake setups
  const payload: CompactSharePayload = {
    v: 1,
    m: setup.mode,
    b: setup.batch && setup.batch !== "none" ? setup.batch : undefined,
    s: setup.section && setup.section !== "none" ? setup.section : undefined,
  };

  if (setup.courses && setup.courses.length > 0) {
    payload.c = setup.courses.map((c) => [
      c.courseCode,
      c.section,
      c.batch,
      c.isRetake ? 1 : undefined,
      c.customLabel,
    ]);
  }

  if (setup.customOverrides && Object.keys(setup.customOverrides).length > 0) {
    payload.o = Object.entries(setup.customOverrides)
      .filter(([, v]) => v.isCustom)
      .map(([id, v]) => [id, v.room, v.instructor]);
  }

  if (setup.customCourseSchedules && Object.keys(setup.customCourseSchedules).length > 0) {
    const list: [string, string, string, string, string, string][] = [];
    for (const [code, meetings] of Object.entries(setup.customCourseSchedules)) {
      for (const m of meetings) {
        list.push([code, m.day, m.startTime, m.endTime, m.room || "", m.instructor || ""]);
      }
    }
    if (list.length > 0) {
      payload.cs = list;
    }
  }

  const encoded = encodeBase64Url(JSON.stringify(payload));
  return `${base}/#share=${encoded}`;
}

/**
 * Parses an incoming URL, query string, or hash fragment into a validated StudentSetup.
 * Returns null if the URL contains no share information or is invalid.
 */
export function parseShareUrl(rawUrlOrHash: string): { setup: StudentSetup; title: string } | null {
  if (!rawUrlOrHash) return null;

  try {
    let hash = "";
    let search = "";

    if (rawUrlOrHash.includes("#") || rawUrlOrHash.includes("?")) {
      const parsed = new URL(rawUrlOrHash, "https://routinekit.vercel.app");
      hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
      search = parsed.search.startsWith("?") ? parsed.search.slice(1) : parsed.search;
    } else {
      hash = rawUrlOrHash.startsWith("#") ? rawUrlOrHash.slice(1) : rawUrlOrHash;
    }

    const params = new URLSearchParams(hash.includes("=") ? hash : search);

    // 1. Check for standard cohort format (#s=66_D or ?s=66_D or #cohort=66_D)
    const sParam = params.get("s") || params.get("cohort");
    if (sParam && /^\d+_[A-Za-z0-9()]+$/.test(sParam)) {
      const [batch, section] = sParam.split("_");
      const cleanSection = section.replace(/^([A-Z])\d+$/, "$1");
      const setup: StudentSetup = {
        schema_version: "1.0",
        semester_id: "2026-fall",
        mode: "batch-section",
        batch,
        section: cleanSection,
        courses: [],
        saved_at: new Date().toISOString(),
      };
      return {
        setup,
        title: `Batch ${formatBatchSectionBadge({ batch, section: cleanSection })}`,
      };
    }

    // 2. Check for individual batch and section params (?b=66&s=D or ?batch=66&section=D)
    const bParam = params.get("b") || params.get("batch");
    const secParam = params.get("sec") || params.get("section") || (bParam ? params.get("s") : null);
    if (bParam && secParam) {
      const cleanSection = secParam.replace(/^([A-Z])\d+$/, "$1");
      const setup: StudentSetup = {
        schema_version: "1.0",
        semester_id: "2026-fall",
        mode: "batch-section",
        batch: bParam,
        section: cleanSection,
        courses: [],
        saved_at: new Date().toISOString(),
      };
      return {
        setup,
        title: `Batch ${formatBatchSectionBadge({ batch: bParam, section: cleanSection })}`,
      };
    }

    // 3. Check for compact encoded payload (#share=... or ?share=...)
    const shareParam = params.get("share");
    if (shareParam) {
      const jsonStr = decodeBase64Url(shareParam);
      const payload = JSON.parse(jsonStr) as CompactSharePayload;

      if (!payload || payload.v !== 1) return null;

      const courses: StudentCourseSelection[] = (payload.c || []).map((c) => ({
        courseCode: c[0],
        section: c[1],
        batch: c[2],
        isRetake: Boolean(c[3]),
        customLabel: c[4],
      }));

      const customOverrides: Record<string, ClassCustomOverride> = {};
      if (payload.o && payload.o.length > 0) {
        for (const [id, room, inst] of payload.o) {
          customOverrides[id] = {
            isCustom: true,
            room,
            instructor: inst,
          };
        }
      }

      const customCourseSchedules: Record<string, CustomClassMeeting[]> = {};
      if (payload.cs && payload.cs.length > 0) {
        for (const [code, day, st, et, rm, inst] of payload.cs) {
          if (!customCourseSchedules[code]) {
            customCourseSchedules[code] = [];
          }
          customCourseSchedules[code].push({
            day: day as DayOfWeek,
            startTime: st,
            endTime: et,
            room: rm,
            instructor: inst,
          });
        }
      }

      const candidateSetup: StudentSetup = {
        schema_version: "1.0",
        semester_id: "2026-fall",
        mode: payload.m,
        batch: payload.b || "none",
        section: payload.s || "none",
        courses,
        customOverrides: Object.keys(customOverrides).length > 0 ? customOverrides : undefined,
        customCourseSchedules:
          Object.keys(customCourseSchedules).length > 0 ? customCourseSchedules : undefined,
        saved_at: new Date().toISOString(),
      };

      const validated = validateSetupSchema(candidateSetup);
      if (!validated.isValid || !validated.setup) return null;

      let title = "Shared Schedule";
      if (validated.setup.batch && validated.setup.batch !== "none") {
        title = `Batch ${formatBatchSectionBadge({ batch: validated.setup.batch, section: validated.setup.section })}`;
        const retakeCount = courses.filter((c) => c.isRetake).length;
        if (retakeCount > 0) {
          title += ` (+${retakeCount} retake)`;
        }
      } else if (courses.length > 0) {
        title = `${courses.length} Shared Course${courses.length > 1 ? "s" : ""}`;
      }

      return {
        setup: validated.setup,
        title,
      };
    }
  } catch (err) {
    console.warn("Failed to parse share URL:", err);
  }

  return null;
}
