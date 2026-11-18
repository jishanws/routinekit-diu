import argparse
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scraper.downloader import (
    discover_latest_routine_notice,
    download_routine_pdf,
    get_last_known_good_pdf,
)
from scraper.parser import extract_raw_classes, merge_consecutive_lab_slots
from scraper.validator import validate_routine_dataset
from scraper.publish import publish_success_dataset, record_failure_status


def run_pipeline(local_pdf: str | None = None) -> int:
    now_iso = datetime.now(timezone.utc).isoformat()
    metadata = {
        "fetched_at": now_iso,
        "routine_version": "V4.1",
        "notice_url": "",
        "pdf_url": "",
        "checksum": "",
    }

    temp_pdf_path = None

    try:
        if local_pdf:
            pdf_path = Path(local_pdf)
            if not pdf_path.exists():
                raise FileNotFoundError(f"Specified local PDF not found: {local_pdf}")
            print(f"Using provided local PDF: {pdf_path}")
            metadata["routine_version"] = "V4.1"
            metadata["checksum"] = "local-file-checksum"
        else:
            try:
                notice_info = discover_latest_routine_notice()
                metadata["notice_url"] = notice_info["notice_url"]
                metadata["pdf_url"] = notice_info["pdf_url"]
                metadata["routine_version"] = notice_info["routine_version"]

                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    temp_pdf_path = Path(tmp.name)

                download_res = download_routine_pdf(notice_info["pdf_url"], temp_pdf_path)
                pdf_path = temp_pdf_path
                metadata["checksum"] = download_res["checksum"]

            except Exception as net_err:
                print(f"Online discovery/download failed: {net_err}")
                print("Checking for last-known-good local fallback...")
                fallback_pdf = get_last_known_good_pdf()
                if not fallback_pdf or not fallback_pdf.exists():
                    raise RuntimeError(f"Online fetch failed and no fallback PDF found. Reason: {net_err}")
                pdf_path = fallback_pdf
                print(f"Proceeding with fallback PDF: {pdf_path}")

        # 1. Table Extraction
        raw_classes = extract_raw_classes(pdf_path)

        # 2. Lab Merging
        classes = merge_consecutive_lab_slots(raw_classes)

        # 3. Validation
        is_valid, report = validate_routine_dataset(classes)
        print(f"Validation Result: Valid={is_valid}")
        print(f"Total Classes: {report['total_classes']}, Batches: {report['unique_batches']}, Sections: {report['unique_sections']}")

        if not is_valid:
            error_details = "; ".join(report.get("errors", ["Validation failure"]))
            raise ValueError(f"Routine validation failed: {error_details}")

        # 4. Atomic Publish
        publish_success_dataset(classes, metadata, pdf_path)
        print("Scraper pipeline completed successfully!")
        return 0

    except Exception as e:
        error_msg = str(e)
        print(f"Scraper error encountered: {error_msg}", file=sys.stderr)
        record_failure_status(error_msg)
        return 1

    finally:
        if temp_pdf_path and temp_pdf_path.exists():
            try:
                temp_pdf_path.unlink()
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="DIU CSE Routine Scraper & Parser")
    parser.add_argument("--local-pdf", type=str, help="Path to local routine PDF to parse")
    args = parser.parse_args()

    exit_code = run_pipeline(local_pdf=args.local_pdf)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
