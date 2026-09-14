/* Sidebar fixture for the regression runner (test/run.mjs).
 *
 * It renders a small but faithful stand-in for the chatgpt.com sidebar — same
 * class names, same containment, same hover-only action groups — and then lets
 * a scenario break it in the way the real page does. content.js/content.css run
 * unchanged on top of it.
 *
 * Modes (`?mode=`):
 *   normal     just the sidebar; everything must get a control
 *   stale      an older build's leftovers are already on the page
 *              (an absolutely positioned trash with a foreign data-cgbd-id,
 *              exactly the "data-cgbd-id=WEB" button seen on a real sidebar)
 *   throw      one row's anchor throws while content.js injects, to measure how
 *              far one broken row propagates
 *   select     enter and leave select mode, to catch styles left behind
 *   syncwipe   the app rebuilds the chat list synchronously while content.js is
 *              injecting (what React does when a foreign node appears)
 *   noanchor   chat rows with no native ••• button at all
 *   collapsed  the chat section is collapsed and re-expanded after injection
 *   projhover  one long project name with the hover state forced (attribute
 *              emulation for screenshots, real :hover via CDP in run.mjs)
 *
 * The result is written as JSON into <pre id="report"> a moment after load. */

const MODE = new URLSearchParams(location.search).get("mode") || "normal";
const REPORT_AT = 2800;

const PROJECTS = ["韩国签证", "聊产品 idea", "between us", "家庭厨房", "金融"];

const CHATS = [
  { id: "6aa79f39-8504-83ee-b6ee-27a08e5bb8da", title: "解释配送费用", active: true },
  { id: "6aa57044-fb20-83ee-a953-18aca4efd396", title: "Draw charcoal cat" },
  { id: "6aa52f89-9e9c-83ee-8f68-8fe634c7e900", title: "训练表达能力" },
  { id: "6a5e5c86-a6f4-83ea-9cfd-d46cabe7202e", title: "AI知识库文章精选" },
  { id: "6a9dc588-5bb4-83ee-b4c9-8475de4b095e", title: "小红书封面标题" },
];

const GLYPH = {
  folder: `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2.5 5.5h5l1.5 2h8.5v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"/></svg>`,
  compose: `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M10 4v12M4 10h12"/></svg>`,
  dots: `<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><circle cx="5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15" cy="10" r="1.4"/></svg>`,
  pin: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M5 2h6l-.7 4.2 2.2 2.6H3.5l2.2-2.6z"/><path d="M8 9v5"/></svg>`,
};

function nativeBtn(label, glyph, extra = "") {
  return `<button data-trailing-button type="button" aria-label="${label}"${extra}>${glyph}</button>`;
}

function renderProjects() {
  document.getElementById("projects").innerHTML = PROJECTS.map(
    (name) => `<li class="list-none">
  <div class="group/project-unfurl-row relative">
    <div tabindex="0" role="button" aria-expanded="false">
      <span class="pico">${GLYPH.folder}</span><span class="title">${name}</span>
    </div>
    <div class="text-token-text-tertiary pointer-events-none absolute inset-y-0 end-4 z-10 flex items-center gap-2 opacity-0 project-actions">
      ${nativeBtn("打开项目首页", GLYPH.compose)}
      ${nativeBtn(`打开 ${name} 的项目选项`, GLYPH.dots, ' aria-haspopup="menu"')}
    </div>
  </div>
</li>`
  ).join("");
}

function renderChats() {
  document.getElementById("chats").innerHTML = CHATS.map(
    (c) => `<li class="list-none">
  <a class="group __menu-item" href="/c/${c.id}" aria-label="${c.title}"${c.active ? " data-active" : ""}>
    <span class="title">${c.title}</span>
    <div class="trailing highlight">
      ${nativeBtn(`置顶 ${c.title}`, GLYPH.pin)}
      ${nativeBtn(
        `打开“${c.title}”的对话选项`,
        GLYPH.dots,
        ` data-conversation-options-trigger="${c.id}" aria-haspopup="menu"`
      )}
    </div>
  </a>
</li>`
  ).join("");
}

let churn = 0;
new MutationObserver((records) => {
  churn += records.length;
}).observe(document.documentElement, { childList: true, subtree: true });

renderProjects();
renderChats();

/* --- stale: what an older build leaves behind ---------------------------- */
if (MODE === "stale") {
  const row = document.querySelector('a[href*="/c/6aa79f39"]');
  const stale = document.createElement("button");
  stale.type = "button";
  stale.className = "cgbd-btn cgbd-row-del cgbd-row-del--abs";
  stale.dataset.cgbdKind = "chat";
  stale.dataset.cgbdId = "WEB"; // no code path in content.js can produce this id
  stale.setAttribute("aria-label", "删除");
  row.appendChild(stale);
}

/* --- throw: a single row fails while injecting --------------------------- */
if (MODE === "throw") {
  const anchor = document.querySelectorAll("#chats a.__menu-item")[1].querySelector(
    'button[aria-haspopup="menu"]'
  );
  const original = anchor.insertAdjacentElement.bind(anchor);
  anchor.insertAdjacentElement = function (position, el) {
    if (el.classList.contains("cgbd-row-del")) throw new Error("simulated per-row failure");
    return original(position, el);
  };
}

/* --- noanchor: rows without a native action button ----------------------- */
if (MODE === "noanchor") {
  for (const row of document.querySelectorAll("#chats a.__menu-item")) {
    row.querySelector(".trailing")?.remove();
  }
}

/* --- select: enter and leave select mode --------------------------------- */
let residueAfterSelect = null;
if (MODE === "select") {
  setTimeout(() => document.querySelector(".cgbd-enter")?.click(), 300);
  setTimeout(() => document.querySelector(".cgbd-x")?.click(), 900);
  setTimeout(() => {
    residueAfterSelect = [...document.querySelectorAll("#chats a.__menu-item")].map(
      (a) => a.getAttribute("style") || ""
    );
  }, 1800);
}

/* --- collapsed: hide and re-show the chat section ------------------------ */
let collapse = null;
if (MODE === "collapsed") {
  const history = document.getElementById("history");
  setTimeout(() => {
    history.style.display = "none";
  }, 500);
  setTimeout(() => {
    collapse = { buttonsWhileHidden: document.querySelectorAll("#chats .cgbd-row-del").length };
    history.style.display = "";
  }, 1200);
  setTimeout(() => {
    if (collapse) collapse.afterReExpand = document.querySelectorAll("#chats .cgbd-row-del").length;
  }, 2400);
}

/* --- syncwipe: the app rebuilds the list mid-injection ------------------- */
if (MODE === "syncwipe") {
  let done = false;
  const rebuild = (child) => {
    if (done || !(child instanceof Element) || !child.classList.contains("cgbd-row-del")) return;
    done = true;
    renderChats();
  };
  const appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (child) {
    const out = appendChild.call(this, child);
    rebuild(child);
    return out;
  };
  const insertAdjacentElement = Element.prototype.insertAdjacentElement;
  Element.prototype.insertAdjacentElement = function (position, el) {
    const out = insertAdjacentElement.call(this, position, el);
    rebuild(el);
    return out;
  };
}

/* --- projhover: long name, hover forced from an attribute ---------------- */
if (MODE === "projhover") {
  const row = document.querySelector('[class*="project-unfurl-row"]');
  row.setAttribute("data-force-hover", "");
  const title = row.querySelector('[role="button"] .title');
  if (title) title.textContent = "韩国签证材料清单与行程规划";
}

/* --- report ------------------------------------------------------------- */
function rect(el) {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
}

function effectiveOpacity(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const value = getComputedStyle(node).opacity;
    if (value !== "1") {
      return { opacity: Number(value), from: String(node.className).split(" ")[0] };
    }
  }
  return { opacity: 1, from: null };
}

function inventory() {
  return [...document.querySelectorAll(".cgbd-row-del")].map((btn) => ({
    kind: btn.dataset.cgbdKind || null,
    id: btn.dataset.cgbdId || null,
    abs: btn.classList.contains("cgbd-row-del--abs"),
    ...rect(btn),
    hiddenBy: effectiveOpacity(btn).from,
    opacity: effectiveOpacity(btn).opacity,
  }));
}

function hoverGeometry() {
  const row = document.querySelector('[class*="project-unfurl-row"]');
  const button = row?.querySelector(':scope > [role="button"]');
  const group = row?.querySelector(".cgbd-row-del")?.parentElement;
  if (!row || !button || !group) return null;
  const pad = parseFloat(getComputedStyle(button).paddingRight) || 0;
  const right = button.getBoundingClientRect().right;
  const left = group.getBoundingClientRect().left;
  return {
    reservedOnHover: Math.round(pad),
    projectNameAreaEndsAt: Math.round(right - pad),
    actionGroupStartsAt: Math.round(left),
    overlapPx: Math.round(right - pad - left), // > 0 means an icon covers the name
    reserveVar: getComputedStyle(row).getPropertyValue("--cgbd-row-reserve").trim() || null,
    actionButtons: [...group.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")),
  };
}

setTimeout(() => {
  const report = {
    mode: MODE,
    counts: {
      chatRows: document.querySelectorAll("#chats a.__menu-item").length,
      chatRowsWithTrash: document.querySelectorAll("#chats a .cgbd-row-del").length,
      projectRows: document.querySelectorAll('[class*="project-unfurl-row"]').length,
      projectRowsWithTrash: document.querySelectorAll('[class*="project-unfurl-row"] .cgbd-row-del').length,
      orphanForeignTrash: document.querySelectorAll('#chats .cgbd-row-del[data-cgbd-id="WEB"]').length,
      absTrash: document.querySelectorAll(".cgbd-row-del--abs").length,
      checkboxes: document.querySelectorAll(".cgbd-check").length,
      toolbars: document.querySelectorAll(".cgbd-tools").length,
    },
    inventory: inventory(),
    residueAfterSelect,
    collapse,
    churn,
    hover: MODE === "projhover" ? hoverGeometry() : null,
  };
  const pre = document.createElement("pre");
  pre.id = "report";
  pre.textContent = JSON.stringify(report, null, 2);
  document.body.appendChild(pre);
}, REPORT_AT);
