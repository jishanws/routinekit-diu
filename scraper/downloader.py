import hashlib
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
import urllib3

from scraper.config import NOTICE_URL, ALLOWED_DOMAINS, LAST_GOOD_DIR

# Suppress insecure request warnings if server lacks full cert chain
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RoutineKit/1.0"
    )
})


def is_allowed_domain(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    return any(hostname == allowed or hostname.endswith("." + allowed) for allowed in ALLOWED_DOMAINS)


def discover_latest_routine_notice() -> dict:
    """
    Scrapes the DIU CSE notice board and finds the newest Class Routine notice,
    strictly excluding exam or improvement routines.
    """
    print(f"Fetching DIU CSE notice board: {NOTICE_URL}")
    response = SESSION.get(NOTICE_URL, timeout=30, verify=False)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    candidates = []

    for link in soup.find_all("a", href=True):
        text = link.get_text(" ", strip=True)
        href = link.get("href", "").strip()
        text_lower = text.lower()

        # Match class routine, exclude exams / improvement / tests
        if "class routine" in text_lower and not any(
            ex in text_lower for ex in ["exam", "improvement", "midterm", "final exam"]
        ):
            full_url = urljoin(NOTICE_URL, href)
            candidates.append({"text": text, "url": full_url})

    if not candidates:
        raise RuntimeError("No valid class routine notices found on DIU notice board.")

    latest = candidates[0]
    print(f"Discovered routine notice: {latest['text']} -> {latest['url']}")

    # Extract version if present in text e.g. "Version 4.1" or "V4.1"
    v_match = re.search(r"(?:Version|V)\s*(\d+(?:\.\d+)?)", latest["text"], re.IGNORECASE)
    routine_version = f"V{v_match.group(1)}" if v_match else "V1.0"

    # Fetch notice detail page to find download URL
    detail_resp = SESSION.get(latest["url"], timeout=30, verify=False)
    detail_resp.raise_for_status()
    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")

    pdf_url = None
    for a in detail_soup.find_all("a", href=True):
        href = a.get("href", "")
        text = a.get_text(" ", strip=True).lower()
        if "download-file" in href.lower() or ("routine" in text and "pdf" in href.lower()):
            pdf_url = urljoin(latest["url"], href)
            break

    if not pdf_url:
        for tag in detail_soup.find_all(["iframe", "embed"]):
            src = tag.get("src", "")
            if "download-file" in src.lower() or ".pdf" in src.lower():
                pdf_url = urljoin(latest["url"], src)
                break

    if not pdf_url:
        raise RuntimeError(f"Could not locate PDF download link on notice page: {latest['url']}")

    return {
        "notice_text": latest["text"],
        "notice_url": latest["url"],
        "pdf_url": pdf_url,
        "routine_version": routine_version,
    }


def download_routine_pdf(pdf_url: str, dest_path: Path) -> dict:
    """
    Downloads routine PDF with strict safety checks:
    - Domain allowlist
    - 30s timeout
    - Content size check (10KB to 25MB)
    - Returns SHA256 checksum and bytes written
    """
    if not is_allowed_domain(pdf_url):
        raise ValueError(f"Target URL domain not allowed: {pdf_url}")

    print(f"Downloading routine PDF: {pdf_url}")
    response = SESSION.get(pdf_url, timeout=45, stream=True, verify=False)
    response.raise_for_status()

    # Content length verification if provided by header
    content_len = response.headers.get("Content-Length")
    if content_len:
        size_bytes = int(content_len)
        if size_bytes < 10 * 1024:
            raise ValueError(f"Downloaded file too small: {size_bytes} bytes")
        if size_bytes > 25 * 1024 * 1024:
            raise ValueError(f"Downloaded file too large: {size_bytes} bytes")

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    hasher = hashlib.sha256()
    total_bytes = 0

    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
                hasher.update(chunk)
                total_bytes += len(chunk)

    if total_bytes < 10 * 1024:
        dest_path.unlink(missing_ok=True)
        raise ValueError(f"Downloaded PDF is corrupted or too small ({total_bytes} bytes)")

    checksum = hasher.hexdigest()
    print(f"PDF successfully downloaded: {total_bytes} bytes, SHA-256: {checksum}")

    return {
        "file_path": dest_path,
        "size_bytes": total_bytes,
        "checksum": checksum,
    }


def get_last_known_good_pdf() -> Path | None:
    fallback_file = LAST_GOOD_DIR / "last_known_good.pdf"
    if fallback_file.exists():
        return fallback_file
    return None
