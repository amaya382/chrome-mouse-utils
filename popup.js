const toggles = [
  { id: 'gesture', key: 'gestureEnabled' },
  { id: 'smoothScroll', key: 'smoothScrollEnabled' },
];

loadSettings().then((settings) => {
  for (const { id, key } of toggles) document.getElementById(id).checked = settings[key];
});

for (const { id, key } of toggles) {
  const checkbox = document.getElementById(id);
  checkbox.addEventListener('change', async () => {
    const settings = await loadSettings();
    await saveSettings({ ...settings, [key]: checkbox.checked });
  });
}

document.getElementById('options').addEventListener('click', (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});
