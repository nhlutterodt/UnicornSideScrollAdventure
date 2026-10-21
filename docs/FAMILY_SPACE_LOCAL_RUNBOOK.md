# Running Family Space locally

This is an **experimental development prototype**, not a secure family application. The public Unicorn Run website is unaffected. Use **fictional examples only**; never real child profiles, assignments or personal information. No Supabase or AI provider connection is required.

## Start
From the repository root on a developer computer with Python 3.10+:

```sh
python server/family_local.py
```

Open `http://127.0.0.1:8765/family-local.html` on **the same computer**.

SQLite is created at `~/.family-space/development.sqlite3`, not in the repository or the public web root. You can choose a different file using `FAMILY_SQLITE_PATH`.

## Use
1. Create a Question with a prompt, subject and answer parts. Save it.
2. Open Workbooks; create titled sections and add questions from the question library. Save the workbook.
3. Open AI Proposal Intake to prepare structured instructions for a separate AI assistant. Paste its JSON proposal and explicitly review/accept it. AI is not automatically connected.
4. Open Sample Student Preview, choose a workbook, enter fictional answers and submit to see deterministic results/manual review states.
5. Export your questions/workbooks as JSON for backup. Never rely on the public site for SQLite persistence.

## Verify
```sh
python -m unittest discover -s tests -p 'test_family_sqlite.py' -v
npm test
npm run test:unit
npm run test:integration
npm run test:regression
```
The repository CI workflow also executes the SQLite integration suite. Run from a fresh checkout with JS dependencies installed and browsers available for Playwright.

## Known limits
- Local server bound to 127.0.0.1, not remotely reachable by phone. Do not change binding to a public interface.
- No authentication, access control, cross-device sync, file uploads, real personal records, or hosted SQLite.
- Not an end-to-end workbook publishing system; authoring snapshot versions are immutable and revision saves create new records.
- No model API connection; AI proposal is manual copy/paste. No automated grading of long descriptive answers.
- Objective evaluation uses development-only server logic; not a substitute for the eventual authenticated Supabase service.
- Import of an entire backup library, advanced rubric review and true mobile browser QA are not yet completed.
- Separate dedicated Supabase project is the migration target. The existing Vista Solutions Supabase database must never be used for Family Space.
