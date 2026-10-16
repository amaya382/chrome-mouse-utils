async function activateNeighborTab(tab, offset) {
  const tabs = await chrome.tabs.query({ windowId: tab.windowId });
  const index = (tab.index + offset + tabs.length) % tabs.length;
  const neighbor = tabs.find((t) => t.index === index);
  if (neighbor) await chrome.tabs.update(neighbor.id, { active: true });
}

const commands = {
  back: (tab) => chrome.tabs.goBack(tab.id),
  forward: (tab) => chrome.tabs.goForward(tab.id),
  reload: (tab) => chrome.tabs.reload(tab.id),
  closeTab: (tab) => chrome.tabs.remove(tab.id),
  reopenTab: () => chrome.sessions.restore(),
  previousTab: (tab) => activateNeighborTab(tab, -1),
  nextTab: (tab) => activateNeighborTab(tab, 1),
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== 'gesture' || !sender.tab) return;
  // Rejections such as going back with no history are expected and need no handling.
  commands[message.command]?.(sender.tab)?.catch(() => {});
});
