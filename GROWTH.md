# Growth Context

*Last updated: 2026-09-13*

## Product
- **Name:** ChatGPT Bulk Delete
- **One-liner:** Trash on the ChatGPT sidebar row, plus bulk-select for chats.
- **What it does:** Injects multi-select and a delete control into chatgpt.com. Bulk-select chats with checkboxes, or delete one chat or project from the row next to pin / edit / more. Calls ChatGPT's own session API. No extra panel, no store listing yet.
- **Category:** Chrome extension for ChatGPT history cleanup

## Platform & distribution
- **Platform / requirements:** Chromium (Chrome, Edge, Arc, Brave). Manifest V3. chatgpt.com or chat.openai.com, signed in.
- **How it ships / installs:** GitHub only. Clone or download ZIP, Load unpacked. Not on the Chrome Web Store.
- **Updates:** Manual. Reload the unpacked folder after `git pull`.
- **Repo:** https://github.com/EvilIrving/chatgpt-bulk-delete
- **Site:** none

## Pricing model
- Free, MIT. No paid features, no account.

## Audience
- **Who it's for:** People who use ChatGPT a lot (image gens, throwaway threads) and drown in sidebar history.
- **Why they reach for it:** Native ChatGPT only deletes one chat at a time through a menu. Cleaning hundreds of one-shot chats is painful.

## Differentiators (ranked, all true)
- Lives in the ChatGPT sidebar. No popup, no floating panel, no "add checkboxes" step.
- Row-level delete next to the native pin / edit / more controls, for chats and projects.
- Matches ChatGPT's icon language: color change only, no extra hover chips.
- No extra Chrome permissions. Runs only on chatgpt.com / chat.openai.com. No analytics, no remote server.
- Open source, load-from-source. You can read `content.js` before it touches your session.

## Competitors / alternatives
| Name | Model | Honest strength | How we differ |
|------|-------|-----------------|---------------|
| ChatGPT Bulk Delete (qcrao) | Free + paid archive, Chrome Web Store, ~60k users | Mature, store install, shift-select, large audience | Popup-driven; extra hosts and identity permission; this one stays in the sidebar and has no paid layer |
| ChatGPT native UI | Bundled | Trust, no install | One-at-a-time through the more menu |
| Userscripts / Tampermonkey bulk deleters | Free | Fast to try if you already run a userscript manager | This is a proper MV3 extension with a public repo |

## Channels
- **Where this audience is:** GitHub search ("chatgpt bulk delete"), r/ChatGPT, r/OpenAI, r/chrome_extensions, HN Show HN later, awesome-chatgpt lists
- **Languages to publish in:** English (primary, GitHub discovery) and Chinese (author's users)

## Voice
- **Tone:** Developer-to-developer, short, factual
- **Words to use / avoid:** Use: sidebar, unpacked, session, unofficial. Avoid: seamless, powerful, revolutionary, official, guaranteed

## Proof points (REAL only)
- None yet. New public repo.

## Links
- **Social handles / accounts:** GitHub [EvilIrving](https://github.com/EvilIrving)
- **Press / contact:** GitHub issues
