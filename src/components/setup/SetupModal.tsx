"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  PublishedRoutine,
  StudentSetup,
  StudentCourseSelection,
  RoutineClass,
  DayOfWeek,
  CustomClassMeeting,
} from "@/types/routine";
import {
  derivePersonalSchedule,
  isDepartmentalRetake,
  getCoursesForBatchAndSection,
  formatCourseCode,
  formatRetakeSection,
} from "@/lib/routine/schedule";
import { ACADEMIC_DAYS } from "@/lib/routine/calendarLayout";
import {
  XIcon,
  CheckIcon,
  RotateCcwIcon,
  SearchIcon,
  ChevronDownIcon,
  BookOpenIcon,
} from "@/components/ui/Icons";

function sortClassesByDayAndTime<T extends { day: DayOfWeek; startTime: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const dayA = ACADEMIC_DAYS.indexOf(a.day);
    const dayB = ACADEMIC_DAYS.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return a.startTime.localeCompare(b.startTime);
  });
}

interface SetupModalProps {
  routine: PublishedRoutine;
  currentSetup: StudentSetup;
  isOpen: boolean;
  onClose: () => void;
  onSave: (setup: StudentSetup) => void;
}

interface OfferingInfo {
  key: string; // `${batch}:::${section}`
  batch: string;
  section: string;
  scheduleSummary: string;
  isRetake: boolean;
  classes: RoutineClass[];
}

export default function SetupModal({
  routine,
  currentSetup,
  isOpen,
  onClose,
  onSave,
}: SetupModalProps) {
  // Department state (defaults to "CSE")
  const [department, setDepartment] = useState<string>(currentSetup.department || "CSE");

  // Base batch and section state (defaults to "none", always whole sections A, B, C)
  const [batch, setBatch] = useState<string>(currentSetup.batch || "none");
  const [section, setSection] = useState<string>(() => {
    const rawSec = currentSetup.section || "none";
    if (rawSec !== "none" && !rawSec.startsWith("RE_") && !rawSec.startsWith("RE")) {
      return rawSec.replace(/^([A-Z])\d+$/, "$1");
    }
    return rawSec;
  });

  // All courses: everything is in the added courses list
  const [courses, setCourses] = useState<StudentCourseSelection[]>(() => {
    if (currentSetup.courses && currentSetup.courses.length > 0) {
      return currentSetup.courses.map((c) => ({
        ...c,
        courseCode: formatCourseCode(c.courseCode),
        section:
          c.isRetake || c.section.startsWith("RE_") || c.section.startsWith("RE")
            ? c.section
            : c.section.replace(/^([A-Z])\d+$/, "$1"),
      }));
    }
    const initialBatch = currentSetup.batch || "none";
    const rawSection = currentSetup.section || "none";
    const initialSection =
      rawSection !== "none" && !rawSection.startsWith("RE_") && !rawSection.startsWith("RE")
        ? rawSection.replace(/^([A-Z])\d+$/, "$1")
        : rawSection;
    if (initialBatch === "none" || initialSection === "none") {
      return [];
    }
    return getCoursesForBatchAndSection(routine, initialBatch, initialSection);
  });

  // Course search & picker state
  const [searchQuery, setSearchQuery] = useState("");
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [selectedOfferingKey, setSelectedOfferingKey] = useState("");
  const [retakeOnlyFilter, setRetakeOnlyFilter] = useState(false);
  const [creditOverride, setCreditOverride] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"enrolled" | "search">("enrolled");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Custom schedule tracking per course
  const [customCourseSchedules, setCustomCourseSchedules] = useState<
    Record<string, CustomClassMeeting[]>
  >(() => currentSetup.customCourseSchedules || {});

  // Click outside listener for search combobox
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Distinct student batches
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    routine.classes.forEach((c) => {
      if (c.batch) {
        const b = c.batch.trim();
        const upper = b.toUpperCase();
        if (
          upper !== "GENERAL" &&
          upper !== "RE" &&
          !upper.startsWith("RE_") &&
          !upper.startsWith("RETAKE")
        ) {
          set.add(b);
        }
      }
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
      return a.localeCompare(b);
    });
  }, [routine]);

  // Distinct base sections for the selected batch (always whole sections: A, B, C, etc.)
  const availableSectionsForBatch = useMemo(() => {
    if (!batch || batch.toLowerCase() === "none") return [];
    const bUpper = batch.trim().toUpperCase();
    const batchClasses = routine.classes.filter(
      (c) => c.batch.trim().toUpperCase() === bUpper
    );

    const set = new Set<string>();
    batchClasses.forEach((c) => {
      if (c.section) {
        set.add(c.section.trim().toUpperCase());
      }
    });

    return Array.from(set).sort();
  }, [routine, batch]);

  // Distinct courses in the routine with courseCode
  const allCourses = useMemo(() => {
    const map = new Map<
      string,
      { code: string; hasRetake: boolean }
    >();
    routine.classes.forEach((c) => {
      const code = formatCourseCode(c.courseCode);
      const isDeptRetake = isDepartmentalRetake(c);
      if (!map.has(code)) {
        map.set(code, {
          code,
          hasRetake: isDeptRetake,
        });
      } else if (isDeptRetake) {
        map.get(code)!.hasRetake = true;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [routine]);

  // Filtered courses based on search query and retake-only toggle
  const filteredCourses = useMemo(() => {
    let list = allCourses;
    if (retakeOnlyFilter) {
      list = list.filter((c) => c.hasRetake);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c.code.toLowerCase().includes(q));
    }
    return list;
  }, [allCourses, retakeOnlyFilter, searchQuery]);

  // Distinct offerings for currently selected course
  const availableOfferingsForCourse = useMemo((): OfferingInfo[] => {
    if (!selectedCourseCode) return [];

    const cleanTargetCode = formatCourseCode(selectedCourseCode);
    const matching = routine.classes.filter(
      (c) => formatCourseCode(c.courseCode) === cleanTargetCode
    );

    const map = new Map<string, RoutineClass[]>();
    matching.forEach((c) => {
      const secLabel = c.section.trim().toUpperCase();
      const key = `${c.batch}:::${secLabel}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });

    const offerings: OfferingInfo[] = [];
    map.forEach((classes, key) => {
      const [offeringBatch, offeringSection] = key.split(":::");
      const isDeptRetake = isDepartmentalRetake({
        batch: offeringBatch,
        section: offeringSection,
      });
      const sortedClasses = sortClassesByDayAndTime(classes);

      const times = sortedClasses
        .map(
          (c) =>
            `${c.day.slice(0, 3)} ${c.startTime}-${c.endTime}${
              c.room ? ` (${c.room})` : ""
            }`
        )
        .join(", ");

      offerings.push({
        key,
        batch: offeringBatch,
        section: offeringSection,
        scheduleSummary: times,
        isRetake: isDeptRetake,
        classes: sortedClasses,
      });
    });

    if (retakeOnlyFilter) {
      const retakeOnly = offerings.filter((o) =>
        isDepartmentalRetake({ batch: o.batch, section: o.section })
      );
      retakeOnly.sort((a, b) => a.key.localeCompare(b.key));
      return retakeOnly;
    }

    offerings.sort((a, b) => {
      if (a.batch === batch && b.batch !== batch) return -1;
      if (b.batch === batch && a.batch !== batch) return 1;
      const aDept = isDepartmentalRetake({ batch: a.batch, section: a.section });
      const bDept = isDepartmentalRetake({ batch: b.batch, section: b.section });
      if (aDept && !bDept) return -1;
      if (!aDept && bDept) return 1;
      return a.key.localeCompare(b.key);
    });

    return offerings;
  }, [routine, selectedCourseCode, batch, retakeOnlyFilter]);

  const effectiveOfferingKey = useMemo(() => {
    if (!selectedCourseCode) return "";
    const isValid = availableOfferingsForCourse.some((o) => o.key === selectedOfferingKey);
    if (isValid) return selectedOfferingKey;
    if (availableOfferingsForCourse.length === 1) return availableOfferingsForCourse[0].key;
    if (availableOfferingsForCourse.length > 0 && retakeOnlyFilter) return availableOfferingsForCourse[0].key;
    const sameBatch = availableOfferingsForCourse.find((o) => o.batch === batch);
    if (sameBatch) return sameBatch.key;
    return availableOfferingsForCourse[0]?.key || "";
  }, [availableOfferingsForCourse, selectedOfferingKey, selectedCourseCode, batch, retakeOnlyFilter]);

  const handleBatchChange = (newBatch: string) => {
    setBatch(newBatch);
    if (newBatch === "none") {
      setSection("none");
      return;
    }
    const sections = Array.from(
      new Set(
        routine.classes
          .filter((c) => c.batch.toUpperCase() === newBatch.toUpperCase() && c.section)
          .map((c) => c.section)
      )
    ).sort();

    if (sections.length > 0) {
      const defaultSec = sections.includes(section) ? section : sections[0];
      setSection(defaultSec);
      const batchCourses = getCoursesForBatchAndSection(routine, newBatch, defaultSec);
      setCourses(batchCourses);
    } else {
      setSection("none");
    }
  };

  const handleSectionChange = (newSection: string) => {
    setSection(newSection);
    if (batch !== "none" && newSection !== "none") {
      const batchCourses = getCoursesForBatchAndSection(routine, batch, newSection);
      setCourses(batchCourses);
    }
  };

  const handleReset = () => {
    setDepartment("CSE");
    setBatch("none");
    setSection("none");
    setCourses([]);
    setSelectedCourseCode("");
    setSelectedOfferingKey("");
    setCreditOverride("");
    setSearchQuery("");
    setMobileTab("enrolled");
    setCustomCourseSchedules({});
  };

  const handleAddCourse = () => {
    const keyToUse = effectiveOfferingKey;
    if (!selectedCourseCode.trim() || !keyToUse.trim()) return;

    const [offeringBatch, offeringSection] = keyToUse.split(":::");
    const isDept = isDepartmentalRetake({ batch: offeringBatch, section: offeringSection });

    const newSelection: StudentCourseSelection = {
      courseCode: formatCourseCode(selectedCourseCode),
      section: offeringSection,
      batch: offeringBatch,
      isRetake: isDept,
      creditOverride: creditOverride.trim() ? parseFloat(creditOverride) : undefined,
    };

    const existingIdx = courses.findIndex(
      (c) => formatCourseCode(c.courseCode) === newSelection.courseCode
    );
    if (existingIdx >= 0) {
      const updated = [...courses];
      updated[existingIdx] = newSelection;
      setCourses(updated);
    } else {
      setCourses((prev) => [...prev, newSelection]);
    }

    setSelectedCourseCode("");
    setSelectedOfferingKey("");
    setCreditOverride("");
    setSearchQuery("");
    setMobileTab("enrolled");
    setIsCourseDropdownOpen(false);
  };

  const handleRemoveCourse = (index: number) => {
    const removedCourse = courses[index];
    setCourses((prev) => prev.filter((_, i) => i !== index));
    if (removedCourse) {
      const code = removedCourse.courseCode.replace(/\s+/g, "").toUpperCase();
      setCustomCourseSchedules((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    }
  };

  const draftSetup: StudentSetup = useMemo(() => {
    return {
      ...currentSetup,
      department,
      batch,
      section,
      courses,
      customCourseSchedules,
      customOverrides: currentSetup.customOverrides,
      semester_id: routine.semester_id,
      routine_version_seen: routine.routine_version,
      saved_at: new Date().toISOString(),
    };
  }, [currentSetup, department, batch, section, courses, customCourseSchedules, routine]);

  const previewSchedule = useMemo(() => {
    return derivePersonalSchedule(routine, draftSetup);
  }, [routine, draftSetup]);

  const handleSaveAndApply = () => {
    onSave(draftSetup);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/60 backdrop-blur-sm sm:backdrop-blur-xs overscroll-contain transition-opacity">
      <div className="bg-[var(--surface-card)] border-t sm:border border-[var(--surface-border)] rounded-t-[28px] sm:rounded-2xl w-full max-w-4xl h-[92dvh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250 text-[var(--ink-primary)]">
        
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-4 sm:px-7 py-2.5 sm:py-3.5 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--surface-card)] shrink-0">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-base sm:text-xl font-bold font-mono text-[var(--ink-primary)] tracking-tight">
              Academic Routine Setup
            </h2>
            <p className="text-xs text-[var(--ink-muted)] hidden sm:block">
              Configure your batch, search individual courses, or resolve time conflicts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-ground)] transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
            aria-label="Close"
          >
            <XIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Quick Batch Setup Bar (Pure Dropdowns Only) */}
        <div className="px-4 sm:px-7 py-2 sm:py-2.5 bg-[var(--surface-elevated)]/50 border-b border-[var(--surface-border)] flex items-center justify-between gap-1.5 sm:gap-2.5 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Department Select Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-[var(--brand-border)] rounded-xl text-xs font-mono font-semibold text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20 active:scale-95"
                  title="Select academic department"
                >
                  <span>{department}</span>
                  <ChevronDownIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--ink-muted)] shrink-0" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={6}
                  className="z-[70] min-w-[200px] bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 text-[var(--ink-primary)]"
                >
                  <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                    Academic Department
                  </DropdownMenu.Label>
                  <DropdownMenu.Item
                    onSelect={() => setDepartment("CSE")}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between cursor-pointer outline-hidden select-none transition-colors ${
                      department === "CSE"
                        ? "bg-[var(--brand-surface)] text-[var(--brand-primary)] font-bold"
                        : "hover:bg-[var(--surface-elevated)] text-[var(--ink-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>CSE</span>
                      <span className="text-[10px] font-sans text-[var(--ink-muted)]">
                        (Computer Science &amp; Engineering)
                      </span>
                    </div>
                    {department === "CSE" && (
                      <CheckIcon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    )}
                  </DropdownMenu.Item>

                  <div className="h-px bg-[var(--surface-border-subtle)] my-1" />

                  {[
                    { code: "SWE", label: "Software Engineering" },
                    { code: "EEE", label: "Electrical & Electronic" },
                    { code: "BBA", label: "Business Administration" },
                  ].map((dept) => (
                    <div
                      key={dept.code}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between opacity-50 cursor-not-allowed select-none text-[var(--ink-muted)]"
                      title={`${dept.label} routine coming soon`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{dept.code}</span>
                        <span className="text-[10px] font-sans truncate max-w-[100px]">
                          ({dept.label})
                        </span>
                      </div>
                      <span className="text-[9px] font-sans font-semibold px-1.5 py-0.2 rounded bg-[var(--surface-elevated)] text-[var(--ink-muted)] shrink-0">
                        Soon
                      </span>
                    </div>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Batch Select Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-[var(--brand-border)] rounded-xl text-xs font-mono font-semibold text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20 active:scale-95"
                >
                  <span>
                    {batch === "none" ? "Batch" : `Batch ${batch}`}
                  </span>
                  <ChevronDownIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--ink-muted)] shrink-0" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={6}
                  className="z-[70] min-w-[150px] max-h-60 overflow-y-auto bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 text-[var(--ink-primary)]"
                >
                  <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                    Select Batch
                  </DropdownMenu.Label>
                  <DropdownMenu.Item
                    onSelect={() => handleBatchChange("none")}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between cursor-pointer outline-hidden select-none transition-colors ${
                      batch === "none"
                        ? "bg-[var(--brand-surface)] text-[var(--brand-primary)] font-bold"
                        : "hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    <span>None</span>
                    {batch === "none" && (
                      <CheckIcon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    )}
                  </DropdownMenu.Item>
                  <div className="h-px bg-[var(--surface-border-subtle)] my-1" />
                  {availableBatches.map((b) => {
                    const isSelected = batch === b;
                    return (
                      <DropdownMenu.Item
                        key={b}
                        onSelect={() => handleBatchChange(b)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between cursor-pointer outline-hidden select-none transition-colors ${
                          isSelected
                            ? "bg-[var(--brand-surface)] text-[var(--brand-primary)] font-bold"
                            : "hover:bg-[var(--surface-elevated)] text-[var(--ink-primary)]"
                        }`}
                      >
                        <span>Batch {b}</span>
                        {isSelected && (
                          <CheckIcon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                        )}
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Section Select Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild disabled={batch === "none"}>
                <button
                  type="button"
                  disabled={batch === "none"}
                  className="inline-flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-[var(--brand-border)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-card)] disabled:hover:border-[var(--surface-border)] rounded-xl text-xs font-mono font-semibold text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20 active:scale-95"
                >
                  <span>
                    {section === "none" ? "Section" : `Sec ${section}`}
                  </span>
                  <ChevronDownIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--ink-muted)] shrink-0" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={6}
                  className="z-[70] min-w-[150px] max-h-60 overflow-y-auto bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 text-[var(--ink-primary)]"
                >
                  <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                    Sections (Batch {batch})
                  </DropdownMenu.Label>
                  <DropdownMenu.Item
                    onSelect={() => handleSectionChange("none")}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between cursor-pointer outline-hidden select-none transition-colors ${
                      section === "none"
                        ? "bg-[var(--brand-surface)] text-[var(--brand-primary)] font-bold"
                        : "hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    <span>None</span>
                    {section === "none" && (
                      <CheckIcon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    )}
                  </DropdownMenu.Item>
                  <div className="h-px bg-[var(--surface-border-subtle)] my-1" />
                  {availableSectionsForBatch.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-[var(--ink-muted)] italic font-mono">
                      No sections available
                    </div>
                  ) : (
                    availableSectionsForBatch.map((s) => {
                      const isSelected = section === s;
                      return (
                        <DropdownMenu.Item
                          key={s}
                          onSelect={() => handleSectionChange(s)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between cursor-pointer outline-hidden select-none transition-colors ${
                            isSelected
                              ? "bg-[var(--brand-surface)] text-[var(--brand-primary)] font-bold"
                              : "hover:bg-[var(--surface-elevated)] text-[var(--ink-primary)]"
                          }`}
                        >
                          <span>Section {s}</span>
                          {isSelected && (
                            <CheckIcon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                          )}
                        </DropdownMenu.Item>
                      );
                    })
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Reset All (Triggers confirmation dialog) */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs font-mono font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs active:scale-95 shrink-0"
            title="Reset batch, section, and all added courses"
          >
            <RotateCcwIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)]" />
            <span className="hidden sm:inline">Reset All</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>

        {/* Main Single Page Content */}
        <div className="px-4 sm:px-7 py-3 sm:py-4 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
          {/* Unverified Course Choices Alert if any */}
          {previewSchedule.unmatchedSelections.length > 0 && (
            <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-2xl text-xs text-[var(--ink-primary)] space-y-1 shadow-2xs">
              <span className="font-semibold block">
                Unverified selections (no matching offerings in current routine):
              </span>
              <p className="font-mono text-[11px] text-[var(--ink-secondary)]">
                {previewSchedule.unmatchedSelections.join(", ")}
              </p>
            </div>
          )}

          {/* Mobile View Toggle: Enrolled Courses vs Search & Add */}
          <div className="lg:hidden p-1 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl flex items-center text-xs font-semibold shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("enrolled")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileTab === "enrolled"
                  ? "bg-[var(--surface-card)] text-[var(--ink-primary)] font-bold shadow-xs"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <span>Enrolled Courses</span>
              <span className="px-1.5 py-0.2 rounded-md bg-[var(--surface-elevated)] text-[10px] font-mono">
                {courses.length}
              </span>
              {previewSchedule.conflicts.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)] shrink-0" title="Overlaps present" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("search")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileTab === "search"
                  ? "bg-[var(--surface-card)] text-[var(--ink-primary)] font-bold shadow-xs"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <span>+ Add Course</span>
            </button>
          </div>

          {/* Interactive Course Finder & Enrolled Courses Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              
              {/* Left Column: Course Search & Offering Card Selector */}
              <div className={`p-0 lg:p-5 bg-transparent lg:bg-[var(--surface-ground)]/40 rounded-2xl lg:border border-[var(--surface-border)] flex flex-col lg:h-[490px] ${
                mobileTab === "search" ? "flex" : "hidden lg:flex"
              }`}>
                
                {/* Header with Retake toggle */}
                <div className="flex items-center justify-between border-b border-[var(--surface-border-subtle)] pb-2.5 lg:pb-3 shrink-0">
                  <div className="space-y-0.5 hidden lg:block">
                    <span className="text-xs font-mono font-bold text-[var(--ink-primary)] uppercase tracking-wide">
                      Search &amp; Add Course
                    </span>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      Type course code, pick section offering
                    </p>
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-[var(--ink-muted)] lg:hidden">
                    {selectedCourseCode ? "Selected Course" : "Search Course"}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setRetakeOnlyFilter(!retakeOnlyFilter)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all border cursor-pointer active:scale-95 shadow-2xs ${
                      retakeOnlyFilter
                        ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-slate-900 dark:border-zinc-100 font-bold"
                        : "bg-[var(--surface-card)] text-[var(--ink-secondary)] border-[var(--surface-border)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        retakeOnlyFilter
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-[var(--ink-faint)]"
                      }`}
                    />
                    <span>Retake only</span>
                  </button>
                </div>

                {/* Course Search or Selected Course Display */}
                <div className="pt-2.5 lg:pt-3 space-y-1.5 shrink-0">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)] hidden lg:block">
                    Course Code
                  </label>
                  
                  {selectedCourseCode ? (
                    <div className="p-2.5 sm:p-3 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[var(--ink-primary)]">
                            {selectedCourseCode}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourseCode("");
                          setSelectedOfferingKey("");
                          setSearchQuery("");
                          setIsCourseDropdownOpen(false);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div ref={searchContainerRef} className="relative">
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[var(--ink-muted)] pointer-events-none">
                          <SearchIcon className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder={
                            retakeOnlyFilter
                              ? "Search retake course (e.g. CSE221)..."
                              : "Search code or title (e.g. CSE311, Algorithms)..."
                          }
                          value={searchQuery}
                          onFocus={() => setIsCourseDropdownOpen(true)}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsCourseDropdownOpen(true);
                            if (!e.target.value.trim()) {
                              setSelectedCourseCode("");
                              setSelectedOfferingKey("");
                            }
                          }}
                          className="w-full pl-9 pr-9 py-2.5 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl text-base sm:text-xs text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--brand-primary)] placeholder:text-[var(--ink-faint)] transition-all shadow-2xs"
                        />
                        {searchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedCourseCode("");
                              setSelectedOfferingKey("");
                              setIsCourseDropdownOpen(false);
                            }}
                            className="absolute right-2.5 p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                            aria-label="Clear search"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Options */}
                      {isCourseDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl shadow-xl divide-y divide-[var(--surface-border-subtle)] text-xs animate-in fade-in slide-in-from-top-1 duration-100">
                          {filteredCourses.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[var(--ink-muted)]">
                              No matching courses found
                            </div>
                          ) : (
                            filteredCourses.slice(0, 35).map((c) => (
                              <div
                                key={c.code}
                                onClick={() => {
                                  setSelectedCourseCode(c.code);
                                  setSearchQuery(c.code);
                                  setSelectedOfferingKey("");
                                  setIsCourseDropdownOpen(false);
                                }}
                                className={`px-3.5 py-2.5 cursor-pointer flex justify-between items-center transition-colors ${
                                  selectedCourseCode === c.code
                                    ? "bg-[var(--brand-surface)] text-[var(--brand-primary)] font-semibold"
                                    : "hover:bg-[var(--surface-elevated)] text-[var(--ink-primary)]"
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold font-mono text-[var(--brand-primary)]">
                                      {c.code}
                                    </span>
                                  </div>
                                </div>
                                {selectedCourseCode === c.code && (
                                  <span className="text-xs font-bold text-[var(--brand-primary)] ml-2">✓</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section & Offering Cards */}
                {selectedCourseCode ? (
                  <div className="pt-2.5 lg:pt-3 border-t border-[var(--surface-border-subtle)] flex-1 min-h-0 flex flex-col space-y-2">
                    <div className="flex items-center justify-between shrink-0">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)] block">
                        Available Sections
                      </label>
                      <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                        {availableOfferingsForCourse.length} available
                      </span>
                    </div>

                    {availableOfferingsForCourse.length === 0 ? (
                      <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-[var(--status-conflict-surface)] border border-[var(--status-conflict-border)] rounded-xl text-xs text-[var(--status-conflict)] text-center font-mono">
                        No offerings found in current routine for {selectedCourseCode}.
                      </div>
                    ) : (
                      <div className="space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-0 lg:pr-1">
                        {availableOfferingsForCourse.map((off) => {
                          const isDept = Boolean(
                            off.isRetake ||
                            isDepartmentalRetake({ batch: off.batch, section: off.section }) ||
                            off.section.toUpperCase().startsWith("RE") ||
                            off.batch?.toUpperCase() === "RE"
                          );
                          const isCardSelected = (selectedOfferingKey || effectiveOfferingKey) === off.key;
                          const formattedBadge = isDept
                            ? formatRetakeSection(
                                off.batch?.toUpperCase() === "RE" || off.section.toUpperCase().startsWith("RE")
                                  ? off.batch || "RE"
                                  : "RE",
                                off.section,
                                off.classes[0]?.classType
                              )
                            : off.batch && off.batch !== "none"
                            ? `${off.batch}_${off.section}`
                            : `Sec ${off.section}`;

                          return (
                            <div
                              key={off.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedOfferingKey(off.key)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                isCardSelected
                                  ? "border-[var(--brand-primary)] bg-[var(--surface-elevated)]/80 ring-1 ring-[var(--brand-primary)]/20 shadow-xs"
                                  : "border-[var(--surface-border-subtle)] bg-[var(--surface-card)] hover:border-[var(--brand-border)] hover:bg-[var(--surface-elevated)]/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                                      isCardSelected
                                        ? "bg-[var(--brand-primary)] text-[var(--surface-card)]"
                                        : "bg-[var(--surface-elevated)] text-[var(--ink-primary)] border border-[var(--surface-border)]"
                                    }`}
                                  >
                                    {formattedBadge}
                                  </span>
                                </div>

                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                    isCardSelected
                                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--surface-card)]"
                                      : "border-[var(--surface-border)] bg-transparent"
                                  }`}
                                >
                                  {isCardSelected && (
                                    <CheckIcon className="w-3 h-3 stroke-[3]" />
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {off.classes.map((cls, ci) => {
                                  const hasTeacher = Boolean(
                                    cls.instructor &&
                                    cls.instructor.trim() !== "" &&
                                    cls.instructor !== "-" &&
                                    cls.instructor.toUpperCase() !== "TBA"
                                  );

                                  return (
                                    <div
                                      key={ci}
                                      className="text-xs font-mono px-2 py-1 rounded-md bg-[var(--surface-card)] border border-[var(--surface-border-subtle)] text-[var(--ink-secondary)] inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                    >
                                      <span className="font-bold text-[var(--ink-primary)]">
                                        {cls.day.slice(0, 3)}
                                      </span>
                                      <span className="tabular-nums">{cls.startTime}–{cls.endTime}</span>
                                      {cls.subsection && cls.subsection !== off.section && (
                                        <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--surface-elevated)] text-[var(--ink-secondary)] font-semibold border border-[var(--surface-border-subtle)]">
                                          {cls.subsection}
                                        </span>
                                      )}
                                      {cls.room && (
                                        <span className="text-[var(--ink-muted)] font-normal">· {cls.room}</span>
                                      )}
                                      {hasTeacher && (
                                        <span className="text-[var(--ink-primary)] font-semibold">
                                          · {cls.instructor.trim()}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--surface-card)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-muted)] shadow-2xs">
                      <SearchIcon className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <div className="space-y-1 max-w-[240px]">
                      <p className="text-xs font-semibold text-[var(--ink-primary)]">
                        Search courses to add
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                        Type a course code or title above to select section offerings.
                      </p>
                    </div>
                  </div>
                )}

                {/* Add Action Button */}
                {selectedCourseCode && availableOfferingsForCourse.length > 0 && (
                  <div className="sticky bottom-0 pt-2 pb-0.5 bg-[var(--surface-card)] lg:bg-transparent lg:static shrink-0 mt-2">
                    <button
                      type="button"
                      onClick={handleAddCourse}
                      disabled={!selectedCourseCode.trim() || !effectiveOfferingKey.trim()}
                      className="w-full py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs sm:text-sm font-semibold rounded-xl disabled:opacity-40 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>+ Add Course to Schedule</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Enrolled Courses List Card */}
              <div className={`p-0 lg:p-5 bg-transparent lg:bg-[var(--surface-ground)]/40 rounded-2xl lg:border border-[var(--surface-border)] flex flex-col lg:h-[490px] ${
                mobileTab === "enrolled" ? "flex" : "hidden lg:flex"
              }`}>
                <div className="hidden lg:flex items-center justify-between border-b border-[var(--surface-border-subtle)] pb-3 shrink-0">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-[var(--ink-primary)] uppercase tracking-wide">
                      Enrolled Courses
                    </span>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      Included in your personal timetable
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-lg bg-[var(--surface-card)] text-[var(--ink-secondary)] border border-[var(--surface-border)]">
                    {courses.length} course{courses.length === 1 ? "" : "s"}
                  </span>
                </div>

                {courses.length === 0 ? (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--surface-card)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-muted)] shadow-2xs">
                      <BookOpenIcon className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <div className="space-y-1 max-w-[240px]">
                      <p className="text-xs font-semibold text-[var(--ink-primary)]">
                        No courses enrolled yet
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                        Select your batch and section above, or search and pick courses in the Add tab.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 lg:mt-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-0 lg:pr-0.5">
                    {courses.map((c, idx) => {
                      const isOfferingRetake = Boolean(
                        c.isRetake ||
                        isDepartmentalRetake({ batch: c.batch, section: c.section }) ||
                        c.section.toUpperCase().startsWith("RE") ||
                        c.batch?.toUpperCase() === "RE"
                      );

                      const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();
                      const courseKey = norm(c.courseCode);
                      const hasCustomSchedule = Boolean(
                        (customCourseSchedules[courseKey] && customCourseSchedules[courseKey].length > 0) ||
                        Object.keys(currentSetup.customOverrides || {}).some((k) => k.startsWith(courseKey))
                      );

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-[var(--brand-border)] transition-all shadow-2xs group"
                        >
                          {/* Course Code, Batch & Section in a Styled Manner */}
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="font-mono font-bold text-sm text-[var(--ink-primary)] tracking-tight">
                              {formatCourseCode(c.courseCode)}
                            </span>

                            {/* Batch & Section Badge as used in routing */}
                            <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--ink-primary)] border border-[var(--surface-border)]">
                              {isOfferingRetake
                                ? formatRetakeSection(
                                    c.batch?.toUpperCase() === "RE" || c.section.toUpperCase().startsWith("RE")
                                      ? c.batch || "RE"
                                      : "RE",
                                    c.section,
                                    c.creditOverride || 3
                                  )
                                : c.batch && c.batch !== "none"
                                ? `${c.batch}_${c.section}`
                                : `Sec ${c.section}`}
                            </span>

                            {/* Custom Tag */}
                            {hasCustomSchedule && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)] uppercase tracking-wider">
                                Custom
                              </span>
                            )}
                          </div>

                          {/* Remove Course Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveCourse(idx)}
                            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-xs text-[var(--ink-muted)] hover:text-[var(--status-conflict)] hover:bg-[var(--status-conflict-surface)] rounded-lg transition-all cursor-pointer border border-transparent hover:border-[var(--status-conflict-border)] active:scale-90 shrink-0"
                            title={`Remove ${c.courseCode}`}
                            aria-label={`Remove ${c.courseCode}`}
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 sm:px-7 py-2.5 sm:py-3.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5 border-t border-[var(--surface-border)] bg-[var(--surface-card)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-mono text-[var(--ink-secondary)] min-w-0">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-[var(--ink-secondary)] shrink-0" />
              <span className="truncate">
                Total: <strong className="text-[var(--ink-primary)]">{previewSchedule.items.length}</strong> <span className="hidden sm:inline">Classes</span>
              </span>
            </span>
            {previewSchedule.conflicts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--surface-elevated)] text-[var(--ink-secondary)] border border-[var(--surface-border)] shrink-0">
                {previewSchedule.conflicts.length} Overlap{previewSchedule.conflicts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] rounded-xl transition-all cursor-pointer text-center active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-semibold rounded-xl active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Save &amp; Show Routine</span>
              <span className="sm:hidden">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset All Confirmation Pop-up Dialog */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            aria-describedby="reset-dialog-desc"
          >
            <div className="space-y-1.5">
              <h3 id="reset-dialog-title" className="text-base font-bold text-[var(--ink-primary)] tracking-tight">
                Reset Routine Setup?
              </h3>
              <p id="reset-dialog-desc" className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                This will reset your selected cohort (batch &amp; section) and remove all enrolled courses. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  setIsResetConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-[var(--ink-primary)] hover:bg-[var(--brand-primary-hover)] text-white dark:text-zinc-900 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
