// Emberlight — the Ember Blessings.
//
// After every cleared wave the Keeper chooses one of three blessings.
// Each is a small permanent gift that shapes the rest of the run: one
// favours braziers, one lanterns, one spires, one the purse. A blessing
// can be chosen at most twice — its gift stacks to two, then leaves the
// offer — and what the Keeper picked is shown in the side panel, so a
// run's choices stay visible.
//
// The blessings are deliberately modest. A run that takes every gift
// twice is stronger, but not so strong that the shore stops being
// dangerous: the greedy bot still has to earn its win, and the weak
// Keeper still breaks around wave four.
export const BLESSINGS = {
  longFlame: {
    id: 'longFlame',
    name: 'Long Flame',
    icon: '🔥',
    blurb: 'Braziers reach +15.',
    detail: 'Every Ember Brazier reaches 15 pixels further.',
  },
  rimeglass: {
    id: 'rimeglass',
    name: 'Rimeglass',
    icon: '❄️',
    blurb: 'Lantern chill lasts +0.5s.',
    detail: 'Every Frost Lantern holds the dark still 0.5 seconds longer.',
  },
  forked: {
    id: 'forked',
    name: 'Forked Conduit',
    icon: '⚡',
    blurb: 'Spire bolts keep +10% per leap.',
    detail: 'Every Storm Spire bolt loses less strength as it leaps.',
  },
  keepersDue: {
    id: 'keepersDue',
    name: "Keeper's Due",
    icon: '🪙',
    blurb: 'Wave-clear bonus pays +6 gold.',
    detail: 'Every wave you clear pays 6 more gold, from now on.',
  },
};

export const BLESSING_IDS = ['longFlame', 'rimeglass', 'forked', 'keepersDue'];

// A fresh count of blessings: how many times each has been chosen.
export function freshBlessings() {
  return { longFlame: 0, rimeglass: 0, forked: 0, keepersDue: 0 };
}

// Deal three of the four blessings, in a shuffled order, using the
// game's seeded random numbers so a staged scene can replay its offer.
// A blessing can be taken at most twice: once the Keeper holds two of
// it, it leaves the offer, so no run stacks one gift without end. If
// every blessing is maxed, the offer is empty and no choice is offered.
export function drawBlessingOffer(rng, blessings) {
  const available = BLESSING_IDS.filter((id) => (blessings[id] || 0) < 2);
  const ids = [...available];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng.float() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 3);
}

// One line per blessing the Keeper holds, for the side panel.
export function describeBlessings(blessings) {
  const lines = [];
  for (const id of BLESSING_IDS) {
    const count = blessings[id] || 0;
    if (count > 0) lines.push(`${BLESSINGS[id].icon} ${BLESSINGS[id].name} ×${count}`);
  }
  return lines;
}
