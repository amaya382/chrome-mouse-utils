(function (root) {
  const MIN_STROKE = 20;
  const MAX_STROKES = 3;

  const COMMAND_LABELS = {
    back: 'Go back',
    forward: 'Go forward',
    reload: 'Reload',
    closeTab: 'Close tab',
    reopenTab: 'Reopen closed tab',
    previousTab: 'Previous tab',
    nextTab: 'Next tab',
  };

  const ARROWS = { L: '←', R: '→', U: '↑', D: '↓' };

  // A new segment starts only after the pointer travels MIN_STROKE px from the previous anchor, so hand jitter is ignored.
  function toDirections(points) {
    let directions = '';
    let [anchor] = points;
    for (const point of points.slice(1)) {
      const dx = point.x - anchor.x;
      const dy = point.y - anchor.y;
      if (Math.hypot(dx, dy) < MIN_STROKE) continue;
      const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
      if (!directions.endsWith(direction)) directions += direction;
      anchor = point;
    }
    return directions;
  }

  const commandFor = (directions, gestures) =>
    Object.keys(gestures).find((command) => gestures[command].enabled && gestures[command].strokes === directions) ?? null;

  const formatDirections = (directions) => [...directions].map((d) => ARROWS[d]).join('');

  function validateGestures(gestures) {
    const errors = [];
    const owners = {};
    for (const [command, { enabled, strokes: directions }] of Object.entries(gestures)) {
      if (!enabled) continue;
      const label = COMMAND_LABELS[command];
      if (!directions) errors.push(`${label}: choose at least one stroke.`);
      if (directions.length > MAX_STROKES) errors.push(`${label}: at most ${MAX_STROKES} strokes.`);
      // toDirections merges repeated strokes, so a gesture such as ←← could never be drawn.
      if (/(.)\1/.test(directions)) errors.push(`${label}: the same direction cannot repeat.`);
      if (owners[directions]) errors.push(`${label} has the same gesture as ${COMMAND_LABELS[owners[directions]]}.`);
      owners[directions] ??= command;
    }
    return errors;
  }

  const api = { MAX_STROKES, COMMAND_LABELS, ARROWS, toDirections, commandFor, formatDirections, validateGestures };
  root.MouseGesture = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
