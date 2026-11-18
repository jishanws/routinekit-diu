import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { ScheduleItem, StudentSetup, PublishedRoutine, DayOfWeek } from "@/types/routine";
import { formatBatchSectionBadge, timeStringToMinutes, getScheduleTitle, getScheduleHeadline } from "@/lib/routine/schedule";
import { getCourseTitle } from "@/lib/routine/courseCatalog";
import { DIU_LOGO_PNG_DATA_URL } from "./diuLogoData";

export { getScheduleTitle, getScheduleHeadline };

export const ORDERED_ACADEMIC_DAYS: DayOfWeek[] = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export interface FormattedCourseText {
  title: string;
  code: string;
  section: string;
  displayText: string;
}

export interface SplitRoom {
  mainRoom: string;
  labTag?: string;
  displayRoom: string;
}

export interface DayScheduleGroup {
  day: DayOfWeek;
  items: ScheduleItem[];
}

/**
 * Returns a standardized filename for exported documents.
 */
export function getExportFilename(setup: StudentSetup, ext: string): string {
  const sem = (setup.semester_id || "semester").replace(/[^a-zA-Z0-9]/g, "_");
  let label = "schedule";
  if (setup.mode === "batch-section" && setup.batch && setup.section) {
    label = `${setup.batch}_${setup.section}`;
  } else if (setup.mode === "mixed" && setup.batch && setup.section) {
    label = `${setup.batch}_${setup.section}_mixed`;
  } else if (setup.mode === "courses") {
    label = "custom_courses";
  }
  return `RoutineKit_${sem}_${label}.${ext}`;
}

/**
 * Converts a 24-hr time string "HH:MM" into 12-hr format without AM/PM.
 * e.g. "08:30" -> "08:30"
 *      "10:00" -> "10:00"
 *      "13:00" -> "01:00"
 *      "14:30" -> "02:30"
 *      "16:00" -> "04:00"
 */
export function formatTime12Hour(time24: string): string {
  if (!time24) return "";
  const parts = time24.trim().split(":");
  let hour = parseInt(parts[0], 10);
  const min = parts[1] || "00";
  if (isNaN(hour)) return time24;
  if (hour > 12) hour -= 12;
  const hStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hStr}:${min}`;
}

/**
 * Formats a start and end time interval with an en-dash:
 * e.g. ("08:30", "10:00") -> "08:30 – 10:00"
 *      ("13:00", "14:30") -> "01:00 – 02:30"
 */
export function formatSlot12Hour(startTime: string, endTime: string): string {
  const start = formatTime12Hour(startTime);
  const end = formatTime12Hour(endTime);
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} – ${end}`;
}

/**
 * Calculates duration in hours between two time strings.
 */
export function computeClassDuration(startTime: string, endTime: string): number {
  const s = timeStringToMinutes(startTime);
  const e = timeStringToMinutes(endTime);
  const diff = Math.max(0, e - s);
  return diff / 60;
}

/**
 * Formats course cell text cleanly:
 * "[Course Title] · [CourseCode]([Section])"
 */
export function formatCourseCellText(item: ScheduleItem): FormattedCourseText {
  const cleanCode = (item.courseCode || "").replace(/\s+/g, "").toUpperCase();
  const title = (item.courseTitle || "").trim() || getCourseTitle(cleanCode);
  const sectionBadge = formatBatchSectionBadge(item);

  const codeWithSection = sectionBadge ? `${cleanCode}(${sectionBadge})` : cleanCode;
  const displayText = title ? `${title} · ${codeWithSection}` : codeWithSection;

  return {
    title,
    code: cleanCode,
    section: sectionBadge,
    displayText,
  };
}

/**
 * Cleans room label for UI display without redundant building fluff.
 * e.g. "KT-503 (COM LAB)" -> { mainRoom: "KT-503", labTag: "COM LAB", displayRoom: "KT-503 · COM LAB" }
 *      "KT-318(A)"        -> { mainRoom: "KT-318(A)", displayRoom: "KT-318(A)" }
 */
export function splitRoomLabel(room?: string, classType?: string): SplitRoom {
  if (!room) return { mainRoom: "TBA", displayRoom: "Room TBA" };
  const trimmed = room.trim();

  const labMatch = trimmed.match(/^(.*?)\s*\(?([^()]*LAB[^()]*)\)?$/i);
  if (labMatch) {
    const main = labMatch[1].trim();
    const lab = labMatch[2].trim().toUpperCase();
    return {
      mainRoom: main,
      labTag: lab,
      displayRoom: `${main} · ${lab}`,
    };
  }

  const dotSplit = trimmed.split(/\s*·\s*/);
  const main = dotSplit[0] || trimmed;

  if (/^KT-50[1-6]/i.test(main) || classType === "lab") {
    return {
      mainRoom: main,
      labTag: "COM LAB",
      displayRoom: `${main} · COM LAB`,
    };
  }

  return { mainRoom: main, displayRoom: main };
}

/**
 * Groups and sorts schedule items chronologically by DIU academic days.
 */
export function groupScheduleItemsByDay(items: ScheduleItem[]): DayScheduleGroup[] {
  const groups: DayScheduleGroup[] = [];

  for (const day of ORDERED_ACADEMIC_DAYS) {
    const dayClasses = items.filter((cls) => cls.day === day);
    if (dayClasses.length > 0) {
      const sorted = [...dayClasses].sort((a, b) => {
        const timeDiff = timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.courseCode.localeCompare(b.courseCode);
      });
      groups.push({ day, items: sorted });
    }
  }

  return groups;
}

/**
 * Determines whether a specific class meeting is an actual lab session.
 */
export function isLabClassMeeting(item: ScheduleItem): boolean {
  const duration = computeClassDuration(item.startTime, item.endTime);
  const cleanCode = (item.courseCode || "").replace(/\s+/g, "").toUpperCase();
  const title = (item.courseTitle || "").trim() || getCourseTitle(cleanCode);
  const titleHasLab = /\blab\b/i.test(title);

  if (titleHasLab) return true;
  if (item.classType === "lab" && duration >= 2.5) return true;
  return false;
}

/**
 * Generates a high-contrast QR code data URL pointing to the schedule view URL.
 */
export async function generateQrCodeDataUrl(
  setup: StudentSetup,
  routine: PublishedRoutine
): Promise<string> {
  let url = "https://routinekit.app";
  const params = new URLSearchParams();
  if (routine.semester_id) params.set("sem", routine.semester_id);
  if (setup.batch && setup.section) {
    params.set("batch", setup.batch);
    params.set("section", setup.section);
  }

  if (typeof window !== "undefined" && window.location) {
    url = `${window.location.origin}${window.location.pathname}`;
    const query = params.toString();
    if (query) url += `?${query}`;
  } else {
    const query = params.toString();
    if (query) url += `?${query}`;
  }

  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });
  } catch {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

/**
 * Loads an image from a Data URL into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Truncates text with an ellipsis to fit within a given maximum width.
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

/**
 * Safe Canvas rounded rect helper with cross-browser compatibility.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Page Geometry Constants (Portrait 792 x 1008 pt)
 */
export const PDF_PAGE_WIDTH = 792;
export const PDF_PAGE_HEIGHT = 1008;

export const MARGIN_X = 52;
export const CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * MARGIN_X; // 688 pt

/**
 * Signature Natural Neutral Palette (Black, White, and Gray - Zero Harsh Accent)
 */
export const COLORS = {
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  cardBorder: "#E2E8F0", // Slate 200
  cardBorderHover: "#CBD5E1",
  divider: "#F1F5F9",    // Slate 100

  inkPrimary: "#0F172A",   // Slate 900
  inkSecondary: "#334155", // Slate 700
  inkMuted: "#64748B",     // Slate 500
  inkFaint: "#94A3B8",     // Slate 400

  // Left Accent Rails: Clean black, white, and gray (NO blue / amber / red)
  theoryRail: "#0F172A",   // Slate 900
  labRail: "#475569",      // Slate 600
  retakeRail: "#18181B",   // Zinc 900

  // Badges: Black, White, and Gray
  badgeBg: "#F1F5F9",      // Slate 100
  badgeBorder: "#E2E8F0",  // Slate 200
  badgeText: "#334155",    // Slate 700

  retakeBadgeBg: "#18181B",     // Zinc 900
  retakeBadgeBorder: "#27272A",
  retakeBadgeText: "#FFFFFF",

  labBadgeBg: "#F4F4F5",        // Zinc 100
  labBadgeBorder: "#E4E4E7",    // Zinc 200
  labBadgeText: "#27272A",      // Zinc 800

  chipBg: "#F8FAFC",       // Slate 50
  chipBorder: "#E2E8F0",   // Slate 200
  chipText: "#0F172A",
};

/**
 * Calculates adaptive card height and day spacing to fit any routine cleanly on one page
 * with mathematically exact vertical distribution.
 */
export function computeCardBudget(
  dayGroupsCount: number,
  totalClassesCount: number
) {
  const startY = 130;
  const footerY = 964;
  const availableHeight = footerY - startY; // 834 pt

  const numDays = Math.max(1, dayGroupsCount);
  const totalClasses = Math.max(1, totalClassesCount);

  const dayHeaderHeight = 26;
  const dayGap = Math.max(10, Math.min(20, Math.floor(90 / numDays)));
  const cardGap = 8;
  const totalCardGaps = Math.max(0, totalClasses - numDays);

  const fixedOverhead = numDays * dayHeaderHeight + numDays * dayGap + totalCardGaps * cardGap;
  const availableForCards = availableHeight - fixedOverhead;
  let cardHeight = Math.floor(availableForCards / totalClasses);

  // Clamp card height between 44pt (dense) and 52pt (spacious)
  cardHeight = Math.max(44, Math.min(52, cardHeight));

  return {
    startY,
    footerY,
    dayHeaderHeight,
    dayGap,
    cardGap,
    cardHeight,
  };
}

/**
 * Builds a clean, focused vector jsPDF document styled to mirror the authentic
 * RoutineKit web format with badge sections and balanced black/white/gray hierarchy.
 */
export async function createTimetablePdfDocument(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT],
    compress: true,
  });

  const dayGroups = groupScheduleItemsByDay(items);
  const headline = getScheduleHeadline(setup, items);
  const qrDataUrl = await generateQrCodeDataUrl(setup, routine);

  // Pure Clean Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "F");

  // 1. Header (Y: 40 to 118)
  // Top-Left: DIU Official Logo
  try {
    doc.addImage(DIU_LOGO_PNG_DATA_URL, "PNG", MARGIN_X, 42, 160, 42, undefined, "FAST");
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("Daffodil International University", MARGIN_X, 66);
  }

  // Top-Right: QR Code with subtle frame
  const qrBox = 54;
  const qrX = MARGIN_X + CONTENT_WIDTH - qrBox;
  const qrY = 40;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.75);
  doc.roundedRect(qrX, qrY, qrBox, qrBox, 4, 4, "FD");

  try {
    doc.addImage(qrDataUrl, "PNG", qrX + 3, qrY + 2.5, 48, 48, undefined, "FAST");
  } catch {
    // Fallback
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ROUTINEKIT", qrX + qrBox / 2, qrY + 50.5, { align: "center" });

  // Center / Title Area: Refined boldness & typography
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(headline, MARGIN_X + 185, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`${routine.semester_label} Academic Schedule · Department of CSE`, MARGIN_X + 185, 70);

  // Header Summary Badge Section (Courses, Classes/Wk, Routine Version, Retakes)
  const uniqueCourses = new Set(
    items.map((i) => (i.courseCode || "").replace(/\s+/g, "").toUpperCase())
  ).size;
  const retakeCount = items.filter((i) => i.isRetake).length;

  const headerBadges: string[] = [
    `${uniqueCourses} ${uniqueCourses === 1 ? "Course" : "Courses"}`,
    `${items.length} ${items.length === 1 ? "Class" : "Classes"} / Wk`,
    `Routine ${routine.routine_version}`,
  ];
  if (retakeCount > 0) {
    headerBadges.push(`${retakeCount} Retake`);
  }

  let hBadgeX = MARGIN_X + 185;
  const hBadgeY = 79;
  const hBadgeH = 15;

  for (const bText of headerBadges) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const txtW = doc.getTextWidth(bText);
    const bW = txtW + 11;

    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.65);
    doc.roundedRect(hBadgeX, hBadgeY, bW, hBadgeH, 3, 3, "FD");

    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text(bText, hBadgeX + bW / 2, hBadgeY + 10.5, { align: "center" });

    hBadgeX += bW + 6;
  }

  // Subtle Header Divider Rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_X, 108, MARGIN_X + CONTENT_WIDTH, 108);

  // 2. Schedule Grid
  const budget = computeCardBudget(dayGroups.length, items.length);
  let currentY = budget.startY;

  for (let gIdx = 0; gIdx < dayGroups.length; gIdx++) {
    const group = dayGroups[gIdx];
    const dayClasses = group.items;

    // Day Header - Clean balanced bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(group.day, MARGIN_X, currentY + 13);

    const dayW = doc.getTextWidth(group.day);

    // Class count badge - clean normal weight
    const countText = `${dayClasses.length} ${dayClasses.length === 1 ? "Class" : "Classes"}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const countW = doc.getTextWidth(countText) + 12;
    const countX = MARGIN_X + dayW + 10;

    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.roundedRect(countX, currentY + 1.5, countW, 15, 3, 3, "FD");
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(countText, countX + countW / 2, currentY + 11.5, { align: "center" });

    // Connecting hairline rule
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(1);
    doc.line(countX + countW + 10, currentY + 9, MARGIN_X + CONTENT_WIDTH, currentY + 9);

    currentY += budget.dayHeaderHeight;

    // Render Class Cards for this Day
    for (let cIdx = 0; cIdx < dayClasses.length; cIdx++) {
      const cls = dayClasses[cIdx];
      const cardY = currentY;
      const cardH = budget.cardHeight;
      const cardCenterY = cardY + cardH / 2;

      const isLab = isLabClassMeeting(cls);
      const isRetake = Boolean(cls.isRetake);
      const duration = computeClassDuration(cls.startTime, cls.endTime);

      // Card Background & Outer Border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.75);
      doc.roundedRect(MARGIN_X, cardY, CONTENT_WIDTH, cardH, 5, 5, "FD");

      // Left Accent Rail Indicator: Natural monochrome tones
      if (isRetake) {
        doc.setFillColor(24, 24, 27); // Zinc 900
      } else if (isLab) {
        doc.setFillColor(82, 82, 91); // Zinc 600
      } else {
        doc.setFillColor(15, 23, 42); // Slate 900
      }
      doc.roundedRect(MARGIN_X, cardY, 3.5, cardH, 2, 2, "F");

      // Column 1: Time & Duration (X: MARGIN_X + 16, Width: ~140 pt)
      const slotText = formatSlot12Hour(cls.startTime, cls.endTime);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text(slotText, MARGIN_X + 16, cardCenterY - 4);

      // Duration & Session Subline (Regular font)
      const durText = isLab
        ? `${duration.toFixed(1)} hrs · Lab`
        : `${duration.toFixed(1)} hrs · Theory`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(durText, MARGIN_X + 16, cardCenterY + 8);

      // Inset Subtle Vertical Divider 1
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.75);
      doc.line(MARGIN_X + 166, cardY + 7, MARGIN_X + 166, cardY + cardH - 7);

      // Column 2: Course Code, BADGES SECTION, and Course Title
      const cleanCode = (cls.courseCode || "").replace(/\s+/g, "").toUpperCase();
      const courseTitle = (cls.courseTitle || "").trim() || getCourseTitle(cleanCode) || cleanCode;
      const sectionBadge = formatBatchSectionBadge(cls);

      // Line 1: Course Code (Bold, crisp)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text(cleanCode, MARGIN_X + 178, cardCenterY - 4);
      const codeW = doc.getTextWidth(cleanCode);

      // Line 1: The Badge Section immediately following the course code
      let cBadgeX = MARGIN_X + 178 + codeW + 8;
      const cBadgeY = cardCenterY - 11;
      const cBadgeH = 13.5;

      // Section Badge (e.g. 66_D)
      if (sectionBadge) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        const sW = doc.getTextWidth(sectionBadge) + 9;
        doc.setFillColor(241, 245, 249); // Slate 100
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.65);
        doc.roundedRect(cBadgeX, cBadgeY, sW, cBadgeH, 2.5, 2.5, "FD");
        doc.setTextColor(51, 65, 85); // Slate 700
        doc.text(sectionBadge, cBadgeX + sW / 2, cBadgeY + 9.5, { align: "center" });
        cBadgeX += sW + 5;
      }

      // Lab Badge
      if (isLab) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        const lW = doc.getTextWidth("LAB") + 8;
        doc.setFillColor(244, 244, 245); // Zinc 100
        doc.setDrawColor(228, 228, 231); // Zinc 200
        doc.setLineWidth(0.65);
        doc.roundedRect(cBadgeX, cBadgeY, lW, cBadgeH, 2.5, 2.5, "FD");
        doc.setTextColor(39, 39, 42); // Zinc 800
        doc.text("LAB", cBadgeX + lW / 2, cBadgeY + 9.5, { align: "center" });
        cBadgeX += lW + 5;
      }

      // Retake Badge
      if (isRetake) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        const rW = doc.getTextWidth("RETAKE") + 8;
        doc.setFillColor(24, 24, 27); // Zinc 900
        doc.setDrawColor(39, 39, 42); // Zinc 800
        doc.setLineWidth(0.65);
        doc.roundedRect(cBadgeX, cBadgeY, rW, cBadgeH, 2.5, 2.5, "FD");
        doc.setTextColor(255, 255, 255);
        doc.text("RETAKE", cBadgeX + rW / 2, cBadgeY + 9.5, { align: "center" });
        cBadgeX += rW + 5;
      }

      // Custom Badge
      if (cls.isCustom) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        const custW = doc.getTextWidth("CUSTOM") + 8;
        doc.setFillColor(244, 244, 245);
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.65);
        doc.roundedRect(cBadgeX, cBadgeY, custW, cBadgeH, 2.5, 2.5, "FD");
        doc.setTextColor(63, 63, 70);
        doc.text("CUSTOM", cBadgeX + custW / 2, cBadgeY + 9.5, { align: "center" });
        cBadgeX += custW + 5;
      }

      // Line 2: Full Course Title (Regular font, NOT bold, very clean)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // Slate 500

      let titleDisplay = courseTitle;
      const maxTitleW = 345;
      while (titleDisplay.length > 3 && doc.getTextWidth(titleDisplay) > maxTitleW) {
        titleDisplay = titleDisplay.slice(0, -2) + "…";
      }
      doc.text(titleDisplay, MARGIN_X + 178, cardCenterY + 8);

      // Inset Subtle Vertical Divider 2
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.75);
      doc.line(MARGIN_X + 538, cardY + 7, MARGIN_X + 538, cardY + cardH - 7);

      // Column 3: Room Chip (X: MARGIN_X + 548, Width: 104 pt) - Clean regular font
      const roomInfo = splitRoomLabel(cls.room, cls.classType);
      const roomW = 104;
      const roomH = 22;
      const roomX = MARGIN_X + 548;
      const roomY = cardCenterY - 11;

      doc.setFillColor(248, 250, 252); // Slate 50
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.75);
      doc.roundedRect(roomX, roomY, roomW, roomH, 4, 4, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text(roomInfo.displayRoom, roomX + roomW / 2, roomY + 14.5, { align: "center" });

      // Column 4: Faculty Avatar Badge (X: MARGIN_X + 662, Width: 46 pt)
      const teacherW = 46;
      const teacherH = 22;
      const teacherX = MARGIN_X + 662;
      const teacherY = cardCenterY - 11;

      doc.setFillColor(241, 245, 249); // Slate 100
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.75);
      doc.roundedRect(teacherX, teacherY, teacherW, teacherH, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cls.instructor || "-", teacherX + teacherW / 2, teacherY + 14.5, { align: "center" });

      currentY += cardH;
      if (cIdx < dayClasses.length - 1) {
        currentY += budget.cardGap;
      }
    }

    currentY += budget.dayGap;
  }

  // 3. Subtle Footer (Clean 1-line academic attribution)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `RoutineKit · Daffodil International University · ${routine.semester_label} (Routine ${routine.routine_version})`,
    PDF_PAGE_WIDTH / 2,
    PDF_PAGE_HEIGHT - 32,
    { align: "center" }
  );

  return doc;
}

/**
 * Renders the timetable to a high-resolution canvas (2376 x 3024 px @ 300 DPI)
 * matching the authentic student schedule UI with badge sections and black/white/gray styling.
 */
export async function renderTimetableToCanvas(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with system fallbacks
    }
  }

  const SCALE = 3;
  const CANVAS_W = PDF_PAGE_WIDTH * SCALE; // 2376 px
  const CANVAS_H = PDF_PAGE_HEIGHT * SCALE; // 3024 px

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  // Background: Pure White
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const dayGroups = groupScheduleItemsByDay(items);
  const headline = getScheduleHeadline(setup, items);
  const qrDataUrl = await generateQrCodeDataUrl(setup, routine);

  // Load Images
  let logoImg: HTMLImageElement | null = null;
  let qrImg: HTMLImageElement | null = null;
  try {
    [logoImg, qrImg] = await Promise.all([
      loadImage(DIU_LOGO_PNG_DATA_URL),
      loadImage(qrDataUrl),
    ]);
  } catch {
    // Fallback
  }

  // 1. Header (Y: 40 to 118)
  // Top-Left: DIU Official Logo
  if (logoImg) {
    ctx.drawImage(logoImg, MARGIN_X * SCALE, 42 * SCALE, 160 * SCALE, 42 * SCALE);
  } else {
    ctx.fillStyle = "#0F172A";
    ctx.font = `bold ${15 * SCALE}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Daffodil International University", MARGIN_X * SCALE, 66 * SCALE);
  }

  // Top-Right: QR Code
  const qrBox = 54 * SCALE;
  const qrX = (MARGIN_X + CONTENT_WIDTH) * SCALE - qrBox;
  const qrY = 40 * SCALE;

  ctx.fillStyle = "#FFFFFF";
  drawRoundedRect(ctx, qrX, qrY, qrBox, qrBox, 4 * SCALE);
  ctx.fill();

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 0.75 * SCALE;
  drawRoundedRect(ctx, qrX, qrY, qrBox, qrBox, 4 * SCALE);
  ctx.stroke();

  if (qrImg) {
    ctx.drawImage(qrImg, qrX + 3 * SCALE, qrY + 2.5 * SCALE, 48 * SCALE, 48 * SCALE);
  }

  ctx.fillStyle = "#64748B";
  ctx.font = `bold ${5.5 * SCALE}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ROUTINEKIT", qrX + qrBox / 2, qrY + 50.5 * SCALE);

  // Center: Headline & Subtitle
  ctx.fillStyle = "#0F172A";
  ctx.font = `bold ${18 * SCALE}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(headline, (MARGIN_X + 185) * SCALE, 58 * SCALE);

  ctx.fillStyle = "#64748B";
  ctx.font = `${9 * SCALE}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    `${routine.semester_label} Academic Schedule · Department of CSE`,
    (MARGIN_X + 185) * SCALE,
    72 * SCALE
  );

  // Header Summary Badge Section
  const uniqueCourses = new Set(
    items.map((i) => (i.courseCode || "").replace(/\s+/g, "").toUpperCase())
  ).size;
  const retakeCount = items.filter((i) => i.isRetake).length;

  const headerBadges: string[] = [
    `${uniqueCourses} ${uniqueCourses === 1 ? "Course" : "Courses"}`,
    `${items.length} ${items.length === 1 ? "Class" : "Classes"} / Wk`,
    `Routine ${routine.routine_version}`,
  ];
  if (retakeCount > 0) {
    headerBadges.push(`${retakeCount} Retake`);
  }

  let hBadgeX = (MARGIN_X + 185) * SCALE;
  const hBadgeY = 79 * SCALE;
  const hBadgeH = 15 * SCALE;

  for (const bText of headerBadges) {
    ctx.font = `${7.5 * SCALE}px system-ui, -apple-system, sans-serif`;
    const txtW = ctx.measureText(bText).width;
    const bW = txtW + 11 * SCALE;

    ctx.fillStyle = "#F1F5F9";
    drawRoundedRect(ctx, hBadgeX, hBadgeY, bW, hBadgeH, 3 * SCALE);
    ctx.fill();

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 0.65 * SCALE;
    drawRoundedRect(ctx, hBadgeX, hBadgeY, bW, hBadgeH, 3 * SCALE);
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bText, hBadgeX + bW / 2, hBadgeY + hBadgeH / 2);

    hBadgeX += bW + 6 * SCALE;
  }

  // Divider Rule
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 0.75 * SCALE;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X * SCALE, 108 * SCALE);
  ctx.lineTo((MARGIN_X + CONTENT_WIDTH) * SCALE, 108 * SCALE);
  ctx.stroke();

  // 2. Schedule Grid
  const budget = computeCardBudget(dayGroups.length, items.length);
  let currentY = budget.startY * SCALE;

  for (let gIdx = 0; gIdx < dayGroups.length; gIdx++) {
    const group = dayGroups[gIdx];
    const dayClasses = group.items;

    // Day Header
    ctx.fillStyle = "#0F172A";
    ctx.font = `bold ${12.5 * SCALE}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(group.day, MARGIN_X * SCALE, currentY + 11 * SCALE);

    const dayW = ctx.measureText(group.day).width;

    // Class count badge
    const countText = `${dayClasses.length} ${dayClasses.length === 1 ? "Class" : "Classes"}`;
    ctx.font = `${8 * SCALE}px system-ui, -apple-system, sans-serif`;
    const countW = ctx.measureText(countText).width + 12 * SCALE;
    const countX = MARGIN_X * SCALE + dayW + 10 * SCALE;

    ctx.fillStyle = "#F1F5F9";
    drawRoundedRect(ctx, countX, currentY + 1.5 * SCALE, countW, 15 * SCALE, 3 * SCALE);
    ctx.fill();

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 0.5 * SCALE;
    drawRoundedRect(ctx, countX, currentY + 1.5 * SCALE, countW, 15 * SCALE, 3 * SCALE);
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.textAlign = "center";
    ctx.fillText(countText, countX + countW / 2, currentY + 9 * SCALE);

    // Connecting hairline rule
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1 * SCALE;
    ctx.beginPath();
    ctx.moveTo(countX + countW + 10 * SCALE, currentY + 9 * SCALE);
    ctx.lineTo((MARGIN_X + CONTENT_WIDTH) * SCALE, currentY + 9 * SCALE);
    ctx.stroke();

    currentY += budget.dayHeaderHeight * SCALE;

    // Render Class Cards for this Day
    for (let cIdx = 0; cIdx < dayClasses.length; cIdx++) {
      const cls = dayClasses[cIdx];
      const cardY = currentY;
      const cardH = budget.cardHeight * SCALE;
      const cardCenterY = cardY + cardH / 2;

      const isLab = isLabClassMeeting(cls);
      const isRetake = Boolean(cls.isRetake);
      const duration = computeClassDuration(cls.startTime, cls.endTime);

      // Card Background & Outer Border
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(ctx, MARGIN_X * SCALE, cardY, CONTENT_WIDTH * SCALE, cardH, 5 * SCALE);
      ctx.fill();

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 0.75 * SCALE;
      drawRoundedRect(ctx, MARGIN_X * SCALE, cardY, CONTENT_WIDTH * SCALE, cardH, 5 * SCALE);
      ctx.stroke();

      // Left Accent Rail Indicator (Natural monochrome)
      if (isRetake) {
        ctx.fillStyle = "#18181B"; // Zinc 900
      } else if (isLab) {
        ctx.fillStyle = "#52525B"; // Zinc 600
      } else {
        ctx.fillStyle = "#0F172A"; // Slate 900
      }
      ctx.beginPath();
      drawRoundedRect(ctx, MARGIN_X * SCALE, cardY, 3.5 * SCALE, cardH, 2 * SCALE);
      ctx.fill();

      // Column 1: Time & Duration (X: MARGIN_X + 16)
      const slotText = formatSlot12Hour(cls.startTime, cls.endTime);
      ctx.fillStyle = "#0F172A";
      ctx.font = `bold ${10.5 * SCALE}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(slotText, (MARGIN_X + 16) * SCALE, cardCenterY - 4 * SCALE);

      // Duration & Session Subline
      const durText = isLab
        ? `${duration.toFixed(1)} hrs · Lab`
        : `${duration.toFixed(1)} hrs · Theory`;
      ctx.fillStyle = "#64748B";
      ctx.font = `${7.5 * SCALE}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(durText, (MARGIN_X + 16) * SCALE, cardCenterY + 7 * SCALE);

      // Inset Divider 1
      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 0.75 * SCALE;
      ctx.beginPath();
      ctx.moveTo((MARGIN_X + 166) * SCALE, cardY + 7 * SCALE);
      ctx.lineTo((MARGIN_X + 166) * SCALE, cardY + cardH - 7 * SCALE);
      ctx.stroke();

      // Column 2: Course Code, BADGES SECTION, and Course Title
      const cleanCode = (cls.courseCode || "").replace(/\s+/g, "").toUpperCase();
      const courseTitle = (cls.courseTitle || "").trim() || getCourseTitle(cleanCode) || cleanCode;
      const sectionBadge = formatBatchSectionBadge(cls);

      // Line 1: Course Code
      ctx.fillStyle = "#0F172A";
      ctx.font = `bold ${11 * SCALE}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(cleanCode, (MARGIN_X + 178) * SCALE, cardCenterY - 4 * SCALE);
      const codeW = ctx.measureText(cleanCode).width;

      // Line 1: The Badge Section
      let cBadgeX = (MARGIN_X + 178) * SCALE + codeW + 8 * SCALE;
      const cBadgeY = cardCenterY - 11 * SCALE;
      const cBadgeH = 13.5 * SCALE;

      // Section Badge (e.g. 66_D)
      if (sectionBadge) {
        ctx.font = `bold ${7.5 * SCALE}px system-ui, -apple-system, sans-serif`;
        const sW = ctx.measureText(sectionBadge).width + 9 * SCALE;
        ctx.fillStyle = "#F1F5F9";
        drawRoundedRect(ctx, cBadgeX, cBadgeY, sW, cBadgeH, 2.5 * SCALE);
        ctx.fill();

        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 0.65 * SCALE;
        drawRoundedRect(ctx, cBadgeX, cBadgeY, sW, cBadgeH, 2.5 * SCALE);
        ctx.stroke();

        ctx.fillStyle = "#334155";
        ctx.textAlign = "center";
        ctx.fillText(sectionBadge, cBadgeX + sW / 2, cBadgeY + cBadgeH / 2);
        cBadgeX += sW + 5 * SCALE;
      }

      // Lab Badge
      if (isLab) {
        ctx.font = `bold ${7 * SCALE}px system-ui, -apple-system, sans-serif`;
        const lW = ctx.measureText("LAB").width + 8 * SCALE;
        ctx.fillStyle = "#F4F4F5";
        drawRoundedRect(ctx, cBadgeX, cBadgeY, lW, cBadgeH, 2.5 * SCALE);
        ctx.fill();

        ctx.strokeStyle = "#E4E4E7";
        ctx.lineWidth = 0.65 * SCALE;
        drawRoundedRect(ctx, cBadgeX, cBadgeY, lW, cBadgeH, 2.5 * SCALE);
        ctx.stroke();

        ctx.fillStyle = "#27272A";
        ctx.textAlign = "center";
        ctx.fillText("LAB", cBadgeX + lW / 2, cBadgeY + cBadgeH / 2);
        cBadgeX += lW + 5 * SCALE;
      }

      // Retake Badge
      if (isRetake) {
        ctx.font = `bold ${7 * SCALE}px system-ui, -apple-system, sans-serif`;
        const rW = ctx.measureText("RETAKE").width + 8 * SCALE;
        ctx.fillStyle = "#18181B";
        drawRoundedRect(ctx, cBadgeX, cBadgeY, rW, cBadgeH, 2.5 * SCALE);
        ctx.fill();

        ctx.strokeStyle = "#27272A";
        ctx.lineWidth = 0.65 * SCALE;
        drawRoundedRect(ctx, cBadgeX, cBadgeY, rW, cBadgeH, 2.5 * SCALE);
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText("RETAKE", cBadgeX + rW / 2, cBadgeY + cBadgeH / 2);
        cBadgeX += rW + 5 * SCALE;
      }

      // Custom Badge
      if (cls.isCustom) {
        ctx.font = `bold ${7 * SCALE}px system-ui, -apple-system, sans-serif`;
        const custW = ctx.measureText("CUSTOM").width + 8 * SCALE;
        ctx.fillStyle = "#F4F4F5";
        drawRoundedRect(ctx, cBadgeX, cBadgeY, custW, cBadgeH, 2.5 * SCALE);
        ctx.fill();

        ctx.strokeStyle = "#E4E4E7";
        ctx.lineWidth = 0.65 * SCALE;
        drawRoundedRect(ctx, cBadgeX, cBadgeY, custW, cBadgeH, 2.5 * SCALE);
        ctx.stroke();

        ctx.fillStyle = "#3F3F46";
        ctx.textAlign = "center";
        ctx.fillText("CUSTOM", cBadgeX + custW / 2, cBadgeY + cBadgeH / 2);
        cBadgeX += custW + 5 * SCALE;
      }

      // Line 2: Full Course Title (Regular font, NOT bold)
      ctx.fillStyle = "#64748B";
      ctx.font = `${8.5 * SCALE}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const maxTitleW = 345 * SCALE;
      const fittedTitle = fitText(ctx, courseTitle, maxTitleW);
      ctx.fillText(fittedTitle, (MARGIN_X + 178) * SCALE, cardCenterY + 7 * SCALE);

      // Inset Divider 2
      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 0.75 * SCALE;
      ctx.beginPath();
      ctx.moveTo((MARGIN_X + 538) * SCALE, cardY + 7 * SCALE);
      ctx.lineTo((MARGIN_X + 538) * SCALE, cardY + cardH - 7 * SCALE);
      ctx.stroke();

      // Column 3: Room Chip (X: MARGIN_X + 548)
      const roomInfo = splitRoomLabel(cls.room, cls.classType);
      const roomW = 104 * SCALE;
      const roomH = 22 * SCALE;
      const roomX = (MARGIN_X + 548) * SCALE;
      const roomY = cardCenterY - 11 * SCALE;

      ctx.fillStyle = "#F8FAFC";
      drawRoundedRect(ctx, roomX, roomY, roomW, roomH, 4 * SCALE);
      ctx.fill();

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 0.75 * SCALE;
      drawRoundedRect(ctx, roomX, roomY, roomW, roomH, 4 * SCALE);
      ctx.stroke();

      ctx.fillStyle = "#0F172A";
      ctx.font = `${8.5 * SCALE}px system-ui, -apple-system, sans-serif`; // Clean regular font!
      ctx.textAlign = "center";
      ctx.fillText(roomInfo.displayRoom, roomX + roomW / 2, cardCenterY);

      // Column 4: Faculty Avatar Badge (X: MARGIN_X + 662)
      const teacherW = 46 * SCALE;
      const teacherH = 22 * SCALE;
      const teacherX = (MARGIN_X + 662) * SCALE;
      const teacherY = cardCenterY - 11 * SCALE;

      ctx.fillStyle = "#F1F5F9";
      drawRoundedRect(ctx, teacherX, teacherY, teacherW, teacherH, 4 * SCALE);
      ctx.fill();

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 0.75 * SCALE;
      drawRoundedRect(ctx, teacherX, teacherY, teacherW, teacherH, 4 * SCALE);
      ctx.stroke();

      ctx.fillStyle = "#0F172A";
      ctx.font = `bold ${9.5 * SCALE}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(cls.instructor || "-", teacherX + teacherW / 2, cardCenterY);

      currentY += cardH;
      if (cIdx < dayClasses.length - 1) {
        currentY += budget.cardGap * SCALE;
      }
    }

    currentY += budget.dayGap * SCALE;
  }

  // 3. Subtle Footer
  ctx.fillStyle = "#94A3B8";
  ctx.font = `${8 * SCALE}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    `RoutineKit · Daffodil International University · ${routine.semester_label} (Routine ${routine.routine_version})`,
    (PDF_PAGE_WIDTH / 2) * SCALE,
    (PDF_PAGE_HEIGHT - 32) * SCALE
  );

  return canvas;
}

/**
 * Downloads a high-resolution, uncompressed PNG image of the timetable.
 */
export async function exportTimetableAsPng(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): Promise<void> {
  const canvas = await renderTimetableToCanvas(setup, routine, items);

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create PNG blob from canvas"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getExportFilename(setup, "png");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

/**
 * Generates an exact A4/Letter portrait PDF document containing the official timetable.
 */
export async function exportTimetableAsPdf(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): Promise<void> {
  const doc = await createTimetablePdfDocument(setup, routine, items);
  doc.save(getExportFilename(setup, "pdf"));
}

/**
 * Copies the timetable image directly to the system clipboard.
 */
export async function copyTimetableToClipboard(
  setup: StudentSetup,
  routine: PublishedRoutine,
  items: ScheduleItem[]
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Clipboard API not supported in this browser");
  }

  const canvas = await renderTimetableToCanvas(setup, routine, items);

  return new Promise<boolean>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    }, "image/png");
  });
}
