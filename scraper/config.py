from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
SCRAPER_DIR = BASE_DIR / "scraper"
PUBLIC_DATA_DIR = BASE_DIR / "public" / "data"
LAST_GOOD_DIR = BASE_DIR / "scraper" / "last_known_good"

# URLs & Allowlist
NOTICE_URL = "https://webbackend.daffodilvarsity.edu.bd/department/cse/notice"
ALLOWED_DOMAINS = [
    "daffodilvarsity.edu.bd",
    "webbackend.daffodilvarsity.edu.bd",
]

# Trimester configuration (can be updated per semester as announced)
SEMESTER_CONFIG = {
    "id": "2026-fall",
    "label": "Fall 2026",
    "start_date": "2026-09-01",
    "end_date": "2026-12-31",
    "timezone": "Asia/Dhaka",
}

# Routine Table Time Slots (DIU CSE 6 standard slots)
SLOT_MAPPINGS = [
    {"slot_index": 0, "raw": "08:30-10:00", "start": "08:30", "end": "10:00"},
    {"slot_index": 1, "raw": "10:00-11:30", "start": "10:00", "end": "11:30"},
    {"slot_index": 2, "raw": "11:30-01:00", "start": "11:30", "end": "13:00"},
    {"slot_index": 3, "raw": "01:00-02:30", "start": "13:00", "end": "14:30"},
    {"slot_index": 4, "raw": "02:30-04:00", "start": "14:30", "end": "16:00"},
    {"slot_index": 5, "raw": "04:00-05:30", "start": "16:00", "end": "17:30"},
]

DAYS_MAP = {
    "SATURDAY": "Saturday",
    "SUNDAY": "Sunday",
    "MONDAY": "Monday",
    "TUESDAY": "Tuesday",
    "WEDNESDAY": "Wednesday",
    "THURSDAY": "Thursday",
    "FRIDAY": "Friday",
}
