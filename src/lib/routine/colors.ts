/**
 * Deterministic course color assignments for high-contrast, editorial calendar styling.
 * Used for course identity rails, badges, and accents (Campus Fieldnotes visual language).
 */

export interface CourseColorTheme {
  rail: string;       // Distinct accent rail for left edge of card
  bg: string;         // Subtle card tint if needed
  border: string;     // Border color
  text: string;       // Primary text / header accent
  badgeBg: string;    // Badge background
  badgeText: string;  // Badge text
}

const PALETTE: CourseColorTheme[] = [
  {
    // Slate 900
    rail: "#0f172a",
    bg: "rgba(15, 23, 42, 0.04)",
    border: "rgba(15, 23, 42, 0.2)",
    text: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.08)",
    badgeText: "#0f172a",
  },
  {
    // Slate 700
    rail: "#334155",
    bg: "rgba(51, 65, 85, 0.04)",
    border: "rgba(51, 65, 85, 0.2)",
    text: "#334155",
    badgeBg: "rgba(51, 65, 85, 0.08)",
    badgeText: "#1e293b",
  },
  {
    // Slate 600
    rail: "#475569",
    bg: "rgba(71, 85, 105, 0.04)",
    border: "rgba(71, 85, 105, 0.2)",
    text: "#475569",
    badgeBg: "rgba(71, 85, 105, 0.08)",
    badgeText: "#334155",
  },
  {
    // Slate 800
    rail: "#1e293b",
    bg: "rgba(30, 41, 59, 0.04)",
    border: "rgba(30, 41, 59, 0.2)",
    text: "#1e293b",
    badgeBg: "rgba(30, 41, 59, 0.08)",
    badgeText: "#0f172a",
  },
];

export function getCourseColor(courseCode: string): CourseColorTheme {
  const norm = courseCode.replace(/\s+/g, "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
