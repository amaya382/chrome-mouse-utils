const DEFAULT_SETTINGS = {
  gestureEnabled: false,
  smoothScrollEnabled: true,
  gestures: {
    back: { enabled: true, strokes: 'UL' },
    forward: { enabled: true, strokes: 'UR' },
    reload: { enabled: true, strokes: 'UD' },
    closeTab: { enabled: true, strokes: 'D' },
    reopenTab: { enabled: true, strokes: 'U' },
    previousTab: { enabled: true, strokes: 'L' },
    nextTab: { enabled: true, strokes: 'R' },
  },
  scrollStep: 120,
  scrollDuration: 200,
  disabledUrlPatterns: [],
};

function mergeSettings(stored) {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    gestures: Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS.gestures).map(([command, gesture]) => [
        command,
        { ...gesture, ...stored?.gestures?.[command] },
      ]),
    ),
  };
}

async function loadSettings() {
  const { settings } = await chrome.storage.sync.get('settings');
  return mergeSettings(settings);
}

function saveSettings(settings) {
  return chrome.storage.sync.set({ settings });
}
