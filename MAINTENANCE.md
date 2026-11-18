# RoutineKit Maintainer Guide

This guide covers semester rollover, routine scraper operations, troubleshooting validation failures, and restoring the last-known-good dataset.

---

## 1. Updating Semester Configuration

When a new trimester starts (Spring / Summer / Fall), update the semester configuration in `scraper/config.py`:

```python
SEMESTER_CONFIG = {
    "id": "2027-spring",
    "label": "Spring 2027",
    "start_date": "2027-01-05",
    "end_date": "2027-04-30",
    "timezone": "Asia/Dhaka",
}
```

- **`start_date` / `end_date`**: Match the official trimester dates received via university notice/email. These dates bound the recurrence rule (`RRULE:UNTIL=...`) in exported Google Calendar `.ics` files.
- **`timezone`**: Always set to `Asia/Dhaka`.

---

## 2. Running & Retrying Scraper Runs

### Manual Local Run
To run the scraper manually on your machine:

```bash
# Ensure virtual environment is active
source .venv/bin/activate

# Install dependencies if needed
pip install -r scraper/requirements.txt

# Run live scraper (fetches newest notice from DIU website)
python scraper/scraper.py

# Or parse a downloaded offline PDF directly:
python scraper/scraper.py --local-pdf "/path/to/CSE_Class_Routine_V4.1.pdf"
```

### GitHub Actions Manual Trigger
1. Navigate to repository **Actions** tab on GitHub.
2. Select **Routine Refresh Pipeline**.
3. Click **Run workflow** on the `main` branch.

---

## 3. Atomic Publishing & Fallback Behavior

RoutineKit uses an atomic dataset replacement pattern:
- **Validation Pass**: The scraper parses the PDF, maps the 6 standard 18-column slots, merges consecutive lab sessions, and runs validation. If all checks pass, it writes:
  - `public/data/routine-latest.json`
  - `public/data/status.json` (`is_stale: false, under_review: false`)
  - A timestamped backup in `scraper/last_known_good/last_known_good.json`
- **Validation / Fetch Failure**: If the notice page is down, the PDF URL is missing, or the table fails validation checks (< 400 classes, corrupted times):
  - The previous `routine-latest.json` is **never overwritten**.
  - `public/data/status.json` records `under_review: true` and logs the human-readable error reason for maintainers.

### Restoring Last-Known-Good Routine
If an erroneous file was published, immediately restore the last known good snapshot:

```bash
cp scraper/last_known_good/last_known_good.json public/data/routine-latest.json
```

---

## 4. Diagnosing Parser Validation Failures

If `validator.py` flags errors:
1. **Low class count (< 400)**: DIU might have published an incomplete draft or an exam routine that slipped through filter rules. Check the notice title.
2. **Shifted time columns**: DIU PDFs occasionally insert extra header columns. The parser uses a strict 18-column slice (`row[:18]`) and pads missing cells to avoid slot shifts. Inspect table structures with:
   ```python
   import pdfplumber
   with pdfplumber.open("routine.pdf") as pdf:
       print(pdf.pages[0].extract_tables())
   ```
3. **New Course Codes**: If new curriculum courses appear with missing full titles, add their canonical names to `scraper/course_catalog.py`.

---

## 5. Free-Tier Operational Bounds

RoutineKit is strictly designed to operate within 100% free tiers:
- **Static Frontend**: Pre-rendered static export (`out/`) hosted on GitHub Pages, Cloudflare Pages, or Vercel Hobby tier. No database or serverless runtime costs.
- **Scraper Automation**: GitHub Actions runs daily on cron (well below the 2,000 free minutes/month threshold for public and private repositories).
- **Client Storage**: User preferences reside solely in browser `localStorage`.
