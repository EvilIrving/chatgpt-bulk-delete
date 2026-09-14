# Contributing

ChatGPT's sidebar changes often. Most useful PRs fix selectors or the project-delete API.

## Run locally

1. Clone the repo
2. `chrome://extensions` → Developer mode → Load unpacked → this folder
3. Refresh chatgpt.com

There is no build step. Edit `content.js` / `content.css` / `manifest.json` and click Reload on the extension card.

## Regression test

[`test/`](test/) drives the real `content.js` against a static fixture of the
sidebar and asserts the failure modes we have already been bitten by (one broken
row blocking the rest, stale buttons from an older build, icons landing on a
project name). Node 22+ and a local Chrome:

```
node test/run.mjs              # must pass
node test/run.mjs --baseline   # shows which checks HEAD fails
```

Add a scenario when you fix something that was invisible in review.

## Pull requests

- Keep the UI native: no extra labels, no hover chips, no helper copy on the page
- Don't add permissions, analytics, or remote hosts
- Icons: Remix Icon or clone ChatGPT's own SVG. Don't hand-draw replacements
- Say what ChatGPT UI you tested against (language, light/dark, whether Projects was expanded)

## Bugs

Open an issue with Chrome version, chatgpt.com language, and whether it failed on chats, projects, or both.
