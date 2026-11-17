// Emberlight — staging the screenshots.
//
// ?shot=start shows the title screen, ?shot=play a wave in full swing,
// ?shot=play2 a later wave with a fuller board, ?shot=end the dawn after
// the last wave. Each shot builds a fixed scene from a seed and then
// freezes it, so the same URL always renders the same picture.
export function stageShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') || '7');

  if (shot === 'start') {
    // The title screen, as a new player sees it.
    return true;
  }

  if (shot === 'play' || shot === 'play2') {
    const late = shot === 'play2';
    game.beginPlay();
    // A Keeper who already knows the shore: towers on the good plots.
    const builds = late
      ? [
          ['brazier', 4, 4], ['brazier', 7, 6], ['brazier', 2, 5],
          ['lantern', 9, 3], ['lantern', 11, 5], ['spire', 11, 3],
          ['spire', 13, 5],
        ]
      : [
          ['brazier', 4, 4], ['brazier', 7, 6],
          ['lantern', 9, 3], ['spire', 11, 3],
        ];
    game.state.gold = 999;
    for (const [type, col, row] of builds) game.autoBuild(type, col, row);
    if (late) {
      const spire = game.state.towerAt(11, 3);
      if (spire) {
        game.state.spend(spire.upgradeCost);
        spire.upgrade();
      }
      const lantern = game.state.towerAt(9, 3);
      if (lantern) {
        game.state.spend(lantern.upgradeCost);
        lantern.upgrade();
      }
    }
    game.state.wave = late ? 6 : 2;
    game.state.startWave();
    // Run the wave forward a fixed number of steps, then freeze it.
    game.simulate(late ? 14 : 10);
    game.frozen = true;
    return true;
  }

  if (shot === 'end') {
    game.beginPlay();
    game.state.wave = 12;
    game.state.kills = 214;
    game.state.goldEarned = 2310;
    game.state.score = 8420;
    game.state.ember = 9;
    game.state.phase = 'won';
    game.state.endReason = 'Dawn breaks over a shore still lit. The lighthouse stands.';
    game.showEndScreen();
    game.frozen = true;
    return true;
  }

  return false;
}
