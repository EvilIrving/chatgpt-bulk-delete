# ChatGPT 批量删除

[English](README.md) · [中文](README.zh-CN.md)

Chrome 扩展：在 chatgpt.com 侧边栏批量删除对话、聊天记录和项目。

ChatGPT 把删除藏在 **•••** 里，只能一条一条点。这个扩展把垃圾桶直接放在编辑 / 更多旁边，对话和项目都是。清很多对话时，点编辑旁的多选，勾上，再点删除。

<p align="center">
  <img src="docs/sidebar.png" width="360" alt="ChatGPT 侧边栏：勾选对话，每条旁边有删除">
</p>

## 用法

- **删一条对话或一个项目：** 悬停那一行，点编辑 / ••• 旁边的垃圾桶
- **删很多对话：** 点「编辑」旁的多选图标，勾选（Shift 连选），点垃圾桶

页面上不加说明、不加浮层、不加弹窗。

## 安装

还没上架 Chrome 商店。用「加载已解压的扩展程序」：

1. 下载 [最新 ZIP](https://github.com/EvilIrving/chatgpt-bulk-delete/releases/latest) 并解压，或 clone 本仓库
2. 打开 `chrome://extensions`
3. 打开「开发者模式」
4. 「加载已解压的扩展程序」→ 选中里面有 `manifest.json` 的目录
5. 打开 [chatgpt.com](https://chatgpt.com) 并刷新

Chrome、Edge、Arc、Brave 都可以。

## 隐私

只在 `chatgpt.com` 和 `chat.openai.com` 运行。没有 `storage`、`identity` 或额外网站权限。删除走你已登录的 ChatGPT 会话，不经过作者。功能都在 [`content.js`](content.js)。

## 说明

- 非正式产品，与 OpenAI 无关
- ChatGPT 侧边栏结构会变。按钮消失时，需要改 `content.js` 里的选择器
- 对话删除走 ChatGPT 自己的接口。项目删除先走接口，接口变了会退回官网菜单
- 删除后的保留规则和在官网里手动删除一样

MIT。图标来自 [Remix Icon](https://remixicon.com)。

如果能少点一点，给仓库点个 star，别人也更容易搜到。
