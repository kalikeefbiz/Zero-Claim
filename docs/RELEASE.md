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

**Verified live:** https://blackhouse-zero-claim.pages.dev/ on 2026-10-29. Cloudflare Pages deployed the tested implementation from commit `df925ce8855d7a56d380c1ea5133f242bd3137e9`. HTTPS returned 200; **all 10 browser checks also passed against the public production origin**, including full matches and replay in Chromium and iPhone WebKit. The release documentation commit changes no game assets.

GitHub Actions [verification run](https://github.com/kalikeefbiz/Zero-Claim/actions/runs/40799767477) passed the 36 rules tests, production build and all 10 browser tests. Its separate GitHub Pages deployment job failed with HTTP 404 because Pages is not enabled. Attempting to enable it through the available GitHub integration returned HTTP 403 ("Resource not accessible by integration"). The owner can enable **Settings → Pages → GitHub Actions** and rerun deployment. The fallback is a static Cloudflare Pages project linked to `main`, using Node 24 and `npm test && npm run build -- --base=/`. No functions or backend were created.

The prepared GitHub production target is `https://kalikeefbiz.github.io/Zero-Claim/` with Vite base `/Zero-Claim/`. GitHub Actions builds and deploys the tested static bundle from `main`; the deployment environment exposes the actual Pages URL. A successful deployment must also be checked over HTTPS and opened in a browser before being reported as live.

## Screenshots from the public release

- [iPhone title](screenshots/iphone-title.png)
- [iPhone match](screenshots/iphone-match.png)
- [iPhone results](screenshots/iphone-results.png)
- [Desktop title](screenshots/desktop-title.png)
