# Audit: portal-original.html

Single file, 550 lines: inline CSS (lines 5-256), markup (259-331), inline JS (333-547). No build step, no dependencies.

## 1. Flows

**Student check-in (the only flow)**
1. Fill 6 fields on one page: email, stress (number), struggling, assignments behind, help type, follow-up.
2. Click "Submit Check-In" (`getSupport`) and the inline `onclick` reads the fields with no validation.
3. `mockSubmitCheckIn` waits 400ms, then runs the matching logic and returns the result.
4. The result is written as plain text into `#result` (counselor, level, time, message). The tutor is not shown.
5. The row is pushed to the in-memory `students` array and the dashboard table is rebuilt.

**Reset**: clears the fields and the result box. It does not clear the dashboard.

**Dashboard**: a table on the same page that lists every check-in (email, risk, tutor, counselor, time, status). All state is in memory, so a reload wipes it.

## 2. Data

| Item | Shape | Notes |
|---|---|---|
| `counselors` | `{name, specialty, type, workload}` | Rodriguez (academic), Thompson (stress), Patel (highrisk). `workload` is mutable and starts at 0. |
| `tutors` | `{name, specialty}` | Lee = Homework help, Garcia = Study planning, Nguyen = Stress support. |
| `studentCounter` | int, starts at 1 | Row id. |
| `appointmentTime` | int, starts at 9 | Next slot hour. |
| `students` | array | `{id, email, risk, helpType, tutor, counselor, appointment, status}` |

Input values: stress is an integer, 1 = very stressed and 5 = great. struggling: No / A little / Yes. assignments: No / 1-2 / 3+. helpType: Homework help / Study planning / Stress support. followup: No / Maybe / Yes.

## 3. Matching logic (must be preserved)

- **calculateRisk**: stress <= 2 gives +2, assignments "3+" gives +2, struggling "Yes" gives +2, followup "Yes" gives +1. Score >= 5 is High, >= 3 is Medium, otherwise Low. "A little", "1-2" and "Maybe" score 0.
- **assignCounselor**: High goes to Dr. Patel. Otherwise Stress support goes to Mr. Thompson. Otherwise the academic counselor with the lowest workload (only Ms. Rodriguez exists today).
- **assignTutor**: match on `specialty === helpType`, else `tutors[0]`.
- **generateAppointment**: High returns "Immediate (Within 1 Hour)" and does not consume a slot. Otherwise it returns `hour + ":00 AM"` and increments the hour. After 12 it wraps to 1.
- **Messages**: academic = "Let's organize your assignments into a simple 3-step success plan." stress = "Let's take a breath together and talk through what's feeling overwhelming." highrisk = "I'm prioritizing your case and will personally check in with you very soon."
- **Side effects**: `counselor.workload++` (all counselors, including Dr. Patel). Status is "High Priority" when High, otherwise "Scheduled".

Reachability: a High score needs at least 5 points, which means stress <= 2 plus one other factor, or a combination like 2+2+1. A tutor is always matched by help type, so the fallback is never used from the UI.

## 4. Bugs

Your list (all confirmed):
1. **XSS**: `updateDashboard` puts `s.email` into `innerHTML` (line 523-532). `<img src=x onerror=alert(1)>` as the email runs script.
2. **No validation**: blank stress gives `parseInt("")` = NaN. `NaN <= 2` is false, so it's treated as "not stressed". 0, -3, 99 are also accepted. Email is never checked and may be empty.
3. **Time labels**: the label is always "AM". After 11 it shows "12:00 AM", then "1:00 AM", and so on.
4. **Tutor hidden**: the tutor is computed and stored but never shown to the student.
5. **Double submit**: nothing disables the button during the 400ms delay, so double clicks create duplicate check-ins, double workload and skipped slots.
6. **Accessibility/markup**: labels have no `for`/`id`; there's no `<html lang>` and no viewport meta, so mobile renders at desktop width; button styling relies on `:first-of-type` / `:last-of-type`.
7. **Privacy**: every student sees the staff table, including other students' emails and risk levels.
8. **Misleading title**: "AI-Powered" is wrong, because the matching is plain rules.

Additional findings:
9. **No `<form>`**: Enter doesn't submit, and the inputs aren't grouped (no fieldset/legend for the choice questions).
10. **No error handling**: `getSupport` has no try/catch, so a failure leaves the UI silent.
11. **Reset doesn't reset the dashboard**, and the "Reset" button is indistinguishable from "Submit" semantically.
12. **Result not announced**: `#result` has no `aria-live`, so screen readers won't hear it.
13. **Risk is conveyed by row colour only** (no text pill); High is alarming orange/red, which is distressing for a student-facing screen.
14. **Focus is removed** on inputs (`outline: none`), with only a glow as replacement.
15. **Workload counts High cases** for Dr. Patel, but the High slot never consumes an appointment, which is inconsistent. Not a bug in the output, so I'll keep it as is.
16. **Slot wrap is ambiguous**: `appointmentTime > 12` wraps to 1, so the original cycle is 9, 10, 11, 12, 1 ... 12, 1 ... and 9-11 are never reached again. The fix needs a rule (see open question).
17. **Global mutable state** (`counselors[].workload`, counters) is lost on reload. Check-ins, workload and the counter need persistence for the multi-page design.
18. **Mutation during selection**: `academicCounselors.sort` sorts a filtered copy (safe), but only one academic counselor exists, so the lowest-workload rule is untested. I'll add a test with a second academic counselor.
19. **Inline `onclick` handlers** and a monospace font stack that reads as "hacker" to a student in distress. No `prefers-reduced-motion` handling for the hover transitions.
20. **Table is not responsive**: it overflows on a 360px phone.

## 5. Redesign plan (for your approval)

**Pages**
- `index.html`: hero ("Get matched with the right support"), 3-step "How it works", cards for counselors and tutors (rendered from `data.js`), a big "Start check-in" button, and an honest "rule-based demo" note.
- `checkin.html`: 6-step wizard (email, stress emoji picker, struggling, assignments, help type, follow-up), progress bar, Back/Next, slide transition, focus moves to each step heading, answers kept in `sessionStorage`, inline friendly errors. Options are real radio inputs styled as tappable cards.
- `results.html`: "Finding your support team..." animation, then two cards (counselor and tutor) with initials avatars, specialty, time, message and "Why you were matched". Calm colour-coded level badge, a check/confetti animation, and the 988 note for High.
- `dashboard.html`: "Staff view, demo only" banner, summary tiles, workload bars, risk chips, email search, sortable columns, stacked cards on phones, and "Clear demo data".

**Flow**: Landing -> Check-in wizard -> (mockSubmitCheckIn, 400ms, button locked) -> Results. The staff dashboard is linked in the nav as "Staff (demo)", not in the student path.

**Visual style**: warm off-white and soft teal/indigo palette (dark mode equivalent), rounded 16px cards, soft shadows, system font stack, calm badges (Low = green, Medium = amber, High = deep violet/rose, with text labels, never colour alone). Hover lift, press feedback, slide steps, confetti. All motion disabled under `prefers-reduced-motion`. WCAG AA contrast checked for both themes.

**Files**: `index.html`, `checkin.html`, `results.html`, `dashboard.html`, `css/{base,components,animations}.css`, `js/{data,logic,store,ui,checkin,results,dashboard}.js`, `README.md`, `AUDIT.md`. The original stays as `portal-original.html`.

**Storage and `file://`**: I'll test whether `localStorage` is shared across the four pages in headless Chromium on `file://`. In Chrome and Edge, files in the same folder do share it. Firefox and Safari can isolate per file. If it fails, I'll fall back to single-page hash routing. I'll report which one I used. Either way, `store.js` will wrap storage in try/catch with an in-memory fallback so nothing crashes.

**Logic preservation**: `js/logic.js` keeps the function bodies and outputs verbatim, with only two changes needed by the bug fixes: the appointment label formatting (bug 3) and the counter/workload living in the store instead of module globals.

## 6. Open questions (need your call before I code)
1. **Slot cycle after 12**: Keep the original numeric order (9, 10, 11, 12, 1, 2 ... 12, 1, ...) with 9-11 as AM and 12 and everything after it as PM? That is the most literal fix, but the 6th check-in onward would show "1:00 PM ... 12:00 PM" forever and never return to 9. Alternative: cap at a 9 AM to 5 PM day and restart at 9:00 AM. Recommendation: the literal fix, since you asked for the same order, with the wrap point documented. Tell me if you'd prefer the 9-to-5 restart.
2. **Staff access**: A visible "demo only" label plus a nav link is not real security. OK, since there's no backend? (A simple passcode would also be fake security, so I recommend not adding one.)
3. **Workload and High cases**: keep incrementing Dr. Patel's workload as today (my recommendation).
