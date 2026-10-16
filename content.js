(() => {
  const { toDirections, commandFor, formatDirections, COMMAND_LABELS } = MouseGesture;

  let settings = mergeSettings();
  let disabledPatterns = [];

  function applySettings(next) {
    settings = next;
    disabledPatterns = settings.disabledUrlPatterns.flatMap((pattern) => {
      try {
        return [new RegExp(pattern)];
      } catch {
        return [];
      }
    });
  }

  applySettings(settings);
  loadSettings().then(applySettings);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) applySettings(mergeSettings(changes.settings.newValue));
  });

  const isDisabled = () => disabledPatterns.some((re) => re.test(location.href));

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }


  const OVERLAY_STYLE = `
    :host { all: initial; }
    canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483646;
      pointer-events: none;
    }
    .label {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483647;
      padding: 8px 16px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font: bold 16px/1.4 system-ui, sans-serif;
      white-space: nowrap;
      pointer-events: none;
    }
  `;

  function createOverlay() {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = OVERLAY_STYLE;
    const canvas = document.createElement('canvas');
    const label = document.createElement('div');
    label.className = 'label';
    root.append(style, canvas, label);
    document.documentElement.append(host);

    const ratio = devicePixelRatio;
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = 'rgba(198, 40, 40, 0.8)';

    return {
      draw(points, text) {
        context.clearRect(0, 0, innerWidth, innerHeight);
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const { x, y } of points.slice(1)) context.lineTo(x, y);
        context.stroke();
        label.textContent = text;
      },
      remove: () => host.remove(),
    };
  }

  let gesture = null;
  let suppressContextMenu = false;

  function endGesture() {
    gesture?.overlay?.remove();
    gesture = null;
  }

  window.addEventListener(
    'mousedown',
    (event) => {
      if (event.button !== 2) return;
      suppressContextMenu = false;
      endGesture();
      if (!settings.gestureEnabled || isDisabled()) return;
      gesture = { points: [{ x: event.clientX, y: event.clientY }], directions: '', overlay: null };
    },
    true,
  );

  window.addEventListener(
    'mousemove',
    (event) => {
      if (!gesture) return;
      // The button can be released outside the window, where no mouseup reaches the page.
      if (!(event.buttons & 2)) {
        endGesture();
        return;
      }
      gesture.points.push({ x: event.clientX, y: event.clientY });
      gesture.directions = toDirections(gesture.points);
      if (!gesture.directions) return;
      gesture.overlay ??= createOverlay();
      const command = commandFor(gesture.directions, settings.gestures);
      const arrows = formatDirections(gesture.directions);
      gesture.overlay.draw(gesture.points, command ? `${arrows} ${COMMAND_LABELS[command]}` : arrows);
    },
    true,
  );

  window.addEventListener(
    'mouseup',
    (event) => {
      if (event.button !== 2 || !gesture) return;
      const { directions } = gesture;
      endGesture();
      if (!directions) return;
      suppressContextMenu = true;
      consume(event);
      const command = commandFor(directions, settings.gestures);
      if (command) chrome.runtime.sendMessage({ type: 'gesture', command });
    },
    true,
  );

  window.addEventListener(
    'contextmenu',
    (event) => {
      if (!suppressContextMenu) return;
      suppressContextMenu = false;
      consume(event);
    },
    true,
  );


  // A notch of a physical mouse wheel is reported as a multiple of 120; touchpads report arbitrary values and are already smooth.
  const isMouseWheel = (event) =>
    (event.wheelDeltaX !== 0 || event.wheelDeltaY !== 0) && event.wheelDeltaX % 120 === 0 && event.wheelDeltaY % 120 === 0;

  const AXES = {
    x: { position: 'scrollLeft', size: 'scrollWidth', client: 'clientWidth', overflow: 'overflowX', option: 'left' },
    y: { position: 'scrollTop', size: 'scrollHeight', client: 'clientHeight', overflow: 'overflowY', option: 'top' },
  };

  let animation = null;

  const maxPosition = (el, axis) => el[AXES[axis].size] - el[AXES[axis].client];

  function canScroll(el, axis) {
    const { overflow } = AXES[axis];
    if (maxPosition(el, axis) <= 0) return false;
    if (el === document.scrollingElement) {
      return [document.documentElement, document.body].every((e) => !e || getComputedStyle(e)[overflow] !== 'hidden');
    }
    return ['auto', 'scroll', 'overlay'].includes(getComputedStyle(el)[overflow]);
  }

  // Measured against the pending target so that quick successive notches are not stopped by the position mid-animation.
  function canMove(el, axis, delta) {
    const position = animation?.el === el && animation.axis === axis ? animation.target : el[AXES[axis].position];
    return delta < 0 ? position > 0 : position < maxPosition(el, axis) - 1;
  }

  function scrollTarget(event, axis, delta) {
    const scrollable = (el) => canScroll(el, axis) && canMove(el, axis, delta);
    const root = document.scrollingElement;
    for (const el of event.composedPath()) {
      if (!(el instanceof Element) || el === root || el === document.body) continue;
      if (scrollable(el)) return el;
    }
    return root && scrollable(root) ? root : null;
  }

  function setPosition(el, axis, value) {
    el.scrollTo({ [AXES[axis].option]: value, behavior: 'instant' });
  }

  function step(now) {
    const { el, axis, from, target, start } = animation;
    const t = Math.min(1, Math.max(0, (now - start) / settings.scrollDuration));
    setPosition(el, axis, from + (target - from) * (1 - (1 - t) ** 3));
    if (t < 1) {
      animation.frame = requestAnimationFrame(step);
    } else {
      animation = null;
    }
  }

  function scrollSmoothly(el, axis, delta) {
    if (animation?.el !== el || animation.axis !== axis) {
      if (animation) cancelAnimationFrame(animation.frame);
      animation = { el, axis, target: el[AXES[axis].position] };
      animation.frame = requestAnimationFrame(step);
    }
    animation.from = el[AXES[axis].position];
    animation.target = Math.min(maxPosition(el, axis), Math.max(0, animation.target + delta));
    animation.start = performance.now();
  }

  // Listening in the bubble phase lets pages that handle the wheel themselves, such as maps, cancel it first.
  window.addEventListener(
    'wheel',
    (event) => {
      if (!settings.smoothScrollEnabled || event.defaultPrevented || event.ctrlKey || !isMouseWheel(event)) return;
      const axis = event.wheelDeltaY !== 0 ? 'y' : 'x';
      const notches = -(axis === 'y' ? event.wheelDeltaY : event.wheelDeltaX) / 120;
      const delta = notches * settings.scrollStep;
      const target = scrollTarget(event, axis, delta);
      if (!target) return;
      event.preventDefault();
      scrollSmoothly(target, axis, delta);
    },
    { passive: false },
  );
})();
