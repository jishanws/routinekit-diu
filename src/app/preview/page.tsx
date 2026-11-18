"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  MapPin,
  AlertTriangle,
  Download,
  Moon,
  Sun,
  Radio,
} from "lucide-react";

interface ScheduleBlock {
  id: string;
  courseCode: string;
  courseTitle: string;
  room: string;
  building: string;
  teacher: string;
  teacherFullName: string;
  startTime: string;
  endTime: string;
  duration: string;
  type: "theory" | "lab" | "retake";
  section: string;
  batch: string;
  isLive?: boolean;
  timeRemaining?: string;
  progressPercent?: number;
  conflictWith?: {
    courseCode: string;
    section: string;
    room: string;
    teacher: string;
  };
}

const SCHEDULE_DATA: Record<string, ScheduleBlock[]> = {
  SAT: [
    {
      id: "s1",
      courseCode: "CSE 438",
      courseTitle: "Business Intelligence & Data Mining",
      room: "KT-221",
      building: "Knowledge Tower · L2",
      teacher: "HHP",
      teacherFullName: "Prof. Hasan Hafizur Rahman",
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      duration: "90 min",
      type: "theory",
      batch: "64",
      section: "D",
    },
    {
      id: "s2",
      courseCode: "CSE 437",
      courseTitle: "Computer Vision & Pattern Recognition",
      room: "KT-503",
      building: "Knowledge Tower · L5",
      teacher: "SBA",
      teacherFullName: "Dr. Syed B. Akhter",
      startTime: "11:30 AM",
      endTime: "01:00 PM",
      duration: "90 min",
      type: "theory",
      batch: "64",
      section: "D",
      conflictWith: {
        courseCode: "CSE 215",
        section: "69_C",
        room: "KT-220",
        teacher: "MSU",
      },
    },
    {
      id: "s3",
      courseCode: "CSE 215",
      courseTitle: "Data Structures & Algorithms",
      room: "KT-220",
      building: "Knowledge Tower · L2",
      teacher: "MSU",
      teacherFullName: "Md. Saiful Islam",
      startTime: "11:30 AM",
      endTime: "01:00 PM",
      duration: "90 min",
      type: "retake",
      batch: "69",
      section: "C",
      conflictWith: {
        courseCode: "CSE 437",
        section: "64_D",
        room: "KT-503",
        teacher: "SBA",
      },
    },
    {
      id: "s4",
      courseCode: "CSE 222",
      courseTitle: "Algorithms & Analysis Studio Lab",
      room: "KT-510",
      building: "Knowledge Tower · L5 Lab Wing",
      teacher: "FLA",
      teacherFullName: "Fabiha Lamisa",
      startTime: "01:00 PM",
      endTime: "04:00 PM",
      duration: "180 min",
      type: "lab",
      batch: "69",
      section: "C",
    },
  ],
  SUN: [
    {
      id: "u1",
      courseCode: "CSE 221",
      courseTitle: "Algorithms & Complexity Theory",
      room: "KT-216",
      building: "Knowledge Tower · L2",
      teacher: "SZ",
      teacherFullName: "Shahnewaz Zaman",
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      duration: "90 min",
      type: "theory",
      batch: "69",
      section: "C",
    },
  ],
  MON: [
    {
      id: "m1",
      courseCode: "CSE 216",
      courseTitle: "Data Structures Laboratory",
      room: "KT-708",
      building: "Knowledge Tower · L7 High-Performance Computing",
      teacher: "SZ + KMB",
      teacherFullName: "Shahnewaz Zaman & Khaled Barkat",
      startTime: "11:30 AM",
      endTime: "02:30 PM",
      duration: "180 min",
      type: "lab",
      batch: "69",
      section: "C1",
    },
    {
      id: "m2",
      courseCode: "CSE 438",
      courseTitle: "Business Intelligence",
      room: "G1-026",
      building: "Academic Annex · Ground L1",
      teacher: "HHP",
      teacherFullName: "Prof. Hasan Hafizur Rahman",
      startTime: "02:30 PM",
      endTime: "04:00 PM",
      duration: "90 min",
      type: "theory",
      batch: "64",
      section: "D",
    },
  ],
  TUE: [
    {
      id: "t1",
      courseCode: "CSE 221",
      courseTitle: "Algorithms & Complexity Theory",
      room: "KT-216",
      building: "Knowledge Tower · L2",
      teacher: "SZ",
      teacherFullName: "Shahnewaz Zaman",
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      duration: "90 min",
      type: "theory",
      batch: "69",
      section: "C",
      isLive: true,
      timeRemaining: "34m remaining",
      progressPercent: 62,
    },
    {
      id: "t2",
      courseCode: "AOL 101",
      courseTitle: "Art of Living & Leadership",
      room: "KT-304",
      building: "Knowledge Tower · L3 Auditorium",
      teacher: "MNI",
      teacherFullName: "Md. Nazmul Islam",
      startTime: "01:00 PM",
      endTime: "02:30 PM",
      duration: "90 min",
      type: "theory",
      batch: "69",
      section: "C",
    },
  ],
  WED: [
    {
      id: "w1",
      courseCode: "CSE 221",
      courseTitle: "Algorithms Retake Workshop",
      room: "KT-301",
      building: "Knowledge Tower · L3",
      teacher: "THM",
      teacherFullName: "Tahmina Mostafa",
      startTime: "08:30 AM",
      endTime: "10:00 AM",
      duration: "90 min",
      type: "retake",
      batch: "RE_A",
      section: "3C",
    },
    {
      id: "w2",
      courseCode: "CSE 437",
      courseTitle: "Computer Vision",
      room: "KT-503",
      building: "Knowledge Tower · L5",
      teacher: "SBA",
      teacherFullName: "Dr. Syed B. Akhter",
      startTime: "11:30 AM",
      endTime: "01:00 PM",
      duration: "90 min",
      type: "theory",
      batch: "64",
      section: "D",
    },
  ],
  THU: [
    {
      id: "h1",
      courseCode: "CSE 221",
      courseTitle: "Algorithms (Special Cohort)",
      room: "KT-217",
      building: "Knowledge Tower · L2",
      teacher: "NT-9",
      teacherFullName: "Guest Faculty Cohort",
      startTime: "11:30 AM",
      endTime: "01:00 PM",
      duration: "90 min",
      type: "retake",
      batch: "RE_A",
      section: "3C",
    },
  ],
};

const WEEK_STRIP = [
  { key: "SAT", label: "Saturday", date: "17", count: 4, hasConflict: true },
  { key: "SUN", label: "Sunday", date: "18", count: 1 },
  { key: "MON", label: "Monday", date: "19", count: 2 },
  { key: "TUE", label: "Tuesday", date: "20", count: 2, isToday: true },
  { key: "WED", label: "Wednesday", date: "21", count: 2 },
  { key: "THU", label: "Thursday", date: "22", count: 1 },
];

export default function AvantGardeRoutineMockup() {
  const [selectedDay, setSelectedDay] = useState<string>("SAT");
  const [layoutMode, setLayoutMode] = useState<"stream" | "matrix">("stream");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeCourseId, setActiveCourseId] = useState<string>("s2");
  const [filterConflictOnly, setFilterConflictOnly] = useState<boolean>(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const dayEvents = SCHEDULE_DATA[selectedDay] || [];
  const eventsToShow = filterConflictOnly
    ? dayEvents.filter((e) => e.conflictWith)
    : dayEvents;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans ${
        isDarkMode
          ? "bg-[#08090C] text-[#F3F4F6] selection:bg-zinc-500/20 selection:text-zinc-400"
          : "bg-[#F7F8FA] text-[#111827] selection:bg-zinc-600/10 selection:text-zinc-700"
      }`}
    >
      {/* ── AMBIENT CANVAS BACKDROP ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div
          className={`absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full blur-[140px] ${
            isDarkMode
              ? "bg-gradient-to-b from-zinc-950/30 via-neutral-950/20 to-transparent"
              : "bg-gradient-to-b from-zinc-100/50 via-neutral-50/30 to-transparent"
          }`}
        />
      </div>

      {/* ── 1. RADICAL FLOATING COMMAND ISLAND (TOP) ── */}
      <div className="sticky top-4 z-50 px-4 max-w-5xl mx-auto">
        <header
          className={`flex items-center justify-between px-3 py-2 sm:px-5 sm:py-2.5 rounded-full border shadow-2xl backdrop-blur-2xl transition-all ${
            isDarkMode
              ? "bg-[#111318]/85 border-white/10 shadow-black/80"
              : "bg-white/85 border-black/10 shadow-slate-200/60"
          }`}
        >
          {/* Brand Mark + University Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-400 to-slate-600 p-[1.5px] flex items-center justify-center shadow-lg shadow-zinc-500/20">
              <div
                className={`w-full h-full rounded-full flex items-center justify-center font-mono font-black text-xs ${
                  isDarkMode ? "bg-black text-zinc-400" : "bg-white text-zinc-700"
                }`}
              >
                RK
              </div>
            </div>

            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                RoutineKit
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 font-semibold">
                  STUDIO
                </span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
                DIU CSE · Fall &apos;26
              </span>
            </div>
          </div>

          {/* Active Live Signal Pill (Dynamic Island Center) */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              isDarkMode
                ? "bg-zinc-950/40 border-zinc-500/30 text-zinc-300"
                : "bg-zinc-50 border-zinc-200 text-zinc-800"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500" />
            </span>
            <span className="font-semibold tracking-tight text-[11px]">
              TUE: CSE 221 (KT-216)
            </span>
            <span className="opacity-60 text-[10px] hidden md:inline">· 34m left</span>
          </div>

          {/* Controls: Mode Switcher + Theme + Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Pill Switcher */}
            <div
              className={`flex items-center p-0.5 rounded-full border ${
                isDarkMode ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"
              }`}
            >
              <button
                type="button"
                onClick={() => setLayoutMode("stream")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  layoutMode === "stream"
                    ? isDarkMode
                      ? "bg-white/15 text-white font-semibold shadow-xs"
                      : "bg-white text-black font-semibold shadow-xs"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Stream
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("matrix")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  layoutMode === "matrix"
                    ? isDarkMode
                      ? "bg-white/15 text-white font-semibold shadow-xs"
                      : "bg-white text-black font-semibold shadow-xs"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Matrix
              </button>
            </div>

            {/* Quick Cohort Badge */}
            <button
              type="button"
              className={`hidden md:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono border transition-all ${
                isDarkMode
                  ? "bg-white/5 border-white/10 hover:border-white/20 text-neutral-300"
                  : "bg-black/5 border-black/10 hover:border-black/20 text-neutral-700"
              }`}
            >
              <span>64_D</span>
              <span className="opacity-40">·</span>
              <span className="text-[11px] opacity-70">18.5cr</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                isDarkMode
                  ? "bg-white/5 border-white/10 text-amber-300 hover:bg-white/10"
                  : "bg-black/5 border-black/10 text-neutral-700 hover:bg-black/10"
              }`}
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </header>
      </div>

      {/* ── 2. HERO COCKPIT: "THE HORIZON STRIP" ── */}
      <main className="max-w-5xl mx-auto px-4 pt-8 pb-20 relative z-10 flex flex-col gap-8">
        
        {/* Real-time Status Card & Conflict Radar */}
        <section
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all ${
            isDarkMode
              ? "bg-gradient-to-b from-[#12151C] to-[#0D0F14] border-white/10 shadow-2xl"
              : "bg-white border-black/8 shadow-xl shadow-slate-200/70"
          }`}
        >
          {/* Subtle Accent Glow Edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-zinc-500 via-slate-400 to-neutral-500" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Active Academic State */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  Campus Cockpit · Realtime
                </span>
                <span className="text-neutral-500">/</span>
                <span className="font-mono text-xs text-neutral-400">
                  Batch 64_D (+5 electives)
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Tuesday Midday Session
              </h1>

              <p className="text-sm text-neutral-400 max-w-xl leading-relaxed">
                Currently in <strong className="text-neutral-200">KT-216</strong> for{" "}
                <span className="text-zinc-400 font-mono font-medium">CSE 221</span>. Next
                break starts at 11:30 AM before Art of Living at 1:00 PM.
              </p>
            </div>

            {/* Right: Conflict & Workload Pill Radar */}
            <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-center">
              {/* Conflict Radar Pill */}
              <button
                type="button"
                onClick={() => setFilterConflictOnly((p) => !p)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                  filterConflictOnly
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 ring-2 ring-rose-500/40"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/15"
                }`}
              >
                <AlertTriangle size={14} className="text-rose-400" />
                <span>5 Slot Overlaps</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200">
                  {filterConflictOnly ? "Viewing Conflicts" : "Filter"}
                </span>
              </button>

              {/* Total Hours Badge */}
              <div
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono border ${
                  isDarkMode
                    ? "bg-white/5 border-white/10 text-neutral-300"
                    : "bg-black/5 border-black/10 text-neutral-700"
                }`}
              >
                <Clock size={14} className="opacity-60" />
                <span>27.0 hrs / week</span>
              </div>

              {/* Export Button */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-zinc-500 text-black hover:bg-zinc-400 active:scale-95 transition-all shadow-lg shadow-zinc-500/20 font-mono"
              >
                <Download size={14} />
                <span>Export .ics</span>
              </button>
            </div>
          </div>

          {/* Active Class Live Progress Bar */}
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-2 text-zinc-400">
                <Radio size={12} className="animate-pulse" />
                <span>IN PROGRESS: CSE 221 Algorithms (10:00 — 11:30 AM)</span>
              </span>
              <span>34 min left (62%)</span>
            </div>

            {/* Glowing Track */}
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-zinc-500 to-slate-400 rounded-full transition-all duration-500"
                style={{ width: "62%" }}
              />
            </div>
          </div>
        </section>

        {/* ── 3. HORIZONTAL DAY CAROUSEL / STRIP (Zero Boring Boxes) ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
            <span className="uppercase tracking-wider font-semibold text-neutral-300">
              Weekly Timeline Cycle
            </span>
            <span>Tap day to inspect schedule</span>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {WEEK_STRIP.map((day) => {
              const isSelected = selectedDay === day.key;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDay(day.key)}
                  className={`group relative p-3 sm:p-4 rounded-2xl text-left border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? isDarkMode
                        ? "bg-white/10 border-zinc-500/60 shadow-xl shadow-zinc-950/40"
                        : "bg-white border-zinc-600 shadow-lg shadow-zinc-900/10"
                      : isDarkMode
                      ? "bg-[#111317]/60 border-white/5 hover:border-white/15 hover:bg-white/5"
                      : "bg-white/70 border-black/5 hover:border-black/15 hover:bg-white"
                  }`}
                >
                  {/* Active Indicator Top Light Bar */}
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-400 to-slate-500" />
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tracking-tight text-neutral-400 group-hover:text-neutral-200">
                      {day.key}
                    </span>
                    {day.isToday && (
                      <span className="w-2 h-2 rounded-full bg-zinc-400 shadow-sm shadow-zinc-400" />
                    )}
                  </div>

                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span
                      className={`text-lg sm:text-2xl font-extrabold tracking-tight ${
                        isSelected
                          ? "text-zinc-400"
                          : isDarkMode
                          ? "text-neutral-200"
                          : "text-neutral-800"
                      }`}
                    >
                      {day.date}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <span className="opacity-60">{day.count} cls</span>
                    {day.hasConflict && (
                      <span className="text-rose-400 flex items-center" title="Has overlap">
                        ⚠️
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 4. STREAM VIEW: "FLUID TIMELINE TAPE" ── */}
        {layoutMode === "stream" ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
              <span>{WEEK_STRIP.find((d) => d.key === selectedDay)?.label} Stream</span>
              <span>{eventsToShow.length} Modules in Timeline</span>
            </div>

            {/* List of stream cards */}
            <div className="flex flex-col gap-4 relative">
              {/* Subtle Vertical Spine Line */}
              <div
                className={`absolute left-6 sm:left-8 top-4 bottom-4 w-[1px] ${
                  isDarkMode ? "bg-white/10" : "bg-black/10"
                } hidden sm:block`}
              />

              {eventsToShow.map((event) => {
                const isConflict = Boolean(event.conflictWith);

                return (
                  <div
                    key={event.id}
                    onClick={() => setActiveCourseId(event.id)}
                    className={`relative rounded-3xl p-5 sm:p-6 border transition-all cursor-pointer group ${
                      activeCourseId === event.id ? "ring-1 ring-white/40" : ""
                    } ${
                      isConflict
                        ? isDarkMode
                          ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70"
                          : "bg-rose-50 border-rose-300 hover:border-rose-400"
                        : event.type === "lab"
                        ? isDarkMode
                          ? "bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-500/70"
                          : "bg-indigo-50/70 border-indigo-200 hover:border-indigo-300"
                        : event.isLive
                        ? isDarkMode
                          ? "bg-zinc-950/20 border-zinc-500/50 shadow-xl shadow-zinc-950/30 ring-1 ring-zinc-500/30"
                          : "bg-zinc-50/70 border-zinc-300 shadow-md ring-1 ring-zinc-400/30"
                        : isDarkMode
                        ? "bg-[#111317]/90 border-white/8 hover:border-white/20 hover:bg-[#14171D]"
                        : "bg-white border-black/8 hover:border-black/15 hover:shadow-md"
                    }`}
                  >
                    {/* Event Content Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                      {/* Left: Time Stamp & Duration */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                            event.isLive
                              ? "bg-zinc-500 text-black font-bold"
                              : isDarkMode
                              ? "bg-white/10 text-neutral-300"
                              : "bg-black/5 text-neutral-700"
                          }`}
                        >
                          <Clock size={12} />
                          <span>
                            {event.startTime} — {event.endTime}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-neutral-400">
                          {event.duration}
                        </span>
                      </div>

                      {/* Right: Badges */}
                      <div className="flex items-center gap-2">
                        {isConflict && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle size={11} />
                            COLLISION WITH {event.conflictWith?.courseCode}
                          </span>
                        )}

                        {event.type === "lab" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            3-Hour Studio Lab
                          </span>
                        )}

                        {event.type === "retake" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Retake Track
                          </span>
                        )}

                        <span
                          className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${
                            isDarkMode
                              ? "bg-white/5 border-white/10 text-neutral-300"
                              : "bg-black/5 border-black/10 text-neutral-700"
                          }`}
                        >
                          {event.batch}_{event.section}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Title & Course Code */}
                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-black tracking-tight text-zinc-400">
                            {event.courseCode}
                          </span>
                        </div>

                        {/* Location Subtext */}
                        <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mt-1">
                          <span className="flex items-center gap-1 text-neutral-300">
                            <MapPin size={13} className="text-zinc-400" />
                            <strong>{event.room}</strong> ({event.building})
                          </span>
                        </div>
                      </div>

                      {/* Instructor Avatar Tag */}
                      <div
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border self-start sm:self-auto ${
                          isDarkMode
                            ? "bg-white/5 border-white/10 text-neutral-300"
                            : "bg-black/5 border-black/10 text-neutral-800"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-zinc-500/20 text-zinc-400 flex items-center justify-center font-mono font-bold text-[10px]">
                          {event.teacher.slice(0, 2)}
                        </div>
                        <div className="flex flex-col leading-none">
                          <span className="text-xs font-semibold">{event.teacherFullName}</span>
                          <span className="text-[10px] font-mono text-neutral-500">
                            Initial: {event.teacher}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Conflict Solution Helper (if collision detected) */}
                    {isConflict && (
                      <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                        <div className="flex items-center gap-2 text-rose-300">
                          <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                          <span>
                            Overlaps with <strong>{event.conflictWith?.courseCode}</strong> in{" "}
                            <strong>{event.conflictWith?.room}</strong> ({event.conflictWith?.teacher}).
                          </span>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 transition-all self-start sm:self-auto"
                        >
                          Switch Section to Fix →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          /* ── 5. MATRIX HORIZON VIEW: ARCHITECTURAL WEEK CANVAS ── */
          <section
            className={`rounded-3xl p-6 border overflow-x-auto ${
              isDarkMode ? "bg-[#111317]/80 border-white/10" : "bg-white border-black/10"
            }`}
          >
            <div className="min-w-[800px] flex flex-col gap-4">
              {/* Matrix Day Columns */}
              <div className="grid grid-cols-7 gap-3 pb-3 border-b border-white/10 text-xs font-mono">
                <span className="text-neutral-500">SLOT TIME</span>
                {WEEK_STRIP.map((d) => (
                  <div key={d.key} className="flex flex-col">
                    <span className="font-bold text-neutral-200">{d.key} {d.date}</span>
                    <span className="text-[10px] text-neutral-500">{d.count} modules</span>
                  </div>
                ))}
              </div>

              {/* Time Slots Rows */}
              {["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM"].map((slot) => (
                <div key={slot} className="grid grid-cols-7 gap-3 py-3 border-b border-white/5 text-xs font-mono items-center">
                  <span className="text-neutral-400 font-bold">{slot}</span>

                  {WEEK_STRIP.map((d) => {
                    const match = (SCHEDULE_DATA[d.key] || []).filter((e) =>
                      e.startTime.startsWith(slot.slice(0, 5))
                    );

                    return (
                      <div key={d.key} className="flex flex-col gap-1.5">
                        {match.length === 0 ? (
                          <span className="text-neutral-600 text-[10px]">—</span>
                        ) : (
                          match.map((m) => (
                            <div
                              key={m.id}
                              className={`p-2.5 rounded-xl border text-[11px] font-mono flex flex-col gap-1 ${
                                m.conflictWith
                                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                  : m.type === "lab"
                                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                  : isDarkMode
                                  ? "bg-white/5 border-white/10 text-neutral-200"
                                  : "bg-black/5 border-black/10 text-neutral-800"
                              }`}
                            >
                              <div className="font-bold flex items-center justify-between">
                                <span>{m.courseCode}</span>
                                <span className="text-[9px] px-1 rounded bg-black/40">
                                  {m.section}
                                </span>
                              </div>
                              <span className="text-[10px] text-neutral-400 truncate">
                                {m.room} · {m.teacher}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 6. COMPARISON PILL: WHY THIS IS AN UNAPOLOGETICALLY NEW UI ── */}
        <section
          className={`p-6 rounded-3xl border text-xs flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDarkMode
              ? "bg-zinc-950/20 border-zinc-500/20 text-neutral-300"
              : "bg-zinc-50 border-zinc-200 text-neutral-700"
          }`}
        >
          <div className="flex flex-col gap-1">
            <span className="font-mono font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
              Why this completely breaks the boring calendar mold:
            </span>
            <p className="text-neutral-400 text-xs">
              1. <strong>Dynamic Island Command Bar:</strong> No stacked bulky headers.
              <br />
              2. <strong>Streamline Horizon Ribbon:</strong> Eliminates dense grid fatigue.
              <br />
              3. <strong>Collision Architecture:</strong> Overlaps are highlighted as high-touch interactive resolution units.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className={`px-4 py-2 rounded-2xl font-mono text-xs font-semibold border transition-all ${
                isDarkMode
                  ? "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  : "bg-black/5 border-black/10 text-neutral-700 hover:bg-black/10"
              }`}
            >
              ← Back to Original
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
