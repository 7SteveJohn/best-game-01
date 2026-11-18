# Emberlight — The Last Lighthouse

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/7SteveJohn/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/7SteveJohn/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A tower-defense game for the [make.fun best-game-01](https://make.fun/bounty/best-game-01) bounty. Night has swallowed the shore, and the dark is crawling toward the last ember. You are the Keeper of the lighthouse: raise braziers, lanterns, storm spires and tide bells along the shore path, choose the ember's blessings between waves, burn the creatures down before they reach the flame, and hold the light through all twelve waves — the last one brings the Dread Moth, which splits at two thirds of its health and dims your towers at one third. The sea brings a different tide each wave, and the lighthouse itself is a weapon: once a wave, aim its flare at the thickest of the dark and watch the ground catch fire.

## How to play

- **Pick a tower** with keys `1`/`2`/`3`/`4` or by clicking its card, then **click a plot** to build it.
- **Ember Brazier** (50 gold): cheap, fast, short reach. **Frost Lantern** (75 gold): chills what it hits, halving its speed. **Storm Spire** (110 gold): slow, heavy bolts that leap between foes. **Tide Bell** (90 gold): rings every 3.2s and marks foes in reach — the next hit on a marked creature lands +15.
- **After each cleared wave, the ember offers a blessing** — pick one of three (keys `1`/`2`/`3` or click). Long Flame stretches braziers, Rimeglass lengthens the chill, Forked Conduit strengthens the spire's leaps, Keeper's Due pays more gold per wave. Blessings last the whole run and stack up to twice each.
- **The sea brings a different tide each wave** — Still Air (the first tower hit on each creature lands +50%), Ashfall (every tower's reach shrinks 8%), Blackout (towers in columns 6–10 fire 10% slower). The forecast is shown before the wave, so you can plan the build around it. The final wave is always Still Air: the air holds still for the last stand.
- **The Beacon Flare** — once per wave, the lighthouse itself burns a 3×3 patch of ground for 4 seconds: 30 damage a second to everything standing in it, and a 35% slow. It costs 2 ember, needs 3 ember left to fire, and is aimed by clicking a cell (key `5` or the panel button arms it). It costs health to save health: a flare that saves one leak costs what the leak would have, so it earns its ember only when it saves two — or holds the door when the line breaks.
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
- `game/src/state.js` — gold, ember, waves, win/lose; the tide and the Beacon
- `game/src/config.js` — board, towers, creatures, waves, palette; the Beacon and the Tides
- `game/src/beacon.js` — the Beacon Flare: its cost, its once-per-wave rule, its burning zone
- `game/src/levels.js` — the shore path and wave queues
- `game/src/enemies.js` — the creatures that walk the path
- `game/src/towers.js` — the four towers and their shots; the Tide Bell marks
- `game/src/blessings.js` — the Ember Blessings offered between waves
- `game/src/render.js` — everything the eye sees
- `game/src/particles.js` — sparks, smoke, floating numbers, shake
- `game/src/audio.js` — synthesized sound effects and wind
- `game/src/input.js` — mouse and keyboard
- `game/src/shots.js` — deterministic staging for the screenshots
- `game/src/random.js` — seeded random numbers
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
