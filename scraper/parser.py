import re
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
import pdfplumber

from scraper.config import SLOT_MAPPINGS, DAYS_MAP
from scraper.course_catalog import lookup_course_title


def clean_text(val: Any) -> str:
    if val is None:
        return ""
    text = str(val).replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def parse_course_cell(cell_text: str):
    """
    Parses cell text like 'CSE311(64_D)' or 'CSE 311(64_D1)' or 'CSE223(RE_A(3C))'.
    Returns (course_code, raw_section)
    """
    cleaned = clean_text(cell_text)
    match = re.match(r"^([A-Z]{2,6}\s*\d{3,4})\s*\((.*)\)$", cleaned, re.IGNORECASE)
    if not match:
        return None, None
    raw_code = match.group(1).strip()
    # Normalize course code to have a single space between letters and numbers, e.g. 'CSE 311'
    code_match = re.match(r"^([A-Z]+)\s*(\d+)$", raw_code, re.IGNORECASE)
    if code_match:
        norm_code = f"{code_match.group(1).upper()} {code_match.group(2)}"
    else:
        norm_code = raw_code.upper()
    raw_section = match.group(2).strip()
    return norm_code, raw_section


def parse_section_info(raw_section: str) -> Dict[str, str]:
    """
    Extracts batch, main section, and subsection.
    Examples:
      '64_D' -> batch: '64', section: 'D', subsection: ''
      '64_D1' -> batch: '64', section: 'D', subsection: 'D1'
      '67_F2' -> batch: '67', section: 'F', subsection: 'F2'
      'RE_A(3C)' -> batch: 'RE', section: 'A', subsection: '3C'
      'RE_B' -> batch: 'RE', section: 'B', subsection: ''
    """
    cleaned = clean_text(raw_section).replace(" ", "")

    # Normal pattern: 64_D or 64_D1 or 64_D2
    m1 = re.match(r"^(\d+)_([A-Z])([A-Z]?\d*)$", cleaned, re.IGNORECASE)
    if m1:
        batch = m1.group(1)
        sec_letter = m1.group(2).upper()
        suffix = m1.group(3)
        subsection = f"{sec_letter}{suffix}" if suffix and not suffix.startswith(sec_letter) else suffix
        return {
            "batch": batch,
            "section": sec_letter,
            "subsection": subsection if subsection else "",
            "full_section": f"{batch}_{sec_letter}",
        }

    # Retake / Special pattern: RE_A or RE_A(3C)
    m2 = re.match(r"^([A-Z0-9]+)_([A-Z])(?:\((.*?)\))?$", cleaned, re.IGNORECASE)
    if m2:
        batch = m2.group(1).upper()
        sec = m2.group(2).upper()
        sub = m2.group(3) or ""
        return {
            "batch": batch,
            "section": sec,
            "subsection": sub,
            "full_section": f"{batch}_{sec}",
        }

    # Fallback for arbitrary section strings
    return {
        "batch": "General",
        "section": cleaned,
        "subsection": "",
        "full_section": cleaned,
    }


def clean_room(room_str: str) -> str:
    cleaned = clean_text(room_str)
    # Remove nested parenthetical lab notes from room ID, e.g. 'KT-501(A) (COM LAB)' -> 'KT-501(A)'
    cleaned = re.sub(r"\s*\([^)]*LAB[^)]*\)", "", cleaned, flags=re.I)
    return clean_text(cleaned)


def is_lab_cell(room_str: str, course_code: str) -> bool:
    room_upper = (room_str or "").upper()
    if "LAB" in room_upper:
        return True
    # Course codes ending in even numbers or specific known lab codes often indicate labs,
    # but the primary source indicator in DIU CSE routine is the room description.
    return False


def detect_day_from_page(text: str) -> Optional[str]:
    if not text:
        return None
    upper = text.upper()
    for key, day_name in DAYS_MAP.items():
        # Match day as standalone word
        if re.search(r"\b" + key + r"\b", upper):
            return day_name
    return None


def detect_day_from_row(row: List[Any]) -> Optional[str]:
    """
    Checks if a table row represents a day divider (e.g. ['SATURDAY'] or ['SUNDAY']).
    """
    if not row:
        return None
    row_text = " ".join([clean_text(c) for c in row if c]).strip().upper()
    for key, val in DAYS_MAP.items():
        if re.match(r"^" + key + r"$", row_text):
            return val
        for cell in row:
            if clean_text(cell).strip().upper() == key:
                return val
    return None


def generate_class_id(batch: str, section: str, subsection: str, course_code: str, day: str, start_time: str, room: str) -> str:
    key = f"{batch}_{section}_{subsection}_{course_code}_{day}_{start_time}_{room}".lower()
    return hashlib.md5(key.encode("utf-8")).hexdigest()[:12]


def extract_raw_classes(pdf_path: Path) -> List[Dict[str, Any]]:
    classes: List[Dict[str, Any]] = []
    current_day: Optional[str] = None

    print(f"Parsing PDF tables from: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            if not tables:
                continue

            for table in tables:
                for row in table:
                    if not row or len(row) < 1:
                        continue

                    day_in_row = detect_day_from_row(row)
                    if day_in_row:
                        current_day = day_in_row
                        continue

                    if not current_day:
                        day_on_page = detect_day_from_page(page.extract_text() or "")
                        if day_on_page:
                            current_day = day_on_page

                    if not current_day:
                        continue

                    if len(row) < 3:
                        continue

                    # Pad to 18 columns to guarantee slot mapping without shifting
                    row_cleaned = [clean_text(cell) for cell in row]
                    if len(row_cleaned) < 18:
                        row_cleaned += [""] * (18 - len(row_cleaned))
                    row_cleaned = row_cleaned[:18]

                    # Process the 6 time slots
                    for slot_info in SLOT_MAPPINGS:
                        slot_idx = slot_info["slot_index"]
                        base_idx = slot_idx * 3

                        room_cell = row_cleaned[base_idx]
                        course_cell = row_cleaned[base_idx + 1]
                        teacher_cell = row_cleaned[base_idx + 2]

                        if not course_cell:
                            continue

                        # Skip header rows containing 'Room', 'Course', 'Teacher'
                        if course_cell.lower() in ["course", "routine", "effective from"]:
                            continue

                        course_code, raw_sec = parse_course_cell(course_cell)
                        if not course_code or not raw_sec:
                            continue

                        sec_info = parse_section_info(raw_sec)
                        room = clean_room(room_cell)
                        teacher = clean_text(teacher_cell)
                        if teacher == "-":
                            teacher = ""

                        class_type = "lab" if is_lab_cell(room_cell, course_code) else "theory"

                        cls_id = generate_class_id(
                            sec_info["batch"],
                            sec_info["section"],
                            sec_info["subsection"],
                            course_code,
                            current_day,
                            slot_info["start"],
                            room,
                        )

                        item = {
                            "id": cls_id,
                            "courseCode": course_code,
                            "courseTitle": "",
                            "batch": sec_info["batch"],
                            "section": sec_info["section"],
                            "subsection": sec_info["subsection"],
                            "day": current_day,
                            "startTime": slot_info["start"],
                            "endTime": slot_info["end"],
                            "room": room,
                            "instructor": teacher,
                            "classType": class_type,
                            "rawSlot": slot_info["raw"],
                            "slotIndex": slot_idx,
                            "_page": page_idx,
                        }
                        classes.append(item)

    print(f"Extracted {len(classes)} raw class instances from PDF.")
    return classes


def merge_consecutive_lab_slots(raw_classes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merges adjacent lab slots into a single class block (e.g. 10:00-11:30 + 11:30-13:00 -> 10:00-13:00)
    ONLY when course, day, room, teacher, batch, section, and subsection match.
    """
    if not raw_classes:
        return []

    # Sort strictly chronologically by day, batch, section, slotIndex
    sorted_classes = sorted(
        raw_classes,
        key=lambda x: (
            x["day"],
            x["batch"],
            x["section"],
            x["subsection"],
            x["courseCode"],
            x["slotIndex"],
        ),
    )

    merged: List[Dict[str, Any]] = []

    for item in sorted_classes:
        if not merged:
            merged.append(item.copy())
            continue

        prev = merged[-1]
        is_same_meeting = (
            prev["day"] == item["day"]
            and prev["batch"] == item["batch"]
            and prev["section"] == item["section"]
            and prev["subsection"] == item["subsection"]
            and prev["courseCode"] == item["courseCode"]
            and prev["room"] == item["room"]
            and prev["instructor"] == item["instructor"]
            and prev["classType"] == "lab"
            and item["classType"] == "lab"
            and prev["endTime"] == item["startTime"]
        )

        if is_same_meeting:
            # Extend previous meeting to current meeting's end time
            prev["endTime"] = item["endTime"]
            prev["rawSlot"] = f"{prev['startTime']}-{item['endTime']}"
        else:
            merged.append(item.copy())

    print(f"After lab merging: {len(merged)} classes (reduced from {len(raw_classes)})")
    return merged
