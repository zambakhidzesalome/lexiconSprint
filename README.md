# Lexicon Sprint

A classroom vocabulary challenge built with **React, JavaScript, Vite, and Tailwind CSS 4**. Created by Salome.

A complete React rebuild of [the original Lexicon Sprint](https://github.com/zambakhidzesalome/Lexicon-Sprint), preserving its 36 questions, six matching sets, scoring, timers, demo PIN, and portable class/result code formats. The app does not embed or execute the original HTML.

## Run the project

Use Node.js 22.12+ or Node.js 24 LTS. In this folder:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

```bash
npm test          # Run the automated tests once
npm run build    # Create production files in dist/
npm run preview  # Serve the production build locally
npm run lint     # Check JavaScript and React conventions
npm run format   # Format source, tests and documentation
```

React and React DOM are the only runtime dependencies. Build, test and formatting tools are development dependencies. No API keys, backend, database, authentication service, or paid API is needed. Google Fonts is optional: system fonts are used when it cannot load.

Tailwind 4 uses `@tailwindcss/vite` in `vite.config.js` and `@import "tailwindcss"` in `src/index.css`. No Tailwind 3 configuration or PostCSS setup is needed. Tailwind utilities handle spacing, grids and layout; named CSS classes describe reusable cards, buttons, quiz controls, and light/dark colors.

## Try the whole classroom flow

1. Open **Teacher tools**. The original **demo PIN is `4127`**.
2. Select Group 1–8 and a duration: 30 minutes, 1 hour, 2 hours, or 3 hours. Create a class code.
3. Share that code manually. On another browser/device with the app open, enter a student's full name and the code.
4. Read and acknowledge the rules. A 3–2–1 countdown starts the quiz.
5. Complete the 42 screens. Copy the final `VQ1-…` result code and send it to the teacher in the agreed chat.
6. In Teacher tools → **Results**, paste the messages and click **Import results**. Results are grouped by class session and ranked by points. Ties use faster time, then earlier completion.
7. **Copy table** provides tab-separated text for Excel/Google Sheets. **Copy result codes** lets you transfer results to another browser; paste those codes into Results there.

For a real second device, both devices need access to the app. `localhost` on a phone refers to the phone, not your computer. On a trusted local network, run `npm run dev -- --host 0.0.0.0` and open Vite's Network URL on the other device. Static hosting only needs the files in `dist/`; no application server is required. Clipboard buttons offer manual selection when the browser blocks clipboard access, as it can on plain HTTP.

The PIN is **a frontend demonstration, not secure authentication**. It and the answer key can be found in the downloaded JavaScript. Teacher tools lock again after a refresh; imported results and the latest class code remain saved.

## Quiz rules and scoring

There are 42 timed screens and 60 possible correct answers:

| Type         | Time       | Scoring                                     |
| ------------ | ---------- | ------------------------------------------- |
| Meaning      | 25 seconds | Correct: 600–1,000 points                   |
| Fill the gap | 30 seconds | Correct: 600–1,000 points                   |
| Matching     | 75 seconds | Up to 1,000 points shared across four pairs |

For a correct multiple-choice answer: `round(600 + 400 × fraction of time remaining)`.

For matching: `round(points above × correct pairs / 4)`. A matching set counts as one scoring screen, so the maximum is **42,000 points**. Correct pairs count separately toward **60 correct answers**. Partial matches earn credit when time expires. A late multiple-choice click earns no points. Wrong answers earn zero.

Questions, options, terms, and definitions are shuffled independently. Answers retain their original IDs, so shuffling cannot change which answer is correct. Clicking a multiple-choice answer submits it immediately. Matching requires four pairs to enable **Submit matches**. Click a paired definition to undo it. Students cannot return to previous questions.

Timers use an absolute deadline instead of counting ticks. The question index and an immediate guard prevent repeated clicks or stale timeouts from scoring twice. Intervals and listeners are cleaned up on unmount, including React Strict Mode's development setup/cleanup cycle.

## Interruptions and saved progress

`visibilitychange` detects when the page becomes hidden, including when changing tabs/apps or locking a device. It stops the active attempt and records the question number. `pagehide` handles a page close/reload when possible. If a saved active attempt is found on startup, it is marked interrupted once.

The status is saved as `interrupted` immediately, before rendering. Later events cannot count the same incident again. Countdown interruptions use question 0. Reload/page-close flags use `r`. Results include the total count and the first 12 question flags, matching the reference format. The reference podium shows only uninterrupted attempts; the table includes everyone.

Students can restart with a freshly shuffled quiz from question 1. Attempt count and interruption history survive restarts and refreshes. A session must still be valid when starting or restarting; an already running attempt can finish after expiry. Interruptions are context, **not proof of cheating**.

Completed results restore after refresh. Opening the join form does not erase an old result; successfully joining a new session replaces it. Copy the old result first if needed.

## How manual sharing works

- Class codes contain a five-minute start bucket, duration, group, and checksum. Their alphabet excludes `0`, `1`, `I`, and `O`. Hyphens/spaces are optional; lowercase is accepted.
- The original five-minute early allowance is preserved for small clock differences. Generating the same group/duration in the same five-minute bucket produces the same session code. Sessions are grouped by the full code, not just group number.
- Result codes contain UTF-8 JSON encoded as base64url, followed by a checksum. Fields: `v` version, `n` name, `g` group, `c` class code, `s` points, `k` correct, `t` seconds, `a` attempt, `f` first 12 flags, `fc` total interruptions, `ts` completion timestamp.
- Imports validate checksums, JSON shape, score ranges, group/session agreement, and interruption fields. Invalid codes are reported without being ranked. Equivalent/repeated results are skipped. React renders imported names as text.
- Checksums detect accidental editing. They do **not** securely verify scores, encrypt data, or prevent tampering. Anyone with the source can construct codes. Codes contain student names: share them with the intended teacher.
- Persistent data belongs to the current browser's **localStorage**. There is no automatic synchronization. Clearing site data or private browsing can remove results. Storage and clipboard failures show practical copy/export fallbacks.
- Use one active student tab per browser profile. This demo does not coordinate simultaneous tabs, enforce identity/attempt limits, prove honesty, or keep a server audit log. Device clocks must be reasonably accurate. It is a classroom practice/student project, not a secure examination system.

## Where the code lives

```text
src/
  App.jsx                    Screen selection, page focus and theme
  main.jsx                   React entry point with StrictMode
  index.css                  Tailwind import and shared styles
  data/questions.js          Original question bank and constants
  components/
    StudentScreens.jsx       Join, rules, countdown, interruptions, results
    QuizScreen.jsx           Timer, options and matching controls
    TeacherScreens.jsx       PIN, sessions, imports, podium, answer key
    CopyButton.jsx           Clipboard copy with selection fallback
    Icon.jsx                 Small reusable SVG icons
  hooks/useStudent.js        Student state, persistence, lifecycle events
  utils/
    codes.js                 Class/result encoding, validation, imports
    quiz.js                  Shuffling, scoring, display formatting
    attempt.js               Pure start/submit/interruption transitions
    storage.js               Safe localStorage reads and writes
tests/
  codes.test.js              Compatibility, validation and imports
  quiz.test.js               Question bank, scoring, state transitions
  app.test.jsx               Full React flow and lifecycle interactions
```

To explain the project, start with `App.jsx`, follow `JoinScreen` into `useStudent`, then follow an answer from `QuizScreen` through `submitAnswer` and `scoreQuestion`. The last answer creates a result code. The teacher decodes it into a locally saved leaderboard. State lives in components; there is no Redux, router, complex Context provider, or custom rendering framework.

The original `index.html` was inspected before rebuilding; its source and blob identifier are in [docs/reference.md](docs/reference.md). Platform-specific ownership checks and APIs were removed.

## Verification

The production build and 28 automated tests passed. Vitest, React Testing Library, and jsdom tests include React Strict Mode. Coverage includes original-format compatibility fixtures, Unicode names, future/expired codes, all questions and answer identities, scoring, partial matching, timeouts, stale submissions, matching undo, clipboard fallback, reload/visibility interruptions, malformed/duplicate imports, persistence, PIN/answer key, and deletion confirmation.

The full teacher → student → teacher flow uses **separate localStorage snapshots**: only the class code and result code cross over. This is a component simulation, not a real two-browser test. Live browser automation was unavailable, so visual layout and real device/tab-switch behavior still need a manual browser check.

For that check: try a phone-width window, keyboard-only navigation, light/dark mode, switch away during a quiz, refresh the interruption screen twice, restart, finish, refresh the result, and transfer its code into another browser. Confirm the interruption is counted once, the result persists, and duplicate imports are skipped.
