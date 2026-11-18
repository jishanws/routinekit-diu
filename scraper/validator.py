import re
from typing import List, Dict, Any, Tuple
from scraper.config import DAYS_MAP


def validate_routine_dataset(classes: List[Dict[str, Any]]) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates parsed routine dataset against integrity rules before publishing.
    Returns (is_valid, validation_report)
    """
    errors: List[str] = []
    warnings: List[str] = []

    if not classes:
        return False, {"error": "Routine dataset is completely empty."}

    # Minimum threshold: DIU CSE semester has at least 500 classes
    if len(classes) < 400:
        errors.append(f"Class count ({len(classes)}) is suspiciously low (< 400).")

    valid_days = set(DAYS_MAP.values())
    time_regex = re.compile(r"^\d{2}:\d{2}$")
    course_regex = re.compile(r"^[A-Z]{2,6}\s*\d{3,4}$", re.I)

    seen_meetings = set()
    duplicates_count = 0

    for idx, cls in enumerate(classes):
        # 1. Check required fields
        required_fields = ["id", "courseCode", "day", "startTime", "endTime", "room", "batch", "section", "classType"]
        missing = [f for f in required_fields if not cls.get(f)]
        if missing:
            errors.append(f"Item #{idx} missing required fields: {missing} (Course: {cls.get('courseCode')})")

        # 2. Check valid day
        day = cls.get("day")
        if day not in valid_days:
            errors.append(f"Item #{idx} has invalid day '{day}'")

        # 3. Check time format & ordering
        start = cls.get("startTime", "")
        end = cls.get("endTime", "")
        if not time_regex.match(start) or not time_regex.match(end):
            errors.append(f"Item #{idx} has malformed time: {start} - {end}")
        elif start >= end:
            errors.append(f"Item #{idx} start time ({start}) is not before end time ({end})")

        # 4. Check course code format
        code = cls.get("courseCode", "")
        if not course_regex.match(code):
            warnings.append(f"Item #{idx} has non-standard course code: '{code}'")

        # 5. Check duplicate meetings (same day, start, room, course, section, subsection)
        dup_key = (
            cls.get("day"),
            cls.get("startTime"),
            cls.get("room"),
            cls.get("courseCode"),
            cls.get("batch"),
            cls.get("section"),
            cls.get("subsection", ""),
        )
        if dup_key in seen_meetings:
            duplicates_count += 1
        seen_meetings.add(dup_key)

    if duplicates_count > 50:
        errors.append(f"Anomalously high duplicate count: {duplicates_count}")
    elif duplicates_count > 0:
        warnings.append(f"Found {duplicates_count} repeated meetings.")

    is_valid = len(errors) == 0

    report = {
        "is_valid": is_valid,
        "total_classes": len(classes),
        "unique_batches": len(set(c.get("batch") for c in classes)),
        "unique_sections": len(set(f"{c.get('batch')}_{c.get('section')}" for c in classes)),
        "unique_courses": len(set(c.get("courseCode") for c in classes)),
        "duplicates_count": duplicates_count,
        "errors": errors[:50],
        "warnings": warnings[:50],
    }

    return is_valid, report
