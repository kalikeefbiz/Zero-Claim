# ZERO CLAIM

**Own the last move.** A complete, mobile-first territory strategy arcade game by BlackHouse Games.

Play: **https://kalikeefbiz.github.io/Zero-Claim/**

One Quick Match. A 6×6 field. You versus a tactical CPU. Procedural board components, mechanical countdown feedback, synthesized audio, and the BlackHouse ink / ivory / brass / oxide identity. No accounts, downloads, ads, tracking, or external assets.

## Field manual

You (brass, I) and the CPU (oxide, II) alternate turns. You start. The core begins at **3**.

| Action | Effect                                                                                  |
| ------ | --------------------------------------------------------------------------------------- |
| SHIFT  | Tap an outlined orthogonal neighbor. Move there; countdown −1.                          |
| HOLD   | Remain on the current cell; countdown −1.                                               |
| REWIND | Spend one of your **two charges per match**. Set countdown to **4**, consume your turn. |

The actor who takes the countdown to **zero** captures its tile, replacing any previous ownership. A capture resets the core to **3** at a seeded, unclaimed cell; the other operator plays next. A capture of an already-owned tile still counts as a resolution.

Every owned tile scores its **printed value** (1–3). Every orthogonal edge shared by two of your tiles scores **+1**, counted once. Taking an enemy tile removes its value and any broken enemy adjacency bonuses, then adds your new score.

Highest territory score after **12 capture resolutions** wins. If tied, **the next capture wins outright**, even if the resulting territory totals differ. There is exactly one sudden-death resolution, so every match ends after 12 or 13 claims.

**Timing matters:** with an odd countdown the current operator has the last move if nobody rewinds. With an even countdown the other operator does. Rewind reverses that advantage at 2 or 4; at 1 or 3 it extends the positioning contest. Save charges for a valuable claim or a decisive theft.

Touch or mouse: tap outlined tiles to shift, use the three action controls below the board. Keyboard: **arrow keys** shift immediately, **H** holds, **R** rewinds, **Escape** pauses. The SHIFT button focuses a legal tile for keyboard selection. Help, pause, sound, restart, results, and instant replay are built in. Backgrounding the page pauses play. Smaller screens can scroll vertically; zoom remains available.

## Run locally

Requires **Node.js 24+** and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/Zero-Claim/`.

```sh
npm test                 # 36 deterministic engine / AI / storage tests
npm run build            # strict TypeScript check + production Vite bundle
npx playwright install --with-deps chromium webkit
npm run test:browser     # Chromium and iPhone WebKit browser suites
npm run preview          # built app at http://localhost:4173/Zero-Claim/
```

Outside CI, Chromium uses `/usr/bin/chromium` by default. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a browser path, or use `CI=1` with Playwright's installed Chromium. Playwright WebKit exercises the Safari engine with iPhone emulation; this does not replace physical-device testing.

## Implementation

- `src/engine.ts`: immutable, deterministic transitions; legal moves; territory scoring; seed-based layout and relocation; terminal results.
- `src/ai.ts`: exact minimax through the next capture, including every available rewind response, with a transposition cache. Uses the same legal actions and engine as the player. Charge reserve value tapers toward the final capture; immediate wins take priority. It does not search the entire match.
- `src/main.ts`: touch / keyboard UI, controlled CPU and capture timers, focus-managed native dialogs, match flow and accessibility announcements.
- `src/audio.ts`: optional user-unlocked Web Audio tones; no background audio or asset requests.
- `src/storage.ts`: validated, versioned local win/loss/best-score record, first-play flag and sound preference. No in-progress match persistence. Storage failure does not prevent play. Restarted or abandoned matches do not count; completed results are saved immediately and counted once.

Tile-value fields use rotational symmetry; seeds vary each match. Opening turns are not hardcoded to force a result. All 36 cells remain traversable, ownership can always be contested, and finite rewinds prevent loops. At most 13 resolutions leaves unclaimed relocation cells available.

## Deploy

Vite's base is **`/Zero-Claim/`** (case-sensitive). `.github/workflows/deploy.yml` runs rules tests, a production build, Chromium and WebKit browser tests, then uploads and deploys `dist/` to GitHub Pages on pushes to `main`. Pull requests verify without deploying. In repository Settings → Pages, choose **GitHub Actions** as the source. No secrets are required; deployment uses GitHub's Pages OIDC permissions.

See [release verification](docs/RELEASE.md) for the evidence and practical limits of testing.
