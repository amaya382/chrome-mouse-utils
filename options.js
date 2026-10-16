const form = document.getElementById('form');
const scrollStepInput = document.getElementById('scrollStep');
const scrollDurationInput = document.getElementById('scrollDuration');
const patternsInput = document.getElementById('disabledUrlPatterns');
const statusEl = document.getElementById('status');

const { MAX_STROKES, COMMAND_LABELS, ARROWS, validateGestures } = MouseGesture;

function createStrokeSelect() {
  const select = document.createElement('select');
  select.append(new Option('', ''));
  for (const [direction, arrow] of Object.entries(ARROWS)) select.append(new Option(arrow, direction));
  return select;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const PREVIEW_SIZE = 40;
const PREVIEW_PADDING = 8;
const VECTORS = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };

// A reversal is drawn as a narrow hairpin so that a gesture such as ↑↓ does not collapse onto one line.
function previewPoints(directions) {
  const points = [[0, 0]];
  let previous = null;
  for (const direction of directions) {
    const [dx, dy] = VECTORS[direction];
    let [x, y] = points.at(-1);
    if (previous && VECTORS[previous][0] === -dx && VECTORS[previous][1] === -dy) {
      x += Math.abs(dy) * 0.4;
      y += Math.abs(dx) * 0.4;
      points.push([x, y]);
    }
    points.push([x + dx, y + dy]);
    previous = direction;
  }
  return points;
}

function svgElement(name, attributes) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}

function drawPreview(svg, directions) {
  svg.replaceChildren();
  if (!directions) return;
  const raw = previewPoints(directions);
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const scale = (PREVIEW_SIZE - PREVIEW_PADDING * 2) / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const offsetX = (PREVIEW_SIZE - (Math.max(...xs) - Math.min(...xs)) * scale) / 2 - Math.min(...xs) * scale;
  const offsetY = (PREVIEW_SIZE - (Math.max(...ys) - Math.min(...ys)) * scale) / 2 - Math.min(...ys) * scale;
  const points = raw.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);

  const [[endX, endY], [beforeX, beforeY]] = [points.at(-1), points.at(-2)];
  const length = Math.hypot(endX - beforeX, endY - beforeY);
  const [ux, uy] = [(endX - beforeX) / length, (endY - beforeY) / length];
  const head = [
    [endX, endY],
    [endX - ux * 6 - uy * 4, endY - uy * 6 + ux * 4],
    [endX - ux * 6 + uy * 4, endY - uy * 6 - ux * 4],
  ];
  const [startX, startY] = points[0];
  svg.append(
    svgElement('polyline', {
      points: points.map((p) => p.join(',')).join(' '),
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    svgElement('polygon', { points: head.map((p) => p.join(',')).join(' '), fill: 'currentColor' }),
    svgElement('circle', { cx: startX, cy: startY, r: 3, fill: 'currentColor' }),
  );
}

const readStrokes = (selects) => selects.map((select) => select.value).join('');

function updateEnabled(checkbox, selects) {
  for (const select of selects) select.disabled = !checkbox.checked;
}

const strokeSelects = Object.fromEntries(
  Object.entries(COMMAND_LABELS).map(([command, text]) => {
    const row = document.createElement('div');
    row.className = 'gesture-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const strokes = document.createElement('span');
    strokes.className = 'strokes';
    const selects = Array.from({ length: MAX_STROKES }, createStrokeSelect);
    const preview = svgElement('svg', { class: 'preview', viewBox: `0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}` });
    strokes.append(...selects, preview);
    for (const select of selects) {
      select.addEventListener('change', () => drawPreview(preview, readStrokes(selects)));
    }
    checkbox.addEventListener('change', () => updateEnabled(checkbox, selects));
    const name = document.createElement('label');
    name.append(checkbox, ` ${text}`);
    row.append(name, strokes);
    document.getElementById('gestures').append(row);
    return [command, { checkbox, selects, preview }];
  }),
);

function render(settings) {
  for (const [command, { checkbox, selects, preview }] of Object.entries(strokeSelects)) {
    const { enabled, strokes } = settings.gestures[command];
    checkbox.checked = enabled;
    updateEnabled(checkbox, selects);
    selects.forEach((select, i) => {
      select.value = strokes[i] ?? '';
    });
    drawPreview(preview, readStrokes(selects));
  }
  scrollStepInput.value = settings.scrollStep;
  scrollDurationInput.value = settings.scrollDuration;
  patternsInput.value = settings.disabledUrlPatterns.join('\n');
}

function readForm() {
  return {
    // Empty strokes in between are skipped, so ← (empty) → is the same as ←→.
    gestures: Object.fromEntries(
      Object.entries(strokeSelects).map(([command, { checkbox, selects }]) => [
        command,
        { enabled: checkbox.checked, strokes: readStrokes(selects) },
      ]),
    ),
    scrollStep: Number(scrollStepInput.value),
    scrollDuration: Number(scrollDurationInput.value),
    disabledUrlPatterns: patternsInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

function validate(values) {
  const errors = validateGestures(values.gestures);
  if (!Number.isInteger(values.scrollStep) || values.scrollStep < 1) {
    errors.push('Scroll step must be a positive integer.');
  }
  if (!Number.isInteger(values.scrollDuration) || values.scrollDuration < 1) {
    errors.push('Duration must be a positive integer.');
  }
  for (const pattern of values.disabledUrlPatterns) {
    try {
      new RegExp(pattern);
    } catch (e) {
      errors.push(`Invalid regular expression: ${pattern} (${e.message})`);
    }
  }
  return errors;
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = readForm();
  const errors = validate(values);
  if (errors.length > 0) {
    showStatus(errors.join('\n'), true);
    return;
  }
  // Toggles are owned by the popup, so they are kept as stored.
  await saveSettings({ ...(await loadSettings()), ...values });
  render(values);
  showStatus('Saved.');
});

document.getElementById('reset').addEventListener('click', () => {
  render(DEFAULT_SETTINGS);
  showStatus('Defaults restored. Save to apply.');
});

loadSettings().then(render);
