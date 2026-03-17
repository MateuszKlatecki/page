# Copilot Instructions

## Project overview

**Tabliczka** is a Polish-language PWA for practicing multiplication (mnożenie) and division (dzielenie). It is a zero-dependency, no-build-step project: `index.html` contains the HTML structure, all JavaScript lives in `app.js`, styling in `styles.css`, with `sw.js` (service worker) and `manifest.webmanifest` completing the PWA setup.

## Architecture

All code lives in four files:

| File | Purpose |
|---|---|
| `index.html` | HTML structure only; loads `app.js` via `<script src="app.js" defer>` |
| `app.js` | All game logic and UI controller |
| `styles.css` | All styling, including mobile breakpoint (`≤520px`) |
| `sw.js` | Service worker — cache-first strategy for offline support |
| `manifest.webmanifest` | PWA metadata |

### JS structure in `app.js`

- **`Game` class** — pure state/logic: question pool generation, shuffle, answer submission, progress, timing. No DOM access.
- **Controller** (plain script below the class) — DOM event handlers, screen transitions, settings persistence.
- **`const $ = id => document.getElementById(id)`** — shorthand used throughout for `getElementById`.

### Screen model

Three screens (`screen-start`, `screen-game`, `screen-results`) share a single `.card` container. Visibility is toggled with `showScreen(name)` which adds/removes the `.active` CSS class. Only one screen is visible at a time.

### Two-phase answer flow

The `waitingForNext` boolean flag controls the submit/advance cycle:
1. User submits answer → feedback shown, button label changes to "Dalej" / "Wyniki"
2. User presses Enter or button again → `advanceOrFinish()` moves to next question or results

### Settings persistence

User settings are saved to `localStorage` under the `tabliczka_` prefix (`tabliczka_maxResult`, `tabliczka_total`, `tabliczka_multiply`, `tabliczka_divide`). They are loaded on page init and saved on every input change.

### Question generation

`Game.availableQuestions(maxResult, types)` generates all valid pairs where both factors are 2–10 (`FACTOR_MAX`) and product ≤ `maxResult`. Questions are Fisher-Yates shuffled and sliced to the requested count.

## Key conventions

- **No framework, no bundler, no npm** — never introduce a build step or package manager.
- **Separate JS file** — game logic lives in `app.js`, loaded via `<script src="app.js" defer>` in `index.html`. Do not move it back inline.
- **Polish UI strings** — all user-facing text is in Polish (e.g., "Sprawdź", "Dalej", "Brawo!").
- **Service worker versioning** — bump `CACHE_NAME` in `sw.js` whenever cached files change (currently `tabliczka-math-v4`).
- **Mobile-first sizing** — the `≤520px` media query in `styles.css` covers phones (e.g. Pixel 7 at 412 px logical width); all UI elements have touch-friendly tap targets at that breakpoint.
- **Operator symbols** — use `×` (U+00D7) for multiplication and `÷` (U+00F7) for division in displayed task strings.
