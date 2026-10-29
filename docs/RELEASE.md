# Release verification — Goal 001

## Automated coverage

- **36 Vitest tests:** legal neighbors and row boundaries; deterministic seeds and symmetric values; SHIFT / HOLD / REWIND transitions; immutable inputs; zero-count actor attribution; theft and same-owner recaptures; adjacency recalculation; charge limits; turn parity; 12-resolution results; both winners; one-capture sudden death; new-match reset; tactical CPU choices; storage sanitization and denied storage.
- **80 seeded AI self-play matches:** all actions legal, every match completed; 26 first-operator wins / 54 second-operator wins; maximum 39 actions. This is a finite regression audit, not proof of perfect play or population-level balance.
- **10 Playwright checks:** five scenarios each in Chromium and iPhone WebKit. Cover first-play instructions, touch / mouse moves, CPU lockout, rewind use, pause and resume, sound preferences, restart confirmation, full matches, definitive results, once-only saved records, reload, replay, keyboard shortcuts and Escape behavior. Responsive checks include 320×568, 375×667, 390×664, 430×932, desktop, and landscape.
- Production Vite build includes strict TypeScript checking. Runtime JavaScript has no third-party dependencies. Total CSS + JavaScript is approximately **14.3 KB gzip**, plus the document and local icons.
- npm dependency audit: **zero known vulnerabilities** at release verification.

The CI workflow reruns rules, production build, and both browser suites before any production deployment. Local WebKit required user-space OS libraries in this managed environment; the same browser assertions ran against the actual WebKit binary. CI installs normal browser system dependencies.

## Visual and interaction review

BlackHouse's existing site CSS and games page were referenced for its ink / paper palette, brass accents, large tightly spaced Arial headings, italic Georgia copy, thin rules and architectural composition. All game visuals are procedural CSS / SVG; the touch icon is a locally drawn geometric PNG. No art or font CDN is requested.

Reviewed portrait and desktop screenshots, core positioning, capture feedback, ownership patterns, touch target sizes, and production asset paths. At 390×844 the board and all three action controls fit on screen. Shorter viewports scroll vertically rather than shrinking the board into tiny targets. Reduced motion disables movement and stamp animations; sound can be muted and only begins after a user gesture. Native dialogs trap focus; labels expose tile value, ownership and legal shifts to assistive technology.

## Practical limits

- Safari-engine tests use Playwright WebKit with iPhone emulation on Linux. Physical iPhone Safari hardware was not available for testing.
- AI solves the current capture exactly and values saved charges heuristically. It does not solve all twelve resolutions; a good player can beat it.
- Refresh abandons an unfinished match. Only completed results and preferences are stored. Browser storage clearing or private browsing can remove records.
- Smaller / shorter screens use vertical scrolling. The game requires a modern browser with ES2022, CSS Grid and native dialog support.
- No known blocking gameplay defects at release verification.

## Deployment

The production target is `https://kalikeefbiz.github.io/Zero-Claim/` with Vite base `/Zero-Claim/`. GitHub Actions builds and deploys the tested static bundle from `main`; the deployment environment exposes the actual Pages URL. A successful deployment must also be checked over HTTPS and opened in a browser before being reported as live.
