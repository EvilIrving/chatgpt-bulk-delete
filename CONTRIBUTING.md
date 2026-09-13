# Contributing

ChatGPT's sidebar changes often. Most useful PRs fix selectors or the project-delete API.

## Run locally

1. Clone the repo
2. `chrome://extensions` → Developer mode → Load unpacked → this folder
3. Refresh chatgpt.com

There is no build step. Edit `content.js` / `content.css` / `manifest.json` and click Reload on the extension card.

## Pull requests

- Keep the UI native: no extra labels, no hover chips, no helper copy on the page
- Don't add permissions, analytics, or remote hosts
- Icons: Remix Icon or clone ChatGPT's own SVG. Don't hand-draw replacements
- Say what ChatGPT UI you tested against (language, light/dark, whether Projects was expanded)

## Bugs

Open an issue with Chrome version, chatgpt.com language, and whether it failed on chats, projects, or both.
