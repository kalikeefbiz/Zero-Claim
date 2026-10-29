import "./style.css";
import {
  applyAction,
  coordinate,
  neighbors,
  newGame,
  scores,
  type Action,
  type Game,
} from "./engine";
import { chooseAction } from "./ai";
import { loadRecord, saveRecord } from "./storage";
import { sound, unlockAudio } from "./audio";

const root = document.querySelector<HTMLDivElement>("#app")!;
const record = loadRecord();
let game: Game | null = null;
let screen: "title" | "match" = "title";
let paused = false;
let resolving = false;
let cpuTimer: ReturnType<typeof setTimeout> | undefined;
let captureTimer: ReturnType<typeof setTimeout> | undefined;
let matchSerial = 0;
let recorded = false;
let message = "";
let lastAction = "Opening position";
let focusBeforeModal: HTMLElement | null = null;
const icon = (name: "sound" | "mute" | "pause" | "help") =>
  ({
    sound:
      '<path d="M4 10h4l5-4v16l-5-4H4z"/><path d="M17 9c3 3 3 7 0 10m3-13c5 5 5 11 0 16"/>',
    mute: '<path d="M4 10h4l5-4v16l-5-4H4z"/><path d="m18 11 7 7m0-7-7 7"/>',
    pause: '<path d="M9 7v14m10-14v14"/>',
    help: '<circle cx="14" cy="14" r="10"/><path d="M11 11a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3v.5"/>',
  })[name];
const svg = (name: "sound" | "mute" | "pause" | "help") =>
  `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icon(name)}</svg>`;
root.innerHTML = `
  <header class="masthead">
    <button class="brand" data-command="home" aria-label="BlackHouse Games — title screen"><span class="house-mark" aria-hidden="true"><i></i></span><span>BLACKHOUSE<span class="brand-sub">GAMES / ARCADE DIVISION</span></span></button>
    <span class="header-edition">TACTICAL INSTRUMENT <b>001</b></span>
    <nav class="utilities" aria-label="Game controls">
      <button class="icon-button" id="sound" data-command="sound" aria-label="Turn sound off">${svg("sound")}</button>
      <button class="icon-button" data-command="help" aria-label="How to play">${svg("help")}</button>
      <button class="icon-button" id="pause" data-command="pause" aria-label="Pause match" hidden>${svg("pause")}</button>
    </nav>
  </header>
  <main id="main"></main>
  <footer class="site-footer"><span>BLACKHOUSE ORIGINAL <span class="footer-slash">/</span> ZERO CLAIM</span><span>NO LAND IS EVER YOURS.</span></footer>
  <dialog id="modal" aria-labelledby="modal-title"></dialog>
  <div class="sr-only" id="announcer" role="status" aria-live="polite" aria-atomic="true"></div>
`;
const main = document.querySelector<HTMLElement>("#main")!;
const dialog = document.querySelector<HTMLDialogElement>("#modal")!;
const announce = (text: string) => {
  document.querySelector("#announcer")!.textContent = text;
};
const arrow =
  '<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const pad = (n: number) => n.toString().padStart(2, "0");

function boardMarkup(g: Game, preview = false): string {
  return `<div class="field ${preview ? "preview-field" : ""}">
    <div class="field-top"><span>SECTOR / ${preview ? "ZERO" : "LIVE"}</span><span>06 × 06 <span class="cross">+</span></span></div>
    <div class="board-frame"><div class="axis axis-top" aria-hidden="true">${"ABCDEF"
      .split("")
      .map((c) => `<span>${c}</span>`)
      .join("")}</div>
      <div class="axis axis-left" aria-hidden="true">${[1, 2, 3, 4, 5, 6].map((n) => `<span>${n}</span>`).join("")}</div>
      <div class="board" id="${preview ? "preview-board" : "board"}" role="group" aria-label="Territory board. Tap an outlined adjacent tile to shift the core.">
        ${g.owners.map((o, i) => `<button class="tile ${o === null ? "" : o === 0 ? "owned-you" : "owned-cpu"}" data-tile="${i}" ${preview ? 'tabindex="-1" disabled' : ""} aria-label="${coordinate(i)}"><span class="tile-value">${g.values[i]}</span><span class="tile-owner" aria-hidden="true">${o === null ? "" : o === 0 ? "I" : "II"}</span><span class="move-mark" aria-hidden="true">+</span></button>`).join("")}
        <div class="core" id="${preview ? "preview-core" : "core"}" aria-hidden="true"><span class="core-notch"></span><span class="core-number">3</span><span class="core-label">CORE</span></div>
      </div>
    </div>
    <div class="field-bottom"><span><i class="legend you"></i> YOU <i class="legend cpu"></i> CPU</span><span>VALUE + SHARED EDGE</span></div>
  </div>`;
}
function positionCore(el: HTMLElement, cell: number) {
  el.style.setProperty("--col", String(cell % 6));
  el.style.setProperty("--row", String(Math.floor(cell / 6)));
}
function title() {
  cancelTimers();
  game = null;
  screen = "title";
  root.dataset.screen = "title";
  paused = false;
  resolving = false;
  document.querySelector<HTMLElement>("#pause")!.hidden = true;
  const preview = newGame(117);
  preview.owners[7] = preview.owners[8] = preview.owners[13] = 0;
  preview.owners[22] = preview.owners[27] = preview.owners[28] = 1;
  main.innerHTML = `<div class="title-layout">
    <section class="title-copy" aria-labelledby="game-title">
      <div class="eyebrow"><span class="status-square"></span> A BLACKHOUSE TACTICAL GAME</div>
      <h1 id="game-title">ZERO<br><span>CLAIM<span class="title-period">.</span></span></h1>
      <p class="tagline">Own the last move.</p>
      <p class="title-description">One core. Two rivals. Twelve claims.<br>Control the countdown. Take the territory.</p>
      <div class="title-actions"><button class="primary" data-command="play">PLAY QUICK MATCH <span aria-hidden="true">${arrow}</span></button><button class="text-button" data-command="help">HOW TO PLAY <span aria-hidden="true">+</span></button></div>
      <div class="record-line"><span>${pad(record.wins)} WINS <span class="dim">/</span> ${pad(record.losses)} LOSSES</span><span>BEST ${pad(record.best)}</span></div>
    </section>
    <section class="title-instrument" aria-label="Game preview"><div class="instrument-heading"><span>THE FIELD IS CONTESTED.</span><span>FIG. 01</span></div>${boardMarkup(preview, true)}<div class="instrument-caption"><span class="caption-number">03</span><p>Every move brings it closer.<br><strong>Whoever reaches zero owns the tile.</strong></p><span class="caption-arrow" aria-hidden="true">${arrow}</span></div></section>
  </div>`;
  positionCore(document.querySelector<HTMLElement>("#preview-core")!, 14);
  updateSound();
}
function startMatch() {
  cancelTimers();
  game = newGame((Date.now() + ++matchSerial * 7919) >>> 0);
  screen = "match";
  root.dataset.screen = "match";
  paused = false;
  resolving = false;
  recorded = false;
  message = "Tap an outlined tile to SHIFT, or choose HOLD.";
  lastAction = "Opening position";
  document.querySelector<HTMLElement>("#pause")!.hidden = false;
  main.innerHTML = `<div class="match-layout">
    <section class="command-panel" aria-labelledby="match-title">
      <div class="eyebrow">QUICK MATCH <span class="dim">/</span> YOU VS CPU</div>
      <h1 id="match-title">ZERO CLAIM<span class="title-period">.</span></h1>
      <div class="round-heading"><span id="round-label">CLAIM 01 <span class="dim">/ 12</span></span><span id="round-mode">TERRITORY CONTROL</span></div>
      <div class="resolution-track" id="resolution-track" aria-label="Capture progress">${Array.from({ length: 12 }, (_, i) => `<i data-resolution="${i}"></i>`).join("")}</div>
      <div class="scoreboard" aria-label="Territory scores">
        <div class="score-card you"><div class="score-label"><span><i class="legend you"></i> YOU <span class="operator">/ I</span></span><span id="your-territory">0 TILES</span></div><div class="score-number" id="your-score">00</div><div class="charge-row"><span>REWINDS</span><span id="your-charges"></span></div></div>
        <div class="score-card cpu"><div class="score-label"><span><i class="legend cpu"></i> CPU <span class="operator">/ II</span></span><span id="cpu-territory">0 TILES</span></div><div class="score-number" id="cpu-score">00</div><div class="charge-row"><span>REWINDS</span><span id="cpu-charges"></span></div></div>
      </div>
      <div class="desktop-notes"><span class="eyebrow">THE ZERO PRINCIPLE</span><p>Position is leverage.<br>Timing is ownership.</p><div class="note-rule"></div><p class="small-note">Tile value + 1 for each shared edge.<br>Steal a tile to break a rival’s chain.</p><button class="text-button" data-command="help">FIELD MANUAL <span aria-hidden="true">${arrow}</span></button></div>
    </section>
    <section class="play-panel" aria-label="Playing field">
      <div class="turn-strip" id="turn-strip"><span class="turn-light"></span><strong id="turn-text">YOUR TURN</strong><span id="count-hint">3 TO ZERO</span></div>
      ${boardMarkup(game)}
      <div class="countdown-panel"><span class="eyebrow">CORE COUNTDOWN</span><div class="countdown-digits" id="countdown-digits" aria-label="Countdown"><span data-count="4">4</span><i></i><span data-count="3">3</span><i></i><span data-count="2">2</span><i></i><span data-count="1">1</span><i></i><span data-count="0">0</span></div><span class="countdown-end">CLAIM</span></div>
      <div class="actions"><button class="action shift-action" id="shift" data-command="shift"><span class="action-title"><span aria-hidden="true">↔</span> SHIFT</span><span class="action-detail">TAP A LIT TILE <b>−1</b></span></button><button class="action" id="hold" data-command="hold"><span class="action-title"><span aria-hidden="true">⊙</span> HOLD</span><span class="action-detail">STAY IN PLACE <b>−1</b></span></button><button class="action" id="rewind" data-command="rewind"><span class="action-title"><span aria-hidden="true">↶</span> REWIND</span><span class="action-detail" id="rewind-detail">RESET TO 4 <b>2 LEFT</b></span></button></div>
      <div class="field-message" id="field-message" role="status"></div>
      <div class="action-log" id="action-log"></div>
    </section>
  </div>`;
  updateMatch();
  announce("Match started. Your turn. Countdown three. Two rewind charges.");
  if (!record.tutorial) openHelp(true);
}
function updateMatch() {
  if (!game || screen !== "match") return;
  const g = game;
  const [you, cpu] = scores(g);
  document.querySelector("#your-score")!.textContent = pad(you);
  document.querySelector("#cpu-score")!.textContent = pad(cpu);
  for (const [i, name] of ["your", "cpu"].entries()) {
    document.querySelector(`#${name}-territory`)!.textContent =
      `${g.owners.filter((o) => o === i).length} TILES`;
    document.querySelector(`#${name}-charges`)!.innerHTML = [0, 1]
      .map(
        (c) =>
          `<i class="charge ${c < g.charges[i] ? "available" : ""}" aria-hidden="true"></i>`,
      )
      .join("");
    document
      .querySelector(`#${name}-charges`)!
      .setAttribute("aria-label", `${g.charges[i]} rewinds remaining`);
  }
  document.querySelector("#round-label")!.innerHTML = g.suddenDeath
    ? "SUDDEN DEATH"
    : `CLAIM ${pad(Math.min(g.captures + 1, 12))} <span class="dim">/ 12</span>`;
  document.querySelector("#round-mode")!.textContent = g.suddenDeath
    ? "NEXT CAPTURE WINS"
    : `${pad(g.captures)} RESOLVED`;
  document
    .querySelectorAll<HTMLElement>("[data-resolution]")
    .forEach((el, i) => {
      el.classList.toggle("resolved", i < g.captures);
      el.classList.toggle("current", i === g.captures);
      if (g.lastCapture && i === g.lastCapture.number - 1)
        el.dataset.owner = String(g.lastCapture.player);
    });
  const canAct = !paused && !resolving && g.turn === 0 && g.winner === null;
  const adjacent = neighbors(g.core);
  const displayCell = resolving && g.lastCapture ? g.lastCapture.tile : g.core;
  const count = resolving ? 0 : g.countdown;
  document
    .querySelectorAll<HTMLButtonElement>("#board .tile")
    .forEach((tile, i) => {
      const o = g.owners[i];
      tile.className = `tile ${o === null ? "" : o === 0 ? "owned-you" : "owned-cpu"} ${canAct && adjacent.includes(i) ? "legal" : ""} ${displayCell === i ? "core-tile" : ""} ${resolving && g.lastCapture?.tile === i ? "captured" : ""}`;
      // Keep inert cells focusable for board inspection but use aria-disabled:
      // they never dispatch an illegal transition.
      tile.setAttribute(
        "aria-disabled",
        String(!canAct || !adjacent.includes(i)),
      );
      tile.setAttribute(
        "aria-label",
        `${coordinate(i)}, value ${g.values[i]}, ${o === null ? "unclaimed" : o === 0 ? "your territory" : "CPU territory"}${displayCell === i ? `, core countdown ${count}` : ""}${canAct && adjacent.includes(i) ? ", shift here" : ""}`,
      );
      tile.querySelector(".tile-owner")!.textContent =
        o === null ? "" : o === 0 ? "I" : "II";
      tile.querySelector(".move-mark")!.textContent = count === 1 ? "↗" : "+";
    });
  const core = document.querySelector<HTMLElement>("#core")!;
  positionCore(core, displayCell);
  core.className = `core ${count === 1 ? "critical" : ""} ${resolving ? "resolving" : ""} ${resolving && g.lastCapture?.player === 1 ? "cpu-capture" : ""}`;
  core.querySelector(".core-number")!.textContent = String(count);
  core.querySelector(".core-label")!.textContent =
    count === 0 ? "CLAIM" : "CORE";
  const turnText =
    g.winner !== null
      ? "MATCH COMPLETE"
      : resolving
        ? `${g.lastCapture?.player === 0 ? "YOU" : "CPU"} CLAIMED ${coordinate(displayCell)}`
        : paused
          ? "MATCH PAUSED"
          : g.turn === 0
            ? "YOUR TURN"
            : "CPU IS THINKING";
  document.querySelector("#turn-text")!.textContent = turnText;
  document.querySelector("#count-hint")!.textContent = resolving
    ? "+ TERRITORY"
    : `${count} TO ZERO`;
  document.querySelector("#turn-strip")!.className =
    `turn-strip ${g.turn === 1 && !resolving ? "cpu-turn" : ""} ${resolving ? "capture-strip" : ""}`;
  document
    .querySelectorAll<HTMLElement>("[data-count]")
    .forEach((el) =>
      el.classList.toggle("active", Number(el.dataset.count) === count),
    );
  (document.querySelector("#hold") as HTMLButtonElement).disabled = !canAct;
  (document.querySelector("#shift") as HTMLButtonElement).disabled = !canAct;
  (document.querySelector("#rewind") as HTMLButtonElement).disabled =
    !canAct || g.charges[0] === 0;
  document.querySelector("#rewind-detail")!.innerHTML =
    `RESET TO 4 <b>${g.charges[0]} LEFT</b>`;
  document.querySelector("#field-message")!.textContent = resolving
    ? `${g.lastCapture?.player === 0 ? "Your claim." : "CPU claim."} Territory recalculated. Next core incoming.`
    : g.suddenDeath
      ? "Scores were tied after twelve. The next capture wins."
      : g.turn === 1
        ? "CPU is weighing the field…"
        : count === 1
          ? "ZERO ON YOUR NEXT MOVE. Shift or hold to claim."
          : message;
  document.querySelector("#action-log")!.textContent =
    `${lastAction} · ${g.suddenDeath ? "TIEBREAK" : `MOVE ${pad(g.moves)}`}`;
}
function cancelTimers() {
  clearTimeout(cpuTimer);
  clearTimeout(captureTimer);
}
function scheduleCPU() {
  clearTimeout(cpuTimer);
  if (!game || game.turn !== 1 || paused || resolving || game.winner !== null)
    return;
  cpuTimer = setTimeout(() => {
    if (
      game &&
      game.turn === 1 &&
      !paused &&
      !resolving &&
      game.winner === null
    )
      perform(chooseAction(game));
  }, 520);
}
function perform(action: Action) {
  if (!game || paused || resolving || game.winner !== null) return;
  const actor = game.turn;
  const previousCount = game.countdown;
  game = applyAction(game, action);
  if (game.winner !== null) recordResult();
  const who = actor === 0 ? "YOU" : "CPU";
  lastAction =
    action.type === "shift"
      ? `${who} SHIFT → ${coordinate(action.to)}`
      : action.type === "rewind"
        ? `${who} REWIND → 4`
        : `${who} HOLD`;
  message =
    action.type === "rewind"
      ? previousCount % 2 === 0
        ? "Last-move advantage reversed. Watch the countdown."
        : "Countdown extended. More room to reposition."
      : game.countdown % 2 === 0
        ? "CPU has the last move. A rewind can reverse it."
        : "You have the last move. Position your claim.";
  if (game.lastCapture) {
    resolving = true;
    sound("capture", record.sound);
    announce(
      `${who} captured ${coordinate(game.lastCapture.tile)}. Scores: you ${scores(game)[0]}, CPU ${scores(game)[1]}.`,
    );
    updateMatch();
    captureTimer = setTimeout(finishResolution, 850);
  } else {
    sound(action.type === "rewind" ? "rewind" : "move", record.sound);
    updateMatch();
    if (game.turn === 0)
      announce(`Your turn. Countdown ${game.countdown}. CPU ${action.type}.`);
    scheduleCPU();
  }
}
function finishResolution() {
  resolving = false;
  updateMatch();
  if (game?.winner !== null && game) showResults();
  else scheduleCPU();
}
function pause() {
  if (!game || game.winner !== null || screen !== "match") return;
  paused = true;
  cancelTimers();
  resolving = false;
  updateMatch();
  showModal(
    `<span class="eyebrow">INSTRUMENT ON STANDBY</span><h2 id="modal-title">Field paused.</h2><p>The clock only moves when you do.<br>Your match is waiting.</p><div class="modal-actions"><button class="primary" data-command="resume">RESUME MATCH <span>${arrow}</span></button><button class="secondary" data-command="help">HOW TO PLAY</button><button class="text-button" data-command="restart-confirm">RESTART MATCH ↶</button><button class="text-button dim" data-command="quit-confirm">RETURN TO TITLE</button></div>`,
  );
}
function resume() {
  closeModal();
  paused = false;
  updateMatch();
  if (game?.winner !== null && game) showResults();
  else scheduleCPU();
}
function showModal(content: string) {
  if (!dialog.open) focusBeforeModal = document.activeElement as HTMLElement;
  dialog.innerHTML = `<div class="modal-inner"><div class="modal-topline"><span>BLACKHOUSE / ZERO CLAIM</span><span>+</span></div>${content}</div>`;
  if (!dialog.open) dialog.showModal();
}
function closeModal() {
  dialog.close();
  focusBeforeModal?.focus();
}
function openHelp(first = false) {
  if (screen === "match") {
    paused = true;
    cancelTimers();
    resolving = false;
    updateMatch();
  }
  showModal(
    `<span class="eyebrow">${first ? "BEFORE YOUR FIRST CLAIM" : "FIELD MANUAL / 001"}</span><h2 id="modal-title">Get to zero.<br>Take the tile.</h2><div class="manual-count" aria-label="Three, two, one, claim"><span>3</span><i>→</i><span>2</span><i>→</i><span>1</span><i>→</i><strong>0</strong></div><p>You and the CPU alternate. The operator who takes the countdown to <strong>zero</strong> captures the core’s tile — even enemy territory.</p><div class="manual-actions"><div><strong>01 / SHIFT</strong><span>Tap an outlined neighbor. Move one square. Countdown −1.</span></div><div><strong>02 / HOLD</strong><span>Stay on the same square. Countdown −1.</span></div><div><strong>03 / REWIND</strong><span>Reset to 4. Spend your turn and one of two charges. At 2 or 4, reverse who gets the last move.</span></div></div><p class="manual-scoring">Each tile scores its printed value, plus <strong>1 per shared edge</strong> between your tiles. Each capture resets to 3 on an unclaimed tile; the other operator goes next. Highest score after <strong>12 captures</strong> wins. A tie means sudden death: next capture wins.</p><button class="primary" data-command="help-done">${first ? "TAKE THE FIELD" : screen === "match" ? "BACK TO MATCH" : "UNDERSTOOD"} <span>${arrow}</span></button>`,
  );
}
function recordResult() {
  if (!game || game.winner === null || recorded) return;
  recorded = true;
  record.played++;
  record[game.winner === 0 ? "wins" : "losses"]++;
  record.best = Math.max(record.best, scores(game)[0]);
  saveRecord(record);
}
function showResults() {
  if (!game || game.winner === null) return;
  const won = game.winner === 0;
  const s = scores(game);
  recordResult();
  sound(won ? "win" : "loss", record.sound);
  showModal(
    `<span class="eyebrow">${game.suddenDeath ? "SUDDEN DEATH RESOLVED" : "TWELVE CLAIMS. FIELD CLOSED."}</span><h2 id="modal-title" class="result-title">${won ? "FIELD<br>SECURED." : "FIELD<br>LOST."}</h2><p>${game.suddenDeath ? `${won ? "You took" : "The CPU took"} the deciding capture.` : won ? "You controlled the last move." : "The CPU held the stronger territory."}<br>${won ? "The field is yours. For now." : "Every loss leaves a better operator."}</p><div class="result-scores"><div><span>YOU / I</span><strong>${pad(s[0])}</strong></div><span class="result-divider">/</span><div><span>CPU / II</span><strong>${pad(s[1])}</strong></div></div><div class="result-record"><span>${record.wins} WINS / ${record.losses} LOSSES</span><span>BEST ${record.best}</span></div><div class="modal-actions"><button class="primary" data-command="replay">PLAY AGAIN <span>${arrow}</span></button><button class="secondary" data-command="title">RETURN TO TITLE</button></div>`,
  );
  announce(
    `${won ? "Victory" : "Defeat"}. Final score: you ${s[0]}, CPU ${s[1]}. Play again or return to title.`,
  );
}
function confirmExit(quit: boolean) {
  showModal(
    `<span class="eyebrow">${quit ? "LEAVE THE FIELD" : "RESET THE INSTRUMENT"}</span><h2 id="modal-title">${quit ? "Abandon field?" : "Start over?"}</h2><p>This unfinished match will be discarded.<br>Your completed-match record stays intact.</p><div class="modal-actions"><button class="primary" data-command="${quit ? "title" : "replay"}">${quit ? "RETURN TO TITLE" : "RESTART MATCH"} <span>${arrow}</span></button><button class="secondary" data-command="resume">KEEP PLAYING</button></div>`,
  );
}
function updateSound() {
  const button = document.querySelector<HTMLButtonElement>("#sound")!;
  button.innerHTML = svg(record.sound ? "sound" : "mute");
  button.setAttribute(
    "aria-label",
    `Turn sound ${record.sound ? "off" : "on"}`,
  );
  button.setAttribute("aria-pressed", String(record.sound));
}
root.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("button");
  if (!target) return;
  unlockAudio();
  if (target.dataset.tile !== undefined) {
    if (
      screen !== "match" ||
      !game ||
      game.turn !== 0 ||
      paused ||
      resolving ||
      game.winner !== null
    )
      return;
    const to = Number(target.dataset.tile);
    if (neighbors(game.core).includes(to)) perform({ type: "shift", to });
    return;
  }
  switch (target.dataset.command) {
    case "play":
    case "replay":
      closeModal();
      startMatch();
      break;
    case "help":
      openHelp();
      break;
    case "help-done":
      record.tutorial = true;
      saveRecord(record);
      if (screen === "match") resume();
      else closeModal();
      break;
    case "sound":
      record.sound = !record.sound;
      saveRecord(record);
      updateSound();
      sound("move", record.sound);
      break;
    case "pause":
      pause();
      break;
    case "resume":
      resume();
      break;
    case "restart-confirm":
      confirmExit(false);
      break;
    case "quit-confirm":
      confirmExit(true);
      break;
    case "title":
      closeModal();
      title();
      break;
    case "home":
      if (screen === "match" && game?.winner === null) {
        pause();
        confirmExit(true);
      } else {
        closeModal();
        title();
      }
      break;
    case "shift":
      if (game?.turn === 0 && !paused && !resolving) {
        message =
          "Choose an outlined tile beside the core. Arrow keys also shift.";
        updateMatch();
        document.querySelector<HTMLElement>("#board .legal")?.focus();
      }
      break;
    case "hold":
      if (game?.turn === 0) perform({ type: "hold" });
      break;
    case "rewind":
      if (game?.turn === 0 && game.charges[0] > 0) perform({ type: "rewind" });
      break;
  }
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  if (game?.winner !== null && game) return;
  if (screen === "match") resume();
  else closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dialog.open && screen === "match") {
    event.preventDefault();
    pause();
    return;
  }
  if (
    !game ||
    screen !== "match" ||
    dialog.open ||
    paused ||
    resolving ||
    game.turn !== 0 ||
    game.winner !== null ||
    event.repeat
  )
    return;
  const direction: Record<string, number> = {
    ArrowUp: -6,
    ArrowRight: 1,
    ArrowDown: 6,
    ArrowLeft: -1,
  };
  if (event.key in direction) {
    event.preventDefault();
    const to = game.core + direction[event.key];
    if (neighbors(game.core).includes(to)) perform({ type: "shift", to });
  } else if (event.key.toLowerCase() === "h") {
    event.preventDefault();
    perform({ type: "hold" });
  } else if (event.key.toLowerCase() === "r" && game.charges[0] > 0) {
    event.preventDefault();
    perform({ type: "rewind" });
  }
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    screen === "match" &&
    !dialog.open &&
    game?.winner === null
  )
    pause();
});
title();
