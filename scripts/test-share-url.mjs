import {
  generateShareUrl,
  parseShareUrl,
  encodeBase64Url,
  decodeBase64Url,
} from "../src/lib/routine/shareUrl.ts";

console.log("=== TESTING ROUTINE SHARE URL ENGINE ===");

// 1. Base64URL unicode roundtrip test
const testStr = JSON.stringify({ message: "CSE 316 (Batch 66_D & Retake)" });
const encoded = encodeBase64Url(testStr);
const decoded = decodeBase64Url(encoded);
if (decoded !== testStr) {
  throw new Error(`Base64URL roundtrip failed! Expected ${testStr}, got ${decoded}`);
}
console.log("✓ Base64URL Unicode roundtrip verified.");

// 2. Standard batch-section share URL
const standardSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "batch-section",
  batch: "66",
  section: "D",
  courses: [
    { courseCode: "CSE316", batch: "66", section: "D", isRetake: false },
    { courseCode: "CSE326", batch: "66", section: "D", isRetake: false },
  ],
};

const standardUrl = generateShareUrl(standardSetup, "https://routinekit.vercel.app");
console.log("  Standard URL:", standardUrl);
if (!standardUrl.includes("#s=66_D")) {
  throw new Error(`Expected #s=66_D in URL, got ${standardUrl}`);
}

const parsedStandard = parseShareUrl(standardUrl);
if (!parsedStandard) throw new Error("Failed to parse standard share URL");
if (parsedStandard.setup.batch !== "66" || parsedStandard.setup.section !== "D") {
  throw new Error(`Expected batch 66 section D, got ${parsedStandard.setup.batch}_${parsedStandard.setup.section}`);
}
console.log("✓ Standard cohort URL generation and parsing verified:", parsedStandard.title);

// 3. Query params format test (?b=69&s=A1)
const queryUrl = "https://routinekit.vercel.app/?b=69&s=A1";
const parsedQuery = parseShareUrl(queryUrl);
if (!parsedQuery) throw new Error("Failed to parse query param URL");
if (parsedQuery.setup.batch !== "69" || parsedQuery.setup.section !== "A") {
  throw new Error(`Expected batch 69 section A (normalized from A1), got ${parsedQuery.setup.batch}_${parsedQuery.setup.section}`);
}
console.log("✓ Query parameter URL (?b=69&s=A1) normalization verified:", parsedQuery.title);

// 4. Custom setup with retake and custom overrides
const customSetup = {
  schema_version: "1.0",
  semester_id: "2026-fall",
  mode: "mixed",
  batch: "66",
  section: "D",
  courses: [
    { courseCode: "CSE316", batch: "66", section: "D", isRetake: false },
    { courseCode: "CSE221", batch: "RE", section: "RE_A(3C)", isRetake: true, customLabel: "Retake Course" },
  ],
  customOverrides: {
    "cse316_mon": {
      isCustom: true,
      room: "KT-701",
      instructor: "TAR (Guest)",
    },
  },
};

const customUrl = generateShareUrl(customSetup, "https://routinekit.vercel.app");
console.log("  Custom URL:", customUrl);
if (!customUrl.includes("#share=")) {
  throw new Error(`Expected #share= in URL for custom setup, got ${customUrl}`);
}

const parsedCustom = parseShareUrl(customUrl);
if (!parsedCustom) throw new Error("Failed to parse custom share URL");
if (parsedCustom.setup.mode !== "mixed") {
  throw new Error(`Expected mode mixed, got ${parsedCustom.setup.mode}`);
}
if (parsedCustom.setup.courses.length !== 2) {
  throw new Error(`Expected 2 courses, got ${parsedCustom.setup.courses.length}`);
}
const retake = parsedCustom.setup.courses.find((c) => c.courseCode === "CSE221");
if (!retake || !retake.isRetake || retake.section !== "RE_A(3C)") {
  throw new Error("Retake course not properly deserialized!");
}
if (parsedCustom.setup.customOverrides?.["cse316_mon"]?.room !== "KT-701") {
  throw new Error("Custom room override not properly deserialized!");
}
console.log("✓ Custom retake and room override share URL verified:", parsedCustom.title);

// 5. Invalid / Tampered URL rejection
if (parseShareUrl("https://routinekit.vercel.app/#share=invalid-base64!!!") !== null) {
  throw new Error("Expected invalid base64 share URL to be rejected!");
}
if (parseShareUrl("https://routinekit.vercel.app/") !== null) {
  throw new Error("Expected bare root URL to return null (no share param)!");
}
console.log("✓ Tampered / invalid share URLs properly rejected.");

console.log("=== ALL SHARE URL ENGINE CHECKS PASSED ===");
