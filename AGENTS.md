# RoutineKit · DIU CSE Timetable & Routine Planner

Static Next.js app that turns DIU CSE class routine PDFs into student-specific weekly schedules with designed PDF/image exports and Google Calendar ICS files. Python scraper pipeline runs separately.

## Commands

- `npm run dev` — Start Next.js dev server (port 3000)
- `npm run build` — Static export to `out/`
- `npm test` — Run schedule logic + export tests
- `npm run lint` — ESLint
- `make scrape` — Run full scraper pipeline (Python)
- `make scrape-local LOCAL_PDF=path.pdf` — Parse a local routine PDF
- `make setup` — Install all deps (Node + Python venv)
- `make check` — Tests + production build

## Critical Rules

- **University PDF is the only source of truth.** Never invent rooms, teachers, times, or sections.
- **One schedule model everywhere.** The same `ScheduleItem[]` feeds the UI, PDF export, image export, and ICS file — exports must never disagree with the website.
- **Static export only.** `output: "export"` in `next.config.ts`. No server-side features, no API routes, no middleware.
- **No user accounts.** Preferences live in `localStorage` only. Portable via JSON import/export.
- **Atomic data publishing.** A failed scrape never overwrites the last-good routine. `scraper/last_known_good/` is the fallback.
- **Preserve the Next.js auto-generated block below.** It is re-created by `next dev`; commit it to keep the tree clean.

## Guidelines

- [Architecture & Data Flow](.agents/architecture.md)
- [TypeScript & React Conventions](.agents/typescript-react.md)
- [Scraper & Data Pipeline](.agents/scraper-pipeline.md)
- [Styling & Visual Design](.agents/styling.md)
- [Testing & Verification](.agents/testing.md)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
