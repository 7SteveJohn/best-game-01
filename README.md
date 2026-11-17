# Emberlight — The Last Lighthouse

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/7SteveJohn/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/7SteveJohn/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A tower-defense game for the [make.fun best-game-01](https://make.fun/bounty/best-game-01) bounty. Night has swallowed the shore, and the dark is crawling toward the last ember. You are the Keeper of the lighthouse: raise braziers, lanterns and storm spires along the shore path, burn the creatures down before they reach the flame, and hold the light through all twelve waves — the last one brings the Dread Moth.

## How to play

- **Pick a tower** with keys `1`/`2`/`3` or by clicking its card, then **click a plot** to build it.
- **Ember Brazier** (50 gold): cheap, fast, short reach. **Frost Lantern** (75 gold): chills what it hits, halving its speed. **Storm Spire** (120 gold): slow, heavy bolts that leap between foes.
- **Click a tower** on the board to upgrade it (up to level 3) or sell it back for 70%.
- **Space** (or the button) starts the next wave. Clearing a wave pays a bonus.
- **P** pause, **F** double speed, **M** mute, **R** restart on the end screen.
- You win by clearing wave 12. You lose if the ember's 12 hits run out — a leaked creature costs 1, a brute 2, the Dread Moth 5.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network: the game is static files under `game/`, all art drawn on canvas and all sound synthesized with WebAudio.

## Files

- `game/index.html`, `game/style.css` — page, HUD and side panel
- `game/src/main.js` — boot, game loop, HUD and shop
- `game/src/state.js` — gold, ember, waves, win/lose
- `game/src/config.js` — board, towers, creatures, waves, palette
- `game/src/levels.js` — the shore path and wave queues
- `game/src/enemies.js` — the creatures that walk the path
- `game/src/towers.js` — the three towers and their shots
- `game/src/render.js` — everything the eye sees
- `game/src/particles.js` — sparks, smoke, floating numbers, shake
- `game/src/audio.js` — synthesized sound effects and wind
- `game/src/input.js` — mouse and keyboard
- `game/src/shots.js` — deterministic staging for the screenshots
- `game/src/random.js` — seeded random numbers
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
