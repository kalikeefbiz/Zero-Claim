# ZERO CLAIM

A compact, single-player-versus-CPU territory strategy arcade game for **BlackHouse Games**.

## Goal
Ship one complete, replayable, mobile-first browser game, not a prototype, vertical slice, or long-running game project. The authoritative production brief is the Codex GOAL supplied with the development task.

## Gameplay anchor
- 6×6 board, two rival operators, one contested countdown core.
- Players alternate turns. Each valid action consumes one turn.
- SHIFT moves the core one orthogonal cell and decreases its counter by 1.
- HOLD keeps the core in place and decreases its counter by 1.
- REWIND consumes a limited charge, replaces the counter with 4, and ends the turn.
- The actor whose action causes the counter to reach 0 captures the core's current cell, overwriting any existing ownership. New round: relocate core to a legal open tile, restore counter to 3, continue from the next player.
- Territory is scored with visible tile values and a small adjacency bonus. Winner is highest total after 12 captures. Ties trigger a one-capture tiebreaker.
- No hardcoded victory: all rules, turn order, countdowns, scoring, and AI must run through one deterministic state machine.

## Visual direction
Distinctly BlackHouse, not generic neon sci-fi: matte near-black `#080808`, warm ivory `#f1ede4`, warm brass `#d9b981`, weathered oxide red for rival control, thin architectural rules, substantial editorial type, and precise industrial-instrument animation. Retain clear ownership contrast and accessible labels. Keep the board visually legible on iPhone Safari.

## Scope boundaries
One polished Quick Match mode against CPU with replay; responsive portrait-first touch and desktop mouse support; menu, concise first-play tutorial, pause/help, results, sound toggle, and local best record. Procedural 2D visuals only, no character models, no external assets, no backend, no accounts, no shop, no multiplayer, no premature campaign.

## Delivery
Lightweight static app (TypeScript + Vite is preferred). Add actual automated rules tests and smoke-test the built app if tools permit. Set up GitHub Pages deployment. Provide commit SHA, test counts, live URL if deployment is verifiable, and remaining limitations. Do not claim deployment without checking.
