"use client";

import { useEffect, useState, useMemo } from "react";
import {
  PublishedRoutine,
  StudentSetup,
  ClassCustomOverride,
  CustomClassMeeting,
  CohortBreakdown,
} from "@/types/routine";
import { fetchPublishedRoutine, fetchRoutineStatus, getCachedRoutine } from "@/lib/routine/loader";
import {
  derivePersonalSchedule,
  checkRoutineVersionDrift,
  getCoursesForBatchAndSection,
  isBaseCohortClass,
} from "@/lib/routine/schedule";
import { loadSavedSetup, saveSetup, DEFAULT_SETUP } from "@/lib/storage/setupStore";
import AppShell from "@/components/layout/AppShell";
import TimetableShell from "@/components/timetable/TimetableShell";
import VersionNoticeBanner from "@/components/setup/VersionNoticeBanner";
import dynamic from "next/dynamic";

const SetupModal = dynamic(() => import("@/components/setup/SetupModal"), { ssr: false });
const ImportExportModal = dynamic(() => import("@/components/setup/ImportExportModal"), { ssr: false });
const ExportModal = dynamic(() => import("@/components/export/ExportModal"), { ssr: false });

export default function Home() {
  const [routine, setRoutine] = useState<PublishedRoutine | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [setup, setSetup] = useState<StudentSetup>(DEFAULT_SETUP);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPortabilityOpen, setIsPortabilityOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Detect online/offline connectivity
    const updateOnlineStatus = () => {
      setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);
    };
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // 1. Instant Cache Hydration: If routine was cached, load immediately in 0ms!
    Promise.resolve().then(() => {
      if (!isMounted) return;
      const cachedRoutine = getCachedRoutine();
      const saved = loadSavedSetup();

      if (cachedRoutine) {
        setRoutine(cachedRoutine);
        setLoading(false);
        if (saved) {
          if (saved.section && saved.section !== "none" && !saved.section.startsWith("RE")) {
            saved.section = saved.section.replace(/^([A-Z])\d+$/, "$1");
          }
          if (saved.courses && saved.courses.length > 0) {
            saved.courses = saved.courses.map((c) => ({
              ...c,
              section:
                c.isRetake || c.section.startsWith("RE")
                  ? c.section
                  : c.section.replace(/^([A-Z])\d+$/, "$1"),
            }));
          }
          setSetup(saved);
        }
      }
    });

    // 2. Network verification / background refresh
    async function init() {
      const cachedRoutine = getCachedRoutine();
      try {
        if (!cachedRoutine && isMounted) {
          setLoading(true);
        }
        const routineData = await fetchPublishedRoutine();
        if (!isMounted) return;
        setRoutine(routineData);

        const currentSaved = loadSavedSetup();
        if (currentSaved) {
          // Normalize legacy partitioned sections (e.g. "A1" -> "A")
          if (currentSaved.section && currentSaved.section !== "none" && !currentSaved.section.startsWith("RE")) {
            currentSaved.section = currentSaved.section.replace(/^([A-Z])\d+$/, "$1");
          }
          if (currentSaved.courses && currentSaved.courses.length > 0) {
            currentSaved.courses = currentSaved.courses.map((c) => ({
              ...c,
              section:
                c.isRetake || c.section.startsWith("RE")
                  ? c.section
                  : c.section.replace(/^([A-Z])\d+$/, "$1"),
            }));
          }
          if (currentSaved.courses.length === 0 && currentSaved.batch && currentSaved.section && currentSaved.section !== "none") {
            const batchCourses = getCoursesForBatchAndSection(routineData, currentSaved.batch, currentSaved.section);
            if (batchCourses.length > 0) {
              currentSaved.courses = batchCourses;
              saveSetup(currentSaved);
            }
          }
          setSetup(currentSaved);
        } else {
          const initialBatchCourses =
            DEFAULT_SETUP.batch &&
            DEFAULT_SETUP.batch !== "none" &&
            DEFAULT_SETUP.section &&
            DEFAULT_SETUP.section !== "none"
              ? getCoursesForBatchAndSection(
                  routineData,
                  DEFAULT_SETUP.batch,
                  DEFAULT_SETUP.section
                )
              : [];
          const initial: StudentSetup = {
            ...DEFAULT_SETUP,
            courses: initialBatchCourses,
            semester_id: routineData.semester_id,
            routine_version_seen: routineData.routine_version,
          };
          setSetup(initial);
          saveSetup(initial);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (!cachedRoutine) {
          console.error("Initialization error:", err);
          setError(err instanceof Error ? err.message : "Failed to load routine data");
        } else {
          // Offline fallback active
          setIsOffline(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    init();

    return () => {
      isMounted = false;
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Periodic & focus check for routine updates published while the app is open
  useEffect(() => {
    let isCancelled = false;

    async function checkUpdate() {
      try {
        const status = await fetchRoutineStatus();
        if (isCancelled || !status.current_version) return;
        if (routine && routine.routine_version !== status.current_version) {
          const updatedRoutine = await fetchPublishedRoutine();
          if (!isCancelled) {
            setRoutine(updatedRoutine);
          }
        }
      } catch {
        // Silently skip on transient background check failure
      }
    }

    const intervalId = setInterval(checkUpdate, 5 * 60 * 1000);
    const handleFocus = () => {
      checkUpdate();
    };
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [routine]);

  const derivedSchedule = useMemo(() => {
    if (!routine) return { items: [], conflicts: [], unmatchedSelections: [] };
    return derivePersonalSchedule(routine, setup);
  }, [routine, setup]);

  const versionDrift = useMemo(() => {
    if (!routine) {
      return {
        hasDrift: false,
        oldVersion: undefined,
        newVersion: "",
        hasCustomizations: false,
        customCourseCount: 0,
      };
    }
    return checkRoutineVersionDrift(setup, routine);
  }, [routine, setup]);

  const handleSaveSetup = (newSetup: StudentSetup) => {
    setSetup(newSetup);
    saveSetup(newSetup);
  };

  const handleSaveOverride = (classId: string, override: ClassCustomOverride) => {
    const updatedOverrides = {
      ...(setup.customOverrides || {}),
      [classId]: override,
    };
    const newSetup: StudentSetup = {
      ...setup,
      customOverrides: updatedOverrides,
    };
    handleSaveSetup(newSetup);
  };

  const handleResetOverride = (classId: string) => {
    const updatedOverrides = { ...(setup.customOverrides || {}) };
    delete updatedOverrides[classId];
    const newSetup: StudentSetup = {
      ...setup,
      customOverrides: updatedOverrides,
    };
    handleSaveSetup(newSetup);
  };

  const handleSaveCourseSchedule = (
    courseCode: string,
    meetings: CustomClassMeeting[]
  ) => {
    const code = courseCode.replace(/\s+/g, "").toUpperCase();
    const updatedSchedules = {
      ...(setup.customCourseSchedules || {}),
      [code]: meetings,
    };
    const updatedOverrides = { ...(setup.customOverrides || {}) };
    Object.keys(updatedOverrides).forEach((id) => {
      if (id.startsWith(code) || id.includes(code)) {
        delete updatedOverrides[id];
      }
    });

    const newSetup: StudentSetup = {
      ...setup,
      customCourseSchedules: updatedSchedules,
      customOverrides: updatedOverrides,
    };
    handleSaveSetup(newSetup);
  };

  const handleResetCourseSchedule = (courseCode: string) => {
    const code = courseCode.replace(/\s+/g, "").toUpperCase();
    const updatedSchedules = { ...(setup.customCourseSchedules || {}) };
    delete updatedSchedules[code];

    const updatedOverrides = { ...(setup.customOverrides || {}) };
    Object.keys(updatedOverrides).forEach((id) => {
      if (id.startsWith(code) || id.includes(code)) {
        delete updatedOverrides[id];
      }
    });

    const newSetup: StudentSetup = {
      ...setup,
      customCourseSchedules: updatedSchedules,
      customOverrides: updatedOverrides,
    };
    handleSaveSetup(newSetup);
  };

  const handleAcknowledgeVersion = () => {
    if (!routine) return;
    const updated = { ...setup, routine_version_seen: routine.routine_version };
    setSetup(updated);
    saveSetup(updated);
  };

  const handleResetCustomizationsAndAcknowledge = () => {
    if (!routine) return;
    const updated: StudentSetup = {
      ...setup,
      customCourseSchedules: {},
      customOverrides: {},
      routine_version_seen: routine.routine_version,
    };
    handleSaveSetup(updated);
  };

  const cohortLabel = useMemo(() => {
    const hasBatch = setup.batch && setup.batch !== "none";
    const hasSection = setup.section && setup.section !== "none";

    // 1. Custom courses
    const customCourses = new Set(
      derivedSchedule.items.filter((item) => item.isCustom).map((item) => item.courseCode)
    );
    const customCnt = customCourses.size;

    // 2. Retake courses
    const retakeCourses = new Set(
      derivedSchedule.items
        .filter((item) => item.isRetake && !item.isCustom)
        .map((item) => item.courseCode)
    );
    const retakeCnt = retakeCourses.size;

    // 3. Other batch/section courses
    const othersCourses = new Set(
      derivedSchedule.items
        .filter(
          (item) =>
            !item.isRetake &&
            !item.isCustom &&
            !isBaseCohortClass(item, setup.batch, setup.section)
        )
        .map((item) => item.courseCode)
    );
    const othersCnt = othersCourses.size;

    let base = "Not Configured";
    if (hasBatch && hasSection) {
      base = `Batch ${setup.batch}_${setup.section}`;
    } else if (hasBatch) {
      base = `Batch ${setup.batch}`;
    } else if (setup.courses.length > 0) {
      base = `${setup.courses.length} course${setup.courses.length > 1 ? "s" : ""}`;
    }

    const tags: string[] = [];
    if (othersCnt > 0) {
      tags.push(`+${othersCnt} other${othersCnt > 1 ? "s" : ""}`);
    }
    if (retakeCnt > 0) {
      tags.push(`+${retakeCnt} retake`);
    }
    if (customCnt > 0) {
      tags.push(`+${customCnt} custom`);
    }

    return tags.length > 0 ? `${base} (${tags.join(", ")})` : base;
  }, [derivedSchedule.items, setup.batch, setup.section, setup.courses.length]);

  const cohortBreakdown = useMemo((): CohortBreakdown => {
    const hasBatch = setup.batch && setup.batch !== "none";
    const hasSection = setup.section && setup.section !== "none";

    // 1. Custom courses
    const customCourses = new Set(
      derivedSchedule.items.filter((item) => item.isCustom).map((item) => item.courseCode)
    );
    const customCnt = customCourses.size;

    // 2. Retake courses
    const retakeCourses = new Set(
      derivedSchedule.items
        .filter((item) => item.isRetake && !item.isCustom)
        .map((item) => item.courseCode)
    );
    const retakeCnt = retakeCourses.size;

    // 3. Other batch/section courses
    const othersCourses = new Set(
      derivedSchedule.items
        .filter(
          (item) =>
            !item.isRetake &&
            !item.isCustom &&
            !isBaseCohortClass(item, setup.batch, setup.section)
        )
        .map((item) => item.courseCode)
    );
    const othersCnt = othersCourses.size;

    let base = "Not Configured";
    if (hasBatch && hasSection) {
      base = `Batch ${setup.batch} · ${setup.section}`;
    } else if (hasBatch) {
      base = `Batch ${setup.batch}`;
    } else if (setup.courses.length > 0) {
      base = `${setup.courses.length} Course${setup.courses.length > 1 ? "s" : ""}`;
    }

    const totalCoursesCnt = new Set(derivedSchedule.items.map((i) => i.courseCode)).size;

    return {
      baseLabel: base,
      batch: setup.batch && setup.batch !== "none" ? setup.batch : undefined,
      section: setup.section && setup.section !== "none" ? setup.section : undefined,
      mode: setup.mode,
      retakeCount: retakeCnt,
      othersCount: othersCnt,
      customCount: customCnt,
      conflictCount: derivedSchedule.conflicts.length,
      semesterLabel: routine?.semester_label,
      routineVersion: routine?.routine_version,
      totalCoursesCount: totalCoursesCnt || setup.courses.length || 0,
      classesPerWeek: derivedSchedule.items.length,
      retakeCourses: Array.from(retakeCourses),
      customCourses: Array.from(customCourses),
      otherCourses: Array.from(othersCourses),
    };
  }, [
    derivedSchedule.items,
    derivedSchedule.conflicts.length,
    setup.batch,
    setup.section,
    setup.mode,
    setup.courses.length,
    routine?.semester_label,
    routine?.routine_version,
  ]);

  return (
    <AppShell
      onOpenSetup={() => setIsSetupOpen(true)}
      onOpenExport={() => setIsExportOpen(true)}
      routine={routine}
      versionDrift={versionDrift}
      onAcknowledgeVersion={handleAcknowledgeVersion}
      onResetCustomizations={handleResetCustomizationsAndAcknowledge}
      conflictsCount={derivedSchedule.conflicts.length}
      isOffline={isOffline}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--surface-border)] shadow-card">
          <div className="w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="font-semibold text-[var(--ink-primary)]">Loading RoutineKit...</h3>
          <p className="text-xs text-[var(--ink-muted)] mt-1 font-mono">Fetching verified DIU CSE timetable</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl text-center shadow-2xs">
          <p className="font-semibold text-[var(--ink-primary)]">Unable to load routine dataset</p>
          <p className="text-sm text-[var(--ink-secondary)] mt-1">{error}</p>
        </div>
      ) : routine ? (
        <div className="space-y-6">
          {/* Version Notice Banner if routine drift detected */}
          {versionDrift.hasDrift && (
            <VersionNoticeBanner
              oldVersion={versionDrift.oldVersion}
              newVersion={versionDrift.newVersion}
              hasCustomizations={versionDrift.hasCustomizations}
              customCourseCount={versionDrift.customCourseCount}
              onAcknowledge={handleAcknowledgeVersion}
              onResetCustomizations={handleResetCustomizationsAndAcknowledge}
            />
          )}

          {/* Unmatched Courses Warning if selections have no matches */}
          {derivedSchedule.unmatchedSelections.length > 0 && (
            <div className="p-3.5 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-2xl text-xs text-[var(--ink-secondary)] shadow-2xs">
              <span className="font-semibold text-[var(--ink-primary)]">Unverified course choices:</span>
              <p className="font-mono text-[11px] mt-0.5">
                The following selections had no matching classes in this routine: {derivedSchedule.unmatchedSelections.join(", ")}
              </p>
            </div>
          )}

          {/* Main Interactive Timetable (Day Agenda + Week Grid) */}
          <TimetableShell
            items={derivedSchedule.items}
            cohortLabel={cohortLabel}
            cohortBreakdown={cohortBreakdown}
            onOpenSetup={() => setIsSetupOpen(true)}
            onSaveOverride={handleSaveOverride}
            onResetOverride={handleResetOverride}
            onSaveCourseSchedule={handleSaveCourseSchedule}
            onResetCourseSchedule={handleResetCourseSchedule}
          />

          {/* Modals & Dialogs */}
          {isSetupOpen && (
            <SetupModal
              key={`${setup.saved_at || "setup"}_${setup.batch}_${setup.section}`}
              routine={routine}
              currentSetup={setup}
              isOpen={isSetupOpen}
              onClose={() => setIsSetupOpen(false)}
              onSave={handleSaveSetup}
            />
          )}

          {isExportOpen && (
            <ExportModal
              routine={routine}
              setup={setup}
              items={derivedSchedule.items}
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
            />
          )}

          {isPortabilityOpen && (
            <ImportExportModal
              currentSetup={setup}
              isOpen={isPortabilityOpen}
              onClose={() => setIsPortabilityOpen(false)}
              onImport={handleSaveSetup}
              onReset={() => setSetup(DEFAULT_SETUP)}
            />
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
