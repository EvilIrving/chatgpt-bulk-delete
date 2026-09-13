# ChatGPT Bulk Delete

Chrome extension that bulk-deletes [ChatGPT](https://chatgpt.com) chats and projects from the sidebar.

No extra panel. No store listing. Load it unpacked from this repo.

<p align="center">
  <img src="docs/social.png" width="640" alt="ChatGPT Bulk Delete: select chats in the sidebar, delete them in one click">
</p>

ChatGPT still deletes one conversation at a time through the more menu. This extension puts checkboxes and a delete control on the list you already use.

## Features

- Multi-select chats in the sidebar, then delete them in one click
- Shift-click a range, or use the header checkbox for the visible list
- A delete icon on each chat and each project, next to pin / edit / more
- Uses ChatGPT's own session API (`PATCH /backend-api/conversation/{id}`)
- Looks like ChatGPT: icon color only, no extra hover chips
- No extra Chrome permissions, no analytics, no remote server

## Install

1. Download the [latest release ZIP](https://github.com/EvilIrving/chatgpt-bulk-delete/releases/latest), or clone this repo
2. Open `chrome://extensions`
3. Turn on **Developer mode**
4. **Load unpacked** and pick the folder that contains `manifest.json`
5. Open [chatgpt.com](https://chatgpt.com) and refresh

Works in Chrome, Edge, Arc, and Brave.

## Privacy

The extension only runs on `chatgpt.com` and `chat.openai.com`. It does not add `storage`, `identity`, or extra host permissions. Deletes go to ChatGPT's own backend with the cookie you already have. Nothing is sent to the author.

Read [`content.js`](content.js) if you want to verify that before loading it.

## How it works

- **Chats:** `PATCH /backend-api/conversation/{id}` with `{ "is_visible": false }` (the same soft-delete ChatGPT uses)
- **Projects:** ChatGPT's gizmo/project API, with a fallback to the native delete menu if the API shape has changed
- **UI:** a content script in the page, so it can use your existing session. Selectors will break when OpenAI redesigns the sidebar. PRs welcome.

## Not affiliated

Unofficial. Not made by, endorsed by, or affiliated with OpenAI. ChatGPT is a trademark of OpenAI.

## Limits

- ChatGPT DOM changes can hide the buttons until the selectors are updated
- Not on the Chrome Web Store
- Project delete may fall back to ChatGPT's own confirm dialog
- Deleted chats follow OpenAI's retention rules, same as deleting them by hand

## License

MIT. Icons from [Remix Icon](https://remixicon.com).

If this saves you a slog through the sidebar, a star helps other people find it.

---

## 中文

在 chatgpt.com 侧边栏勾选对话，一键删除。每条聊天和每个项目旁边也可以直接点删除，不用进「更多」。

**安装：** 下载 [Release ZIP](https://github.com/EvilIrving/chatgpt-bulk-delete/releases/latest) 或 clone 本仓库 → `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选中含 `manifest.json` 的目录 → 打开 chatgpt.com 并刷新。

只在 ChatGPT 官网运行，没有额外权限，没有统计，不经过作者的服务器。非正式产品，与 OpenAI 无关。
