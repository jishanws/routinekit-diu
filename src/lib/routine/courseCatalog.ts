/**
 * DIU Department of Computer Science and Engineering Course Catalog.
 * Maps course codes to canonical course titles.
 */

export const DIU_COURSE_TITLES: Record<string, string> = {
  // General & Foundation
  AOL101: "Art of Living",
  BNS101: "Bangladesh Studies",
  ENG101: "Basic English",
  ENG102: "English for Academic Purposes",
  MAT101: "Mathematics I (Differential and Integral Calculus)",
  MAT102: "Mathematics II (Linear Algebra and Coordinate Geometry)",
  MAT211: "Mathematics III (Ordinary and Partial Differential Equations)",
  MAT221: "Mathematics IV (Complex Variables and Fourier Analysis)",
  PHY101: "Physics I (Mechanics, Waves, Thermodynamics)",
  PHY102: "Physics I Lab",
  PHY103: "Physics II (Electromagnetism and Modern Physics)",
  STA101: "Statistics and Probability",
  ACT101: "Financial and Managerial Accounting",
  ACT327: "Financial and Managerial Accounting",
  ECO101: "Principles of Economics",

  // Level 1 Core
  CSE112: "Computer Fundamentals",
  CSE113: "Programming Language I (Structured Programming)",
  CSE114: "Programming Language I Lab",
  CSE115: "Introduction to Computing",
  CSE121: "Structured Programming Language",
  CSE122: "Structured Programming Language Lab",
  CSE123: "Discrete Mathematics",
  CSE124: "Data Structure",
  CSE125: "Data Structure Lab",
  CSE131: "Discrete Mathematics",
  CSE132: "Electrical Circuits",
  CSE133: "Electrical Circuits Lab",

  // Level 2 Core
  CSE211: "Object Oriented Programming",
  CSE212: "Object Oriented Programming Lab",
  CSE213: "Digital Logic Design",
  CSE214: "Digital Logic Design Lab",
  CSE215: "Data Structures",
  CSE216: "Data Structures Lab",
  CSE221: "Algorithms",
  CSE222: "Algorithms Lab",
  CSE223: "Digital Electronics",
  CSE224: "Digital Electronics Lab",
  CSE225: "Data Communication",
  CSE226: "Numerical Methods",
  CSE227: "Algorithms Lab",
  CSE228: "Theory of Computation",
  CSE231: "Microprocessor and Assembly Language",
  CSE232: "Microprocessor and Assembly Language Lab",
  CSE233: "Data Structures",
  CSE234: "Data Structures Lab",
  CSE235: "Theory of Computation",
  CSE237: "Numerical Methods",

  // Level 3 Core & Electives
  CSE311: "Database Management Systems",
  CSE312: "Database Management Systems Lab",
  CSE313: "Compiler Design",
  CSE314: "Compiler Design Lab",
  CSE315: "Software Engineering",
  CSE316: "Artificial Intelligence",
  CSE317: "Software Engineering Lab",
  CSE321: "Computer Networks",
  CSE322: "Computer Networks Lab",
  CSE323: "Operating Systems",
  CSE324: "Operating Systems Lab",
  CSE325: "Information System Design",
  CSE326: "Social and Professional Issues in Computing",
  CSE328: "Introduction to Data Science",
  CSE331: "System Analysis and Design",
  CSE332: "System Analysis and Design Lab",
  CSE333: "Computer Graphics",
  CSE334: "Computer Graphics Lab",
  CSE335: "Artificial Intelligence",

  // Level 4 Core & Electives
  CSE411: "Computer Architecture and Organization",
  CSE412: "Artificial Intelligence",
  CSE413: "Artificial Intelligence Lab",
  CSE414: "Web Engineering",
  CSE415: "Web Engineering Lab",
  CSE416: "Compiler Design Lab",
  CSE417: "Information System Security",
  CSE418: "Machine Learning",
  CSE419: "Machine Learning Lab",
  CSE421: "Computer Graphics",
  CSE422: "Computer Graphics Lab",
  CSE423: "Computer Networks Lab",
  CSE431: "Mobile Application Development",
  CSE432: "Mobile Application Development Lab",
  CSE437: "Computer Vision",
  CSE438: "Business Intelligence",
  CSE441: "Cloud Computing",
  CSE442: "Natural Language Processing",
  CSE443: "Cloud Computing Lab",
  CSE444: "Information Security",
  CSE445: "Mobile Application Development",
  CSE451: "Internet of Things",
  CSE452: "Deep Learning",
  CSE453: "High Performance Computing",
  CSE454: "Computer Vision Lab",
  CSE471: "Data Mining and Machine Learning",
  CSE472: "Machine Learning Lab",
  CSE473: "Pattern Recognition",
  CSE474: "Big Data Analytics",
  CSE491: "Project / Internship",
};

/**
 * Returns canonical course title for a course code (e.g. "CSE 316" -> "Artificial Intelligence").
 * Returns empty string if not found.
 */
export function getCourseTitle(courseCode: string): string {
  if (!courseCode) return "";
  const normalized = courseCode.replace(/\s+/g, "").toUpperCase();
  return DIU_COURSE_TITLES[normalized] || "";
}
