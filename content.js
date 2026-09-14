(() => {
  if (window.__cgbdLoaded) return;
  window.__cgbdLoaded = true;

  const EDIT_RE = /edit|编辑|編輯|編集|수정/i;
  const ID_RE = /\/c\/([a-zA-Z0-9-]+)/;
  const PROJECT_RE = /\/g\/(g-p-[a-zA-Z0-9-]+)|\/projects?\/([a-zA-Z0-9_-]+)|(g-p-[a-zA-Z0-9-]+)/;
  const PROJECT_SECTION_RE = /^(项目|專案|プロジェクト|프로젝트|Projects)$/i;
  const SKIP_PROJECT_ROW_RE = /查看更多|see more|show more|新项目|new project|view all|更多项目/i;

  const ICON = {
    list: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.99979 7V3C6.99979 2.44772 7.4475 2 7.99979 2H20.9998C21.5521 2 21.9998 2.44772 21.9998 3V16C21.9998 16.5523 21.5521 17 20.9998 17H17V20.9925C17 21.5489 16.551 22 15.9925 22H3.00728C2.45086 22 2 21.5511 2 20.9925L2.00276 8.00748C2.00288 7.45107 2.4518 7 3.01025 7H6.99979ZM8.99979 7H15.9927C16.549 7 17 7.44892 17 8.00748V15H19.9998V4H8.99979V7ZM15 9H4.00255L4.00021 20H15V9ZM8.50242 18L4.96689 14.4645L6.3811 13.0503L8.50242 15.1716L12.7451 10.9289L14.1593 12.3431L8.50242 18Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 4V6H15V4H9Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"/></svg>',
    boxOff: '<svg class="cgbd-i-off" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM5 5V19H19V5H5Z"/></svg>',
    boxOn: '<svg class="cgbd-i-on" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.75999 11.7574L11.0026 16Z"/></svg>',
    boxMix: '<svg class="cgbd-i-mix" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM7 11V13H17V11H7Z"/></svg>',
  };
  const TOGGLE = ICON.boxOff + ICON.boxOn + ICON.boxMix;

  function svgMarkup(svg) {
    const clone = svg.cloneNode(true);
    clone.removeAttribute("class");
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.removeAttribute("style");
    if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", "0 0 24 24");
    clone.setAttribute("fill", "currentColor");
    return clone.outerHTML;
  }

  function nativeDeleteIcon() {
    const nodes = document.querySelectorAll(
      '[data-testid="delete-chat-menu-item"] svg, [data-testid="delete-project-menu-item"] svg, [role="menuitem"] svg'
    );
    for (const svg of nodes) {
      const host = svg.closest('[role="menuitem"], button, a');
      const t = `${host?.textContent || ""} ${host?.getAttribute("data-testid") || ""} ${host?.getAttribute("aria-label") || ""}`;
      if (/delete|删除|刪除|削除/i.test(t)) return svgMarkup(svg);
    }
    return null;
  }

  // Adopt ChatGPT's own delete glyph once, the first time a delete menu item is
  // reachable, and keep it. Re-deriving it on every pass made the row icons flip
  // between the native glyph and the bundled one.
  let trashLocked = false;
  function applyTrashIcon() {
    if (trashLocked) return;
    const markup = nativeDeleteIcon();
    if (!markup) return;
    trashLocked = true;
    ICON.trash = markup;
    delBtn.innerHTML = markup;
    for (const btn of document.querySelectorAll(".cgbd-row-del")) {
      btn.innerHTML = markup;
    }
  }

  const state = {
    selecting: false,
    deleting: false,
    selected: new Set(),
    deleted: new Set(),
    lastId: null,
    token: null,
    tokenAt: 0,
  };

  const tools = document.createElement("div");
  tools.className = "cgbd-tools";
  tools.innerHTML =
    `<button type="button" class="cgbd-btn cgbd-enter" aria-label="Select">${ICON.list}</button>` +
    `<button type="button" class="cgbd-btn cgbd-toggle cgbd-on cgbd-all" role="checkbox" aria-checked="false" aria-label="Select all">${TOGGLE}</button>` +
    `<button type="button" class="cgbd-btn cgbd-on cgbd-del" aria-label="Delete" disabled>${ICON.trash}</button>` +
    `<button type="button" class="cgbd-btn cgbd-on cgbd-x" aria-label="Close">${ICON.x}</button>`;

  const enterBtn = tools.querySelector(".cgbd-enter");
  const allBtn = tools.querySelector(".cgbd-all");
  const delBtn = tools.querySelector(".cgbd-del");
  const closeBtn = tools.querySelector(".cgbd-x");

  function zh() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("zh");
  }

  function labelize() {
    const z = zh();
    enterBtn.setAttribute("aria-label", z ? "选择" : "Select");
    allBtn.setAttribute("aria-label", z ? "全选" : "Select all");
    delBtn.setAttribute("aria-label", z ? "删除" : "Delete");
    closeBtn.setAttribute("aria-label", z ? "关闭" : "Close");
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function idFromHref(href) {
    const m = String(href || "").match(ID_RE);
    return m ? m[1] : null;
  }

  function projectIdFromHref(href) {
    const m = String(href || "").match(PROJECT_RE);
    return m ? m[1] || m[2] || m[3] : null;
  }

  function currentId() {
    return idFromHref(location.pathname);
  }

  function sidebarRoot() {
    const navs = document.querySelectorAll("nav");
    for (const nav of navs) {
      if (nav.getBoundingClientRect().width > 80) return nav;
    }
    const aside = document.querySelector("aside");
    if (aside && aside.getBoundingClientRect().width > 80) return aside;
    const history = document.querySelector("[id^='history']");
    if (history) {
      return (
        history.closest("nav") ||
        history.closest("aside") ||
        history.closest("[class*='sidebar']") ||
        history.parentElement
      );
    }
    return document.querySelector("[class*='sidebar']");
  }

  function textOf(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function projectSection() {
    const root = sidebarRoot() || document;
    const sections = [
      ...root.querySelectorAll("div.group\\/sidebar-expando-section"),
      ...root.querySelectorAll("[class*='sidebar-expando-section']"),
    ];
    for (const section of sections) {
      const label = section.querySelector("h2, h3, [class*='menu-label']");
      if (label && PROJECT_SECTION_RE.test(textOf(label))) return section;
    }
    for (const el of root.querySelectorAll("h2, h3, button, span")) {
      if (!PROJECT_SECTION_RE.test(textOf(el))) continue;
      return (
        el.closest("div.group\\/sidebar-expando-section") ||
        el.closest("[class*='expando']") ||
        el.parentElement?.parentElement ||
        el.parentElement
      );
    }
    return null;
  }

  function conversationLinks() {
    const root = sidebarRoot();
    if (!root) return [];
    const out = [];
    const seen = new Set();
    for (const a of root.querySelectorAll('a[href*="/c/"]')) {
      const id = idFromHref(a.href);
      if (!id || seen.has(id)) continue;
      const r = a.getBoundingClientRect();
      if (!state.deleted.has(id) && (r.width < 8 || r.height < 8)) continue;
      seen.add(id);
      out.push(a);
    }
    return out;
  }

  function projectIdFromEl(el) {
    const nodes = [el, ...el.querySelectorAll("a[href], [data-testid], [data-project-id]")];
    for (const node of nodes) {
      const href = node.getAttribute?.("href") || node.href || "";
      const id = projectIdFromHref(href);
      if (id && !idFromHref(href)) return id;
      const testid = node.getAttribute?.("data-testid") || "";
      const m = testid.match(/g-p-[a-zA-Z0-9-]+/);
      if (m) return m[0];
      const pid = node.getAttribute?.("data-project-id");
      if (pid) return pid;
    }
    return null;
  }

  function projectRows() {
    const section = projectSection();
    const scopes = section ? [section] : [sidebarRoot()].filter(Boolean);
    const out = [];
    const seen = new Set();
    for (const scope of scopes) {
      const items = section
        ? scope.querySelectorAll("a[href], [data-testid*='project']")
        : scope.querySelectorAll('a[href*="/g/g-p-"], a[href*="/project/"], a[href*="g-p-"]');
      for (const el of items) {
        if (el.closest(".cgbd-tools") || el.classList.contains("cgbd-btn")) continue;
        const t = textOf(el);
        if (!t || PROJECT_SECTION_RE.test(t) || SKIP_PROJECT_ROW_RE.test(t)) continue;
        if (idFromHref(el.getAttribute?.("href") || el.href || "")) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 18 || r.width < 40) continue;
        const id = projectIdFromEl(el) || "name:" + t.slice(0, 80);
        if (seen.has(id) || state.deleted.has(id)) continue;
        seen.add(id);
        out.push({ el, id });
      }
      if (section && out.length) break;
    }
    if (!out.length && scopes[0]) {
      for (const btn of scopes[0].querySelectorAll("button")) {
        if (btn.classList.contains("cgbd-btn")) continue;
        const label = `${btn.getAttribute("aria-label") || ""} ${btn.dataset.testid || ""}`;
        const isAction =
          btn.getAttribute("aria-haspopup") === "menu" ||
          /options|more|更多|edit|编辑|rename|menu/i.test(label);
        if (!isAction && btn !== btn.parentElement?.querySelector("button:last-of-type")) continue;
        const row =
          btn.closest("a[href], li, [class*='group/']") ||
          btn.parentElement?.parentElement;
        if (!row || row === scopes[0]) continue;
        // The section header itself answers `[class*='group/']`; it is not a row.
        if (row.closest("[class*='sidebar-expando-section-header']")) continue;
        const t = textOf(row);
        if (!t || PROJECT_SECTION_RE.test(t) || SKIP_PROJECT_ROW_RE.test(t)) continue;
        const id = projectIdFromEl(row) || "name:" + t.slice(0, 80);
        if (seen.has(id) || state.deleted.has(id)) continue;
        seen.add(id);
        out.push({ el: row, id });
      }
    }
    return out;
  }

  function visibleIds(links) {
    return (links || conversationLinks())
      .map((a) => idFromHref(a.href))
      .filter((id) => id && !state.deleted.has(id));
  }

  function rowOwner(link) {
    let el = link;
    for (let i = 0; i < 5 && el && el !== document.body; i++) {
      const links = el.querySelectorAll('a[href*="/c/"]');
      const menu = el.querySelector(
        'button[aria-haspopup="menu"], button[data-testid="conversation-options-button"], button[data-conversation-options-trigger]'
      );
      if (menu && links.length <= 1) return el;
      el = el.parentElement;
    }
    return link;
  }

  function projectOwner(el) {
    let node = el;
    for (let i = 0; i < 6 && node && node !== document.body; i++) {
      const nested = node.closest?.("[data-cgbd-id]");
      if (nested && nested !== node && nested.contains(el) === false) {
        node = node.parentElement;
        continue;
      }
      const btns = [...node.querySelectorAll("button")].filter((b) => {
        if (b.classList.contains("cgbd-btn")) return false;
        const inner = b.closest("[data-cgbd-id]");
        return !inner || inner === node;
      });
      if (btns.length) return node;
      node = node.parentElement;
    }
    return el;
  }

  function findRowActionAnchor(owner) {
    const buttons = [...owner.querySelectorAll("button")].filter((b) => {
      if (b.classList.contains("cgbd-btn")) return false;
      const nested = b.closest("[data-cgbd-id]");
      if (nested && nested !== owner) return false;
      return true;
    });
    const more = buttons.find((b) => {
      const label = `${b.getAttribute("aria-label") || ""} ${b.dataset.testid || ""}`;
      return (
        b.getAttribute("aria-haspopup") === "menu" ||
        /options|more|更多|menu/i.test(label)
      );
    });
    return more || buttons[buttons.length - 1] || null;
  }

  function matchSizeOne(from, btn) {
    const r = from.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w >= 16 && w <= 28) btn.style.width = w + "px";
    if (h >= 16 && h <= 28) btn.style.height = h + "px";
    const icon = from.querySelector("svg");
    if (!icon) return;
    const s = Math.round(
      Math.max(icon.getBoundingClientRect().width, icon.getBoundingClientRect().height)
    );
    if (s < 12 || s > 22) return;
    const svg = btn.querySelector("svg");
    if (svg) {
      svg.style.width = s + "px";
      svg.style.height = s + "px";
    }
  }

  function makeRowDelete(kind, id) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cgbd-btn cgbd-row-del";
    btn.dataset.cgbdKind = kind;
    btn.dataset.cgbdId = id;
    btn.setAttribute("aria-label", zh() ? "删除" : "Delete");
    btn.innerHTML = ICON.trash;
    return btn;
  }

  function inlineHost(owner) {
    if (owner.matches('a, [role="button"]')) return owner;
    return owner.querySelector(':scope > [role="button"], :scope > a');
  }

  function placeRowDelete(owner, kind, id) {
    const anchor = findRowActionAnchor(owner);
    const all = [...owner.querySelectorAll(".cgbd-row-del")];
    const keep = all.find((b) => b.dataset.cgbdId === id);
    // A row must never carry two trash buttons. Only the button whose id matched
    // was removed before, so a leftover from another build or an earlier id
    // stayed on the row forever.
    for (const b of all) {
      if (b !== keep) b.remove();
    }

    const btn = keep && keep.isConnected ? keep : makeRowDelete(kind, id);
    btn.classList.remove("cgbd-row-del--abs");
    btn.dataset.cgbdKind = kind;

    if (anchor) {
      if (
        btn.parentElement !== anchor.parentElement ||
        btn.previousElementSibling !== anchor
      ) {
        anchor.insertAdjacentElement("afterend", btn);
      }
      matchSizeOne(anchor, btn);
      return;
    }

    // No native action button to sit next to: keep the icon inside the row flow
    // instead of floating it against the whole sidebar, and skip the row when
    // there is nowhere sane to put it.
    const host = inlineHost(owner);
    if (!host) {
      btn.remove();
      return;
    }
    if (btn.parentElement !== host) host.appendChild(btn);
    btn.style.removeProperty("width");
    btn.style.removeProperty("height");
  }

  function isEditButton(btn) {
    if (btn.closest('a[href*="/c/"]')) return false;
    const text = `${btn.getAttribute("aria-label") || ""} ${btn.textContent || ""}`.trim();
    return EDIT_RE.test(text);
  }

  function findHeader(history) {
    const prev = history.previousElementSibling;
    if (prev && prev.querySelector("button, h2, h3, h4")) return prev;
    const parent = history.parentElement;
    if (!parent) return null;
    for (const child of parent.children) {
      if (child === history) break;
      if (child.querySelector("button")) return child;
    }
    return null;
  }

  function findInsertPoint() {
    const history = document.querySelector("[id^='history']");
    const root = sidebarRoot();
    if (history) {
      const header = findHeader(history);
      if (header) {
        const native = [...header.querySelectorAll("button")].filter(
          (b) => !b.classList.contains("cgbd-btn")
        );
        if (native.length) return { after: native[native.length - 1] };
        return { append: header };
      }
    }
    if (root) {
      const edit = [...root.querySelectorAll("button")].find(isEditButton);
      if (edit) return { after: edit };
    }
    if (history) return { overlay: history.parentElement || history };
    if (root) return { overlay: root };
    return null;
  }

  function matchSize(from) {
    const r = from.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w < 16 || w > 28 || h < 16 || h > 28) return;
    for (const btn of tools.querySelectorAll(".cgbd-btn")) {
      btn.style.width = w + "px";
      btn.style.height = h + "px";
    }
    const icon = from.querySelector("svg");
    if (!icon) return;
    const s = Math.round(Math.max(icon.getBoundingClientRect().width, icon.getBoundingClientRect().height));
    if (s < 12 || s > 22) return;
    for (const svg of tools.querySelectorAll("svg")) {
      svg.style.width = s + "px";
      svg.style.height = s + "px";
    }
  }

  function placeTools() {
    if (tools.isConnected && sidebarRoot()?.contains(tools)) return;
    const point = findInsertPoint();
    if (!point) return;
    tools.classList.remove("cgbd-tools--overlay");
    if (point.after) {
      point.after.insertAdjacentElement("afterend", tools);
      matchSize(point.after);
    } else if (point.append) {
      point.append.appendChild(tools);
    } else if (point.overlay) {
      const host = point.overlay;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      tools.classList.add("cgbd-tools--overlay");
      host.appendChild(tools);
    }
    labelize();
  }

  function checkboxMarkup() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cgbd-check cgbd-toggle";
    btn.setAttribute("role", "checkbox");
    btn.setAttribute("aria-checked", "false");
    btn.innerHTML = TOGGLE;
    return btn;
  }

  // Undo everything we wrote onto one of ChatGPT's own elements. `cgbdPos` was
  // saved but never used to restore, so leaving select mode left
  // `position: relative` on every row for the rest of the page's life.
  function restoreRow(owner) {
    owner.querySelector(":scope > .cgbd-check")?.remove();
    if (owner.dataset.cgbdPad != null) {
      owner.style.paddingLeft = owner.dataset.cgbdPad;
      delete owner.dataset.cgbdPad;
    }
    if (owner.dataset.cgbdPos != null) {
      owner.style.position = owner.dataset.cgbdPos;
      delete owner.dataset.cgbdPos;
    }
    if (owner.style.getPropertyValue("--cgbd-row-reserve")) {
      owner.style.removeProperty("--cgbd-row-reserve");
    }
  }

  function ensureRow(link) {
    const id = idFromHref(link.href);
    if (!id) return;
    const owner = rowOwner(link);
    if (state.deleted.has(id)) {
      owner.style.display = "none";
      return;
    }
    owner.dataset.cgbdId = id;
    owner.dataset.cgbdKind = "chat";
    if (!state.selecting) {
      restoreRow(owner);
    } else {
      if (getComputedStyle(owner).position === "static") {
        if (owner.dataset.cgbdPos == null) owner.dataset.cgbdPos = owner.style.position;
        owner.style.position = "relative";
      }
      if (owner.dataset.cgbdPad == null) {
        owner.dataset.cgbdPad = owner.style.paddingLeft || "";
        const cur = parseFloat(getComputedStyle(owner).paddingLeft) || 0;
        owner.style.paddingLeft = Math.max(cur, 28) + "px";
      }
      if (!owner.querySelector(":scope > .cgbd-check")) {
        owner.appendChild(checkboxMarkup());
      }
    }
    placeRowDelete(owner, "chat", id);
  }

  function ensureProject(row) {
    const { el, id } = row;
    if (!id) return;
    const owner = projectOwner(el);
    if (state.deleted.has(id)) {
      owner.style.display = "none";
      return;
    }
    owner.dataset.cgbdId = id;
    owner.dataset.cgbdKind = "project";
    placeRowDelete(owner, "project", id);
    reserveProjectActions(owner);
  }

  // ChatGPT reserves room on a project row for the two actions it renders
  // itself. Measure that action group with our button in it and hand the width
  // to CSS, so the third icon never lands on top of the project name.
  function reserveProjectActions(owner) {
    const btn = owner.querySelector(".cgbd-row-del");
    const group = btn?.parentElement;
    if (!btn || !group || group === owner) return;
    const w = Math.round(group.getBoundingClientRect().width);
    if (w < 16 || w > 400) return;
    owner.style.setProperty("--cgbd-row-reserve", w + 24 + "px"); // + end-4 + slack
  }

  function setChecked(el, on) {
    el.setAttribute("aria-checked", on ? "true" : "false");
  }

  function paint(links) {
    tools.classList.toggle("is-on", state.selecting);
    tools.classList.toggle("is-busy", state.deleting);
    const all = links || conversationLinks();
    const ids = visibleIds(all);
    const n = ids.filter((id) => state.selected.has(id)).length;
    delBtn.disabled = state.deleting || n === 0;
    const allOn = ids.length > 0 && n === ids.length;
    const mixed = n > 0 && !allOn;
    allBtn.setAttribute("aria-checked", mixed ? "mixed" : allOn ? "true" : "false");
    for (const link of all) {
      const id = idFromHref(link.href);
      const owner = rowOwner(link);
      const box = owner.querySelector(":scope > .cgbd-check");
      if (box) setChecked(box, state.selected.has(id));
    }
  }

  let syncing = false;
  let pending = false;
  let timer = 0;
  let reruns = 0;
  const warned = new Map();

  function warn(what, err) {
    const key = what + ":" + (err && err.message);
    const now = Date.now();
    if (now - (warned.get(key) || 0) < 30000) return;
    warned.set(key, now);
    console.warn("[cgbd]", what, err);
  }

  // One broken row must never abort the pass or block the rows after it.
  function safe(what, fn) {
    try {
      fn();
    } catch (err) {
      warn(what, err);
    }
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      sync();
    }, delay);
  }

  function laidOut(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 8 && r.height >= 8;
  }

  function currentIds(projects) {
    const ids = new Set();
    const root = sidebarRoot();
    if (root) {
      for (const a of root.querySelectorAll('a[href*="/c/"]')) {
        const id = idFromHref(a.href);
        if (id) ids.add(id);
      }
    }
    for (const row of projects || projectRows()) if (row.id) ids.add(row.id);
    return ids;
  }

  // Drop anything an older build, a renamed project or a re-render left behind,
  // instead of stacking a second icon on the same row. Rows that are not
  // rendered right now are left alone: they cannot be judged, and they get
  // swept on a later pass.
  function sweep(ids) {
    for (const el of document.querySelectorAll(".cgbd-tools")) {
      if (el !== tools) el.remove();
    }

    for (const btn of document.querySelectorAll(".cgbd-btn")) {
      if (tools.contains(btn)) continue;
      const isRowDel = btn.classList.contains("cgbd-row-del");
      const isCheck = btn.classList.contains("cgbd-check");
      if (!isRowDel && !isCheck) {
        btn.remove();
        continue;
      }
      const owner = btn.closest("[data-cgbd-id]");
      const id = isRowDel ? btn.dataset.cgbdId : owner?.dataset.cgbdId;
      if (isCheck && !state.selecting) {
        if (laidOut(btn)) btn.remove();
        continue;
      }
      if (id && ids.has(id)) continue;
      if (!laidOut(btn)) continue;
      btn.remove();
    }

    if (!state.selecting) {
      for (const el of document.querySelectorAll("[data-cgbd-pad], [data-cgbd-pos]")) {
        if (laidOut(el)) restoreRow(el);
      }
    }
  }

  function sync() {
    if (syncing) {
      pending = true;
      return;
    }
    syncing = true;
    try {
      placeTools();
      applyTrashIcon();
      const links = conversationLinks();
      for (const link of links) safe("chat row", () => ensureRow(link));
      const projects = projectRows();
      for (const row of projects) safe("project row", () => ensureProject(row));
      safe("sweep", () => sweep(currentIds(projects)));
      safe("paint", () => paint(links));
    } catch (err) {
      warn("sync", err);
    } finally {
      syncing = false;
      if (pending) {
        pending = false;
        reruns++;
        schedule(reruns > 3 ? 400 : 0);
      } else {
        reruns = 0;
      }
    }
  }

  function toggle(id, shift) {
    const ids = visibleIds();
    if (shift && state.lastId && ids.includes(state.lastId) && ids.includes(id)) {
      const a = ids.indexOf(state.lastId);
      const b = ids.indexOf(id);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const on = !state.selected.has(id);
      for (let i = lo; i <= hi; i++) {
        if (on) state.selected.add(ids[i]);
        else state.selected.delete(ids[i]);
      }
    } else if (state.selected.has(id)) {
      state.selected.delete(id);
    } else {
      state.selected.add(id);
    }
    state.lastId = id;
    paint();
  }

  function exitSelect() {
    state.selecting = false;
    state.selected.clear();
    state.lastId = null;
    sync();
  }

  function enterSelect() {
    state.selecting = true;
    labelize();
    sync();
  }

  async function getToken(force) {
    if (!force && state.token && Date.now() - state.tokenAt < 5 * 60 * 1000) {
      return state.token;
    }
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) throw new Error("session");
    const data = await res.json();
    if (!data?.accessToken) throw new Error("token");
    state.token = data.accessToken;
    state.tokenAt = Date.now();
    return state.token;
  }

  function accountId(token) {
    try {
      let b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const payload = JSON.parse(atob(b64));
      return (
        payload["https://api.openai.com/auth"]?.chatgpt_account_id ||
        payload.chatgpt_account_id ||
        ""
      );
    } catch {
      return "";
    }
  }

  function apiHeaders(token) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    };
    const acc = accountId(token);
    if (acc) headers["ChatGPT-Account-Id"] = acc;
    const lang = document.documentElement.lang;
    if (lang) headers["OAI-Language"] = lang;
    return headers;
  }

  async function chatgptFetch(url, { method, body } = {}) {
    let token = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (token) Object.assign(headers, apiHeaders(token));
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return true;
      if (res.status === 401 && attempt === 0) {
        try {
          token = await getToken(true);
        } catch {
          token = null;
        }
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      if (res.status === 404 || res.status === 405) return false;
      return false;
    }
    return false;
  }

  async function deleteOne(id) {
    return chatgptFetch("/backend-api/conversation/" + encodeURIComponent(id), {
      method: "PATCH",
      body: { is_visible: false },
    });
  }

  async function clickNativeDelete(owner) {
    if (!owner) return false;
    const more = findRowActionAnchor(owner);
    if (!more) return false;
    more.click();
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        return /删除项目|Delete project|删除对话|Delete chat|^删除$|^Delete$|^刪除$/i.test(t);
      });
      if (item) {
        item.click();
        const d2 = Date.now() + 2000;
        while (Date.now() < d2) {
          const confirm =
            document.querySelector(
              '[data-testid="delete-conversation-confirm-button"], [data-testid="confirm-delete-button"]'
            ) ||
            [...document.querySelectorAll("button")].find((b) => {
              if (b.closest('[role="menuitem"]')) return false;
              return /^(删除项目|Delete project|删除|刪除|Delete)$/i.test(
                (b.textContent || "").trim()
              );
            });
          if (confirm) {
            confirm.click();
            return true;
          }
          await sleep(40);
        }
        return true;
      }
      await sleep(40);
    }
    return false;
  }

  async function deleteProject(id, owner) {
    if (id && !id.startsWith("name:")) {
      const enc = encodeURIComponent(id);
      const tries = [
        { method: "DELETE", url: "/backend-api/gizmos/" + enc },
        { method: "DELETE", url: "/backend-api/projects/" + enc },
        { method: "POST", url: "/backend-api/gizmos/" + enc + "/delete" },
        { method: "PATCH", url: "/backend-api/gizmos/" + enc, body: { is_visible: false } },
      ];
      for (const t of tries) {
        if (await chatgptFetch(t.url, t)) return true;
      }
    }
    return clickNativeDelete(owner);
  }

  async function deleteRow(kind, id) {
    if (!id || state.deleted.has(id)) return;
    const btn = document.querySelector(`.cgbd-row-del[data-cgbd-id="${CSS.escape(id)}"]`);
    const owner =
      btn?.closest("[data-cgbd-id]") ||
      document.querySelector(`[data-cgbd-id="${CSS.escape(id)}"]`);
    if (btn) btn.classList.add("is-busy");
    let ok = false;
    try {
      ok = kind === "project" ? await deleteProject(id, owner) : await deleteOne(id);
    } finally {
      btn?.classList.remove("is-busy");
    }
    if (!ok) {
      warn("delete " + kind + " " + id, new Error("request failed"));
      return;
    }
    state.deleted.add(id);
    state.selected.delete(id);
    for (const el of document.querySelectorAll(`[data-cgbd-id="${CSS.escape(id)}"]`)) {
      if (el.classList.contains("cgbd-row-del")) continue;
      el.style.display = "none";
    }
    const path = location.pathname;
    if (kind === "chat" && currentId() === id) location.assign("/");
    else if (kind === "project" && path.includes(id)) location.assign("/");
    else paint();
  }

  async function mapPool(items, limit, fn) {
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx]);
      }
    });
    await Promise.all(workers);
  }

  async function deleteSelected() {
    if (state.deleting) return;
    const ids = visibleIds().filter((id) => state.selected.has(id));
    if (!ids.length) return;
    state.deleting = true;
    paint();
    const failed = [];
    const opened = currentId();
    try {
      await mapPool(ids, 5, async (id) => {
        try {
          const ok = await deleteOne(id);
          if (ok) {
            state.deleted.add(id);
            state.selected.delete(id);
          } else {
            failed.push(id);
          }
        } catch {
          failed.push(id);
        }
      });
    } finally {
      state.deleting = false;
    }
    if (opened && state.deleted.has(opened)) {
      location.assign("/");
      return;
    }
    if (!failed.length) exitSelect();
    else sync();
  }

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  enterBtn.addEventListener("click", (e) => {
    stop(e);
    enterSelect();
  });

  closeBtn.addEventListener("click", (e) => {
    stop(e);
    exitSelect();
  });

  delBtn.addEventListener("click", (e) => {
    stop(e);
    deleteSelected();
  });

  allBtn.addEventListener("click", (e) => {
    stop(e);
    const ids = visibleIds();
    const allOn = ids.length > 0 && ids.every((id) => state.selected.has(id));
    if (allOn) ids.forEach((id) => state.selected.delete(id));
    else ids.forEach((id) => state.selected.add(id));
    state.lastId = ids[ids.length - 1] || null;
    paint();
  });

  document.addEventListener(
    "click",
    (e) => {
      const rowDel = e.target.closest(".cgbd-row-del");
      if (rowDel) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        deleteRow(rowDel.dataset.cgbdKind, rowDel.dataset.cgbdId);
        return;
      }
      if (!state.selecting || state.deleting) return;
      if (e.target.closest(".cgbd-tools")) return;
      const owner = e.target.closest("[data-cgbd-id]");
      if (!owner) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggle(owner.dataset.cgbdId, e.shiftKey);
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.selecting && !state.deleting) exitSelect();
  });

  const obs = new MutationObserver(() => {
    // Never drop a batch. The old mutex version returned early for every change
    // that arrived while a pass was running, and nothing ever retried it.
    if (syncing) {
      pending = true;
      return;
    }
    schedule(60);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  sync();
  // Unconditional repair tick. The old version only re-synced when the toolbar
  // itself was gone, so rows ChatGPT re-rendered stayed bare indefinitely.
  setInterval(() => {
    if (document.hidden) return;
    sync();
  }, 1500);
})();
