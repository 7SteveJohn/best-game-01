# Emberlight — Net the Night

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/7SteveJohn/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/7SteveJohn/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A game for the [make.fun best-game-01](https://make.fun/bounty/best-game-01) bounty. Hold the light through eight watches on a night sea. The lighthouse beam hurts nothing anymore — it catches. You are the Keeper: sweep the light across the dark, gather the creatures that crawl toward the ember, and carry them to the furnaces before they struggle free.

## How to play

- **Move the mouse** to aim the beam. The beam turns at 180°/s and
  opens a cone of 22° — you cannot snap it across the board, so read
  the sea and turn early.
- **Hold the mouse button** to gather. A creature inside the cone for
  0.25s is caught and hangs in the beam, in slots by distance from the
  lamp. The net holds 5 weight: a Wisp or a Shade weighs 1, a Wraith 2,
  a Brute 3, the Dread Moth 5.
- **Release over a lit furnace** to burn the catch: 100 points a
  creature, 25 more for each extra one in the same delivery. A furnace
  needs 6s to cool after a burn — rotate your deliveries.
- **Release anywhere else** and the catch slips free where it was
  caught. Catching never resets its journey, and never advances it.
- Caught creatures struggle free in 3s (Wraiths in under 2s), then
  cannot be caught again for 1s. Deliver before they break loose.
- **The Dread Moth** fills the whole net and must be delivered three
  times. Each furnace can break only one of its shell pieces — the
  gold shell by a furnace marks a piece still unbroken. If the Moth
  reaches the door it costs 5 ember and swims back to the dark edge.
- A leak costs ember: a Wisp or Shade 1, a Brute 2, the Moth 5. Lose
  all 12 ember and the light goes out. Survive all eight watches and
  the Dread Moth's three deliveries to win.

Wisps cross the sea in 10 seconds, Shades in 16, Brutes in 24. The
three furnaces light one per watch: West from watch 1, North from
watch 2, South from watch 3.

## Controls

| Key | Action |
| --- | --- |
| Mouse move | Aim the beam |
| Hold mouse | Gather the dark |
| Release | Deliver over a furnace, or drop |
| Space | Start the next watch |
| P | Pause |
| F | 1× / 2× speed |
| M | Sound on / off |
| R | Restart on the end screen |

## Screenshots

- `screenshots/start.png` — the title screen: the beam carrying four
  creatures toward the West Furnace, the North Furnace lit behind them.
- `screenshots/play.png` — Watch 4 in full swing: a crowded sea, a
  delivery burning in the West Furnace.
- `screenshots/play2.png` — Watch 8: the Dread Moth caught in the
  beam with two of its shell pieces broken, the third furnace still
  holding one.
- `screenshots/end.png` — Dawn breaks: the Moth lies broken over the
  last furnace.

## What changed in v5

v5 is a new game on the same shore, not a new tower on the old one.
The tower defense is gone: no plots, no gold, no shop, no upgrades,
no blessings, no Beacon Flare, no tides. The player does one thing —
aim the beam — and one decision — when to release it. The skill is
reading the sea: which creatures to catch, how full to let the net
get, which furnace is lit and cooled, and whether to spend the beam's
turn time on the pack at the door or the Brute still far out.

## Run it

Open `index.html` in a browser, or serve the folder with any static
server. No network, no build step, no dependencies.

## Files

- `game/index.html`, `game/style.css` — page, HUD and side panel
- `game/src/main.js` — boot, game loop, HUD and panel
- `game/src/state.js` — ember, watches, win/lose; the beam, the net, the furnaces, the Moth
- `game/src/config.js` — board, beam, creatures, watches, furnaces, palette
- `game/src/beam.js` — the Keeper's beam: its turn rate, its cone, the net
- `game/src/levels.js` — the spawn arc and watch queues
- `game/src/enemies.js` — the creatures that cross the sea
- `game/src/render.js` — everything the eye sees
- `game/src/particles.js` — sparks, smoke, floating numbers, shake
- `game/src/audio.js` — synthesized sound effects and wind
- `game/src/input.js` — mouse and keyboard
- `game/src/shots.js` — deterministic staging for the screenshots
- `game/src/random.js` — seeded random numbers
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
