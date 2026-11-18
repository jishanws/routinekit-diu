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
import SharedScheduleBanner from "@/components/share/SharedScheduleBanner";
import { parseShareUrl } from "@/lib/routine/shareUrl";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const SetupModal = dynamic(() => import("@/components/setup/SetupModal"), { ssr: false });
const ImportExportModal = dynamic(() => import("@/components/setup/ImportExportModal"), { ssr: false });
const ExportModal = dynamic(() => import("@/components/export/ExportModal"), { ssr: false });
const ShareModal = dynamic(() => import("@/components/share/ShareModal"), { ssr: false });

export default function Home() {
  const [routine, setRoutine] = useState<PublishedRoutine | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [setup, setSetup] = useState<StudentSetup>(DEFAULT_SETUP);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPortabilityOpen, setIsPortabilityOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [incomingShared, setIncomingShared] = useState<{ setup: StudentSetup; title: string } | null>(null);
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

  // Check and handle incoming share links (hash #share=... or #s=... or query params)
  useEffect(() => {
    const handleCheckShare = () => {
      if (typeof window === "undefined") return;
      const parsed = parseShareUrl(window.location.href);
      if (!parsed) return;

      const currentSaved = loadSavedSetup();
      const isDefault =
        !currentSaved ||
        ((!currentSaved.batch || currentSaved.batch === "none") &&
          (!currentSaved.courses || currentSaved.courses.length === 0));

      if (isDefault) {
        // Automatically adopt if user had no previous routine setup
        let targetSetup = parsed.setup;
        if (
          routine &&
          targetSetup.mode === "batch-section" &&
          targetSetup.batch &&
          targetSetup.batch !== "none" &&
          targetSetup.section &&
          targetSetup.section !== "none" &&
          (!targetSetup.courses || targetSetup.courses.length === 0)
        ) {
          const batchCourses = getCoursesForBatchAndSection(
            routine,
            targetSetup.batch,
            targetSetup.section
          );
          if (batchCourses.length > 0) {
            targetSetup = { ...targetSetup, courses: batchCourses };
          }
        }
        setSetup(targetSetup);
        saveSetup(targetSetup);
        toast.success(`Loaded shared timetable: ${parsed.title}`);
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        // User has an existing routine: display preview banner with option to save or keep
        let previewSetup = parsed.setup;
        if (
          routine &&
          previewSetup.mode === "batch-section" &&
          previewSetup.batch &&
          previewSetup.batch !== "none" &&
          previewSetup.section &&
          previewSetup.section !== "none" &&
          (!previewSetup.courses || previewSetup.courses.length === 0)
        ) {
          const batchCourses = getCoursesForBatchAndSection(
            routine,
            previewSetup.batch,
            previewSetup.section
          );
          if (batchCourses.length > 0) {
            previewSetup = { ...previewSetup, courses: batchCourses };
          }
        }
        setIncomingShared({ setup: previewSetup, title: parsed.title });
      }
    };

    handleCheckShare();
    window.addEventListener("hashchange", handleCheckShare);
    return () => {
      window.removeEventListener("hashchange", handleCheckShare);
    };
  }, [routine]);

  const activeSetup = incomingShared ? incomingShared.setup : setup;

  const derivedSchedule = useMemo(() => {
    if (!routine) return { items: [], conflicts: [], unmatchedSelections: [] };
    return derivePersonalSchedule(routine, activeSetup);
  }, [routine, activeSetup]);

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
    return checkRoutineVersionDrift(activeSetup, routine);
  }, [routine, activeSetup]);

  const handleSaveSetup = (newSetup: StudentSetup) => {
    setSetup(newSetup);
    saveSetup(newSetup);
  };

  const handleApplyShared = () => {
    if (!incomingShared) return;
    setSetup(incomingShared.setup);
    saveSetup(incomingShared.setup);
    toast.success(`Saved shared timetable: ${incomingShared.title}`);
    setIncomingShared(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const handleDismissShared = () => {
    setIncomingShared(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
    const hasBatch = activeSetup.batch && activeSetup.batch !== "none";
    const hasSection = activeSetup.section && activeSetup.section !== "none";

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
            !isBaseCohortClass(item, activeSetup.batch, activeSetup.section)
        )
        .map((item) => item.courseCode)
    );
    const othersCnt = othersCourses.size;

    let base = "Not Configured";
    if (hasBatch && hasSection) {
      base = `Batch ${activeSetup.batch}_${activeSetup.section}`;
    } else if (hasBatch) {
      base = `Batch ${activeSetup.batch}`;
    } else if (activeSetup.courses.length > 0) {
      base = `${activeSetup.courses.length} course${activeSetup.courses.length > 1 ? "s" : ""}`;
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
  }, [derivedSchedule.items, activeSetup.batch, activeSetup.section, activeSetup.courses.length]);

  const cohortBreakdown = useMemo((): CohortBreakdown => {
    const hasBatch = activeSetup.batch && activeSetup.batch !== "none";
    const hasSection = activeSetup.section && activeSetup.section !== "none";

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
            !isBaseCohortClass(item, activeSetup.batch, activeSetup.section)
        )
        .map((item) => item.courseCode)
    );
    const othersCnt = othersCourses.size;

    let base = "Not Configured";
    if (hasBatch && hasSection) {
      base = `Batch ${activeSetup.batch} · ${activeSetup.section}`;
    } else if (hasBatch) {
      base = `Batch ${activeSetup.batch}`;
    } else if (activeSetup.courses.length > 0) {
      base = `${activeSetup.courses.length} Course${activeSetup.courses.length > 1 ? "s" : ""}`;
    }

    const totalCoursesCnt = new Set(derivedSchedule.items.map((i) => i.courseCode)).size;

    return {
      baseLabel: base,
      batch: activeSetup.batch && activeSetup.batch !== "none" ? activeSetup.batch : undefined,
      section: activeSetup.section && activeSetup.section !== "none" ? activeSetup.section : undefined,
      mode: activeSetup.mode,
      retakeCount: retakeCnt,
      othersCount: othersCnt,
      customCount: customCnt,
      conflictCount: derivedSchedule.conflicts.length,
      semesterLabel: routine?.semester_label,
      routineVersion: routine?.routine_version,
      totalCoursesCount: totalCoursesCnt || activeSetup.courses.length || 0,
      classesPerWeek: derivedSchedule.items.length,
      retakeCourses: Array.from(retakeCourses),
      customCourses: Array.from(customCourses),
      otherCourses: Array.from(othersCourses),
    };
  }, [
    derivedSchedule.items,
    derivedSchedule.conflicts.length,
    activeSetup.batch,
    activeSetup.section,
    activeSetup.mode,
    activeSetup.courses.length,
    routine?.semester_label,
    routine?.routine_version,
  ]);

  return (
    <AppShell
      onOpenSetup={() => setIsSetupOpen(true)}
      onOpenExport={() => setIsExportOpen(true)}
      onOpenShare={() => setIsShareOpen(true)}
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
        <div className="space-y-4">
          {/* Incoming Shared Routine Banner */}
          {incomingShared && (
            <SharedScheduleBanner
              sharedSetup={incomingShared.setup}
              title={incomingShared.title}
              onApply={handleApplyShared}
              onDismiss={handleDismissShared}
            />
          )}

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

          {isShareOpen && (
            <ShareModal
              setup={activeSetup}
              items={derivedSchedule.items}
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
            />
          )}

          {isExportOpen && (
            <ExportModal
              routine={routine}
              setup={activeSetup}
              items={derivedSchedule.items}
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              onOpenShare={() => setIsShareOpen(true)}
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
