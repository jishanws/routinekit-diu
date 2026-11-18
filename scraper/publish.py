import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List

from scraper.config import PUBLIC_DATA_DIR, LAST_GOOD_DIR, SEMESTER_CONFIG


def publish_success_dataset(
    classes: List[Dict[str, Any]],
    metadata: Dict[str, Any],
    pdf_path: Path,
) -> None:
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    LAST_GOOD_DIR.mkdir(parents=True, exist_ok=True)

    now_iso = datetime.now(timezone.utc).isoformat()

    # Build clean PublishedRoutine payload
    published_routine = {
        "schema_version": "1.0",
        "semester_id": SEMESTER_CONFIG["id"],
        "semester_label": SEMESTER_CONFIG["label"],
        "start_date": SEMESTER_CONFIG["start_date"],
        "end_date": SEMESTER_CONFIG["end_date"],
        "timezone": SEMESTER_CONFIG["timezone"],
        "routine_version": metadata.get("routine_version", "V1.0"),
        "source_notice_url": metadata.get("notice_url", ""),
        "source_pdf_url": metadata.get("pdf_url", ""),
        "fetched_at": metadata.get("fetched_at", now_iso),
        "published_at": now_iso,
        "source_checksum": metadata.get("checksum", ""),
        "classes": [
            {k: v for k, v in c.items() if not k.startswith("_")}
            for c in classes
        ],
    }

    # Write routine-latest.json
    target_routine_json = PUBLIC_DATA_DIR / "routine-latest.json"
    target_routine_json.write_text(
        json.dumps(published_routine, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # Backup to last_known_good.json
    backup_routine_json = LAST_GOOD_DIR / "last_known_good.json"
    backup_routine_json.write_text(
        json.dumps(published_routine, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # Backup PDF and copy to public if exists
    if pdf_path.exists():
        target_last_good = LAST_GOOD_DIR / "last_known_good.pdf"
        if pdf_path.resolve() != target_last_good.resolve():
            shutil.copy2(pdf_path, target_last_good)
        target_public = PUBLIC_DATA_DIR / "routine-latest.pdf"
        if pdf_path.resolve() != target_public.resolve():
            shutil.copy2(pdf_path, target_public)

    # Update status.json
    status_data = {
        "current_version": metadata.get("routine_version", "V1.0"),
        "semester_id": SEMESTER_CONFIG["id"],
        "semester_label": SEMESTER_CONFIG["label"],
        "source_date": datetime.now().strftime("%Y-%m-%d"),
        "last_successful_refresh": now_iso,
        "is_stale": False,
        "under_review": False,
        "total_classes": len(classes),
        "notes": f"Successfully parsed and published from DIU CSE notice ({metadata.get('routine_version', '')}).",
    }

    (PUBLIC_DATA_DIR / "status.json").write_text(
        json.dumps(status_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Successfully published {len(classes)} classes to {target_routine_json}")


def record_failure_status(error_message: str) -> None:
    """
    On failure, preserves existing routine-latest.json and flags under_review / is_stale in status.json
    """
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    status_file = PUBLIC_DATA_DIR / "status.json"

    prev_status = {}
    if status_file.exists():
        try:
            prev_status = json.loads(status_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    status_data = {
        "current_version": prev_status.get("current_version", "V1.0"),
        "semester_id": prev_status.get("semester_id", SEMESTER_CONFIG["id"]),
        "semester_label": prev_status.get("semester_label", SEMESTER_CONFIG["label"]),
        "source_date": prev_status.get("source_date", datetime.now().strftime("%Y-%m-%d")),
        "last_successful_refresh": prev_status.get("last_successful_refresh", ""),
        "is_stale": True,
        "under_review": True,
        "error_reason": error_message,
        "notes": f"Scraper failure encountered: {error_message}. Preserving previous good dataset.",
    }

    status_file.write_text(
        json.dumps(status_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Recorded failure status without overwriting routine dataset: {error_message}")
