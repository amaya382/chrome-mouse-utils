<p align="right"><strong>English</strong> / <a href="README_ja.md">日本語</a></p>

<h1 align="center">🖱️ Mouse Utils Chrome Extension</h1>

<p align="center"><strong>Browse with right-button gestures and smooth wheel scrolling.</strong></p>

Mouse Utils is a Manifest V3 Chrome extension written in plain JavaScript. There is no build step: the repository directory is the extension.

## ✨ Features

- **Mouse gestures** — hold the right button and draw to go back and forward, reload, close or reopen a tab, and switch to the neighboring tab. The stroke and the matching action are shown while drawing, and a plain right click still opens the context menu. Each action's gesture can be changed in the options
- **Smooth scrolling** — each mouse wheel notch scrolls with a short animation instead of jumping. Inner scroll panes are scrolled too, and pages that use the wheel themselves, such as maps, keep it
- **Stays out of the way** — turn each feature on and off from the toolbar popup, and turn gestures off per site with regular expressions on the URL

## 🚀 Quick Start

**Requirements:** desktop Chrome on Windows. See [Troubleshooting](#-troubleshooting) for macOS and Linux.

1. Clone this repository

   ```bash
   git clone https://github.com/amaya382/chrome-mouse-utils.git
   ```

2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the cloned directory

Tabs that were already open before installing need a reload. Mouse gestures are off by default: turn on "Mouse gestures" in the toolbar popup, then hold the right button on a page and drag to the left. The tab on the left becomes active if the extension is working.

To update, run `git pull` and click the reload button on the extension's card in `chrome://extensions/`.

## 🖱️ Gestures

The defaults are below, all turned on. In the options, each gesture can be changed or turned off, and a preview shows its shape.

| Gesture | Action |
| --- | --- |
| ↑← | Go back |
| ↑→ | Go forward |
| ↑↓ | Reload |
| ↓ | Close the tab |
| ↑ | Reopen the last closed tab |
| ← | Switch to the tab on the left |
| → | Switch to the tab on the right |

Tab switching wraps around at either end of the window. Strokes shorter than 20 px are ignored, and a gesture that matches no action does nothing but still suppresses the context menu.

## ⚙️ Configuration

Click the extension's icon in the toolbar to open its popup.

| Setting | Default | Description |
| --- | --- | --- |
| Mouse gestures | Off | Recognize right-button gestures |
| Smooth scroll | On | Animate mouse wheel scrolling |

"Options" in the popup opens the options page.

| Setting | Default | Description |
| --- | --- | --- |
| Gestures | See [Gestures](#️-gestures) | A checkbox that turns each action's gesture on or off, and up to three strokes for it, chosen from ← → ↑ ↓ |
| Scroll step | `120` | Pixels scrolled per wheel notch |
| Duration | `200` | Milliseconds one scroll animation takes |
| Disabled URLs | (empty) | Regular expressions, one per line. Mouse gestures are disabled on pages whose URL matches any of them. Smooth scrolling is not affected |

Saving is rejected when a turned-on action has no strokes, when two turned-on actions share a gesture, when the same direction appears twice in a row (`←←` is drawn as `←`), when a number is not a positive integer, or when a regular expression does not compile.

Settings are stored in `chrome.storage.sync`, so they follow the Chrome profile to every device signed in to it. Open tabs pick up a change without a reload.

## 🔒 Permissions

- `storage` — save and sync settings
- `sessions` — reopen the last closed tab
- Access to all sites — handle mouse input on every page

## 🔧 Troubleshooting

### Gestures and scrolling do nothing on a page

Chrome does not run extensions on `chrome://` pages or the Chrome Web Store. On other pages, check that the tab was reloaded after installing and that no Disabled URLs entry matches the page.

### The context menu opens when a gesture starts on macOS or Linux

Chrome on macOS and Linux opens the context menu as soon as the right button is pressed, before the gesture is drawn. Gestures are designed for Windows, where the menu opens on release and can be suppressed.

### Gestures and smooth scrolling do not work over embedded content

Mouse Utils runs only in the top-level frame. Inside an iframe, such as an embedded video or document, the browser's default right click and scrolling apply.

### Scrolling with a touchpad is not smoothed

Smooth scrolling applies only to mouse wheel notches. Touchpads already scroll smoothly, so their input is left to Chrome.

## 🧪 Development

Run the tests with Node.js 18 or later:

```bash
node --test
```

After editing, click the reload button on the extension's card in `chrome://extensions/`, then reload the page you test on.
