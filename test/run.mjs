#!/usr/bin/env node
/* Regression runner for the ChatGPT sidebar fixture.
 *
 *   node test/run.mjs                     # current content.js/content.css must pass
 *   node test/run.mjs --baseline          # same checks against HEAD, to prove the
 *                                         # harness actually catches the old bug
 *   node test/run.mjs --only throw        # one scenario
 *   node test/run.mjs --shots /tmp/shots  # also save a hovered screenshot
 *   node test/run.mjs --keep              # keep the temporary work directory
 *
 * Needs Node 22+ (global WebSocket) and a local Chrome. Nothing is downloaded
 * and nothing talks to chatgpt.com: the fixture is a static page that mirrors
 * the sidebar markup. */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ASSETS = ["fixture.html", "fixture.css", "fixture.js"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

const CHROME = findChrome(value("chrome"));
const WORK = mkdtempSync(join(tmpdir(), "cgbd-test-"));
const SHOTS = value("shots");
const BASELINE = flag("baseline");
const ONLY = value("only");
const KEEP = flag("keep");

for (const asset of ASSETS) copy(join(HERE, asset), join(WORK, asset));
if (BASELINE) {
  copy(gitShow("HEAD:content.js"), join(WORK, "content.js"));
  copy(gitShow("HEAD:content.css"), join(WORK, "content.css"));
} else {
  copy(value("content") || join(ROOT, "content.js"), join(WORK, "content.js"));
  copy(value("css") || join(ROOT, "content.css"), join(WORK, "content.css"));
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const checks = [];
function check(suite, name, got, want, ok = JSON.stringify(got) === JSON.stringify(want)) {
  checks.push({ suite, name, got, want, ok });
}

/* --- scenarios ----------------------------------------------------------- */

const SCENARIOS = [
  { mode: "normal", why: "baseline: every row gets exactly one control" },
  { mode: "stale", why: "leftovers from an older build are swept, not stacked" },
  { mode: "throw", why: "one broken row must not block the rows after it" },
  { mode: "select", why: "leaving select mode restores the app's own styles" },
  { mode: "syncwipe", why: "a list rebuild mid-injection is repaired" },
  { mode: "noanchor", why: "no native anchor: stay in the row, never float" },
  { mode: "collapsed", why: "a collapsed section is not mistaken for stale markup" },
  { mode: "projhover", why: "the third project icon clears the project name" },
];

const wanted = ONLY ? SCENARIOS.filter((s) => s.mode === ONLY) : SCENARIOS;
if (!wanted.length) die(`unknown scenario: ${ONLY}`);

for (const { mode } of wanted) {
  const report = mode === "projhover" ? null : dumpReport(mode);
  if (report) checkReport(mode, report);
  if (mode === "projhover") {
    const hover = await hoverProbe(mode);
    check("projhover", "project name clears the action group (overlapPx)", hover.overlapPx, "<= -1", hover.overlapPx <= -1);
    check("projhover", "hover reserve includes our icon (px)", hover.reservedOnHover, ">= 100", hover.reservedOnHover >= 100);
    check("projhover", "action group holds our delete button", hover.actionButtons.length, 3);
    check("projhover", "delete button is in that group", hover.actionButtons.some((l) => l === "删除"), true);
  }
}

/* --- shared invariants --------------------------------------------------- */

function checkReport(mode, report) {
  const { counts, inventory } = report;
  const buttons = counts.chatRowsWithTrash + counts.projectRowsWithTrash;

  check(mode, "no leftover .cgbd-row-del--abs", counts.absTrash, 0);
  check(mode, "injected controls == rows (no extras)", inventory.length, buttons);
  check(mode, "exactly one toolbar", counts.toolbars, 1);
  check(mode, "no checkboxes left outside select mode", counts.checkboxes, 0);
  check(mode, "no stale foreign-id button", counts.orphanForeignTrash, 0);
  check(mode, "DOM churn stays bounded", report.churn, "< 200", report.churn < 200);

  if (mode === "normal" || mode === "stale" || mode === "select" || mode === "syncwipe" || mode === "collapsed") {
    check(mode, "chat rows with our trash", counts.chatRowsWithTrash, counts.chatRows);
  }
  if (mode === "normal" || mode === "stale" || mode === "collapsed") {
    check(mode, "project rows with our trash", counts.projectRowsWithTrash, counts.projectRows);
  }
  if (mode === "throw") {
    check(mode, "project rows still injected after a row throws", counts.projectRowsWithTrash, counts.projectRows);
    check(mode, "only the failing row is lost", counts.chatRowsWithTrash, counts.chatRows - 1);
  }
  if (mode === "select") {
    const residue = report.residueAfterSelect || [];
    const dirty = residue.filter((style) => style.trim() !== "");
    check(mode, "no inline style left on rows", dirty, []);
  }
  if (mode === "collapsed") {
    check(mode, "buttons kept while the section is hidden", report.collapse?.buttonsWhileHidden, 5);
    check(mode, "buttons intact after re-expanding", report.collapse?.afterReExpand, 5);
  }
  if (mode === "noanchor") {
    check(mode, "no floating fallback without an anchor", counts.absTrash, 0);
  }
  if (mode === "projhover") {
    check(mode, "fixture-side hover geometry (attribute emulation)", report.hover?.overlapPx, "<= -1", (report.hover?.overlapPx ?? 1) <= -1);
  }
}

/* --- output -------------------------------------------------------------- */

const failed = checks.filter((c) => !c.ok);
const width = Math.max(...checks.map((c) => c.name.length));
for (const { mode, why } of wanted) {
  const suite = checks.filter((c) => c.suite === mode);
  const bad = suite.filter((c) => !c.ok);
  console.log(
    `${bad.length ? "FAIL" : "ok  "}  ${mode.padEnd(10)} ${String(suite.length).padStart(2)} checks  ${why}`
  );
}
if (failed.length) {
  console.log("");
  for (const c of failed) {
    console.log(`  FAIL  ${c.suite}/${c.name.padEnd(width)}\n        got  ${JSON.stringify(c.got)}\n        want ${JSON.stringify(c.want)}`);
  }
}

console.log(
  `\n${checks.length} checks, ${failed.length} failed  (chrome: ${CHROME})` +
    (BASELINE ? "\nbaseline run against HEAD: failures above are the bugs the current build fixes" : "")
);
if (KEEP) console.log(`work dir kept: ${WORK}`);
else rmSync(WORK, { recursive: true, force: true });

if (failed.length && !BASELINE) process.exit(1);

/* --- helpers ------------------------------------------------------------- */

function findChrome(explicit) {
  const candidates = [explicit, process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [name], { encoding: "utf8" });
    if (found.status === 0) candidates.push(found.stdout.trim());
  }
  const hit = candidates.find((c) => c && existsSync(c));
  if (!hit) die("Chrome not found. Pass --chrome <path> or set CHROME_PATH.");
  return hit;
}

function copy(from, to) {
  if (!from || !existsSync(from)) die(`missing file: ${from}`);
  writeFileSync(to, readFileSync(from));
}

function gitShow(spec) {
  const res = spawnSync("git", ["-C", ROOT, "show", spec], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (res.status !== 0) die(`git show ${spec} failed: ${res.stderr.trim()}`);
  const file = join(WORK, spec.replace(/[:/]/g, "_") + ".tmp");
  writeFileSync(file, res.stdout);
  return file;
}

function fixtureUrl(mode) {
  const url = pathToFileURL(join(WORK, "fixture.html"));
  url.searchParams.set("mode", mode);
  return url.href;
}

function dumpReport(mode) {
  const res = spawnSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=340,600",
      "--virtual-time-budget=9000",
      "--dump-dom",
      fixtureUrl(mode),
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  const match = (res.stdout || "").match(/<pre id="report">([\s\S]*?)<\/pre>/);
  if (!match) die(`no report from mode=${mode} (fixture did not settle)`);
  return JSON.parse(unescapeHtml(match[1]));
}

function unescapeHtml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/* Force a real :hover through the DevTools protocol and measure the hovered
   project row. Headless Chrome cannot be hovered any other way. */
async function hoverProbe(mode) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    CHROME,
    ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`, "--window-size=340,470", fixtureUrl(mode)],
    { stdio: "ignore" }
  );
  try {
    const target = await (async () => {
      for (let i = 0; i < 60; i++) {
        try {
          const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
          const page = list.find((t) => t.type === "page");
          if (page) return page.webSocketDebuggerUrl;
        } catch {}
        await sleep(200);
      }
      die("devtools target not found");
    })();

    const ws = new WebSocket(target);
    const waiting = new Map();
    let seq = 0;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && waiting.has(msg.id)) {
        waiting.get(msg.id)(msg);
        waiting.delete(msg.id);
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++seq;
        waiting.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    await new Promise((r) => (ws.onopen = r));
    await send("DOM.enable");
    await send("CSS.enable");
    await send("Runtime.enable");

    const selector = '[class*="project-unfurl-row"]';
    let nodeId = 0;
    for (let i = 0; i < 30 && !nodeId; i++) {
      const doc = await send("DOM.getDocument", { depth: -1 });
      const hit = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector });
      nodeId = hit.result?.nodeId || 0;
      if (!nodeId) await sleep(200);
    }
    if (!nodeId) die("fixture row not found for the hover probe");
    await send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
    await sleep(2600); // let content.js inject while the row is hovered

    const probe = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const row = document.querySelector('${selector}');
        const button = row.querySelector(':scope > [role="button"]');
        const group = row.querySelector('.cgbd-row-del')?.parentElement;
        if (!button || !group) return { error: 'no injected control' };
        const pad = parseFloat(getComputedStyle(button).paddingRight) || 0;
        const right = button.getBoundingClientRect().right;
        const left = group.getBoundingClientRect().left;
        return {
          rowHovered: row.matches(':hover'),
          reservedOnHover: Math.round(pad),
          projectNameAreaEndsAt: Math.round(right - pad),
          actionGroupStartsAt: Math.round(left),
          overlapPx: Math.round(right - pad - left),
          reserveVar: getComputedStyle(row).getPropertyValue('--cgbd-row-reserve').trim() || null,
          actionButtons: [...group.querySelectorAll('button')].map(b => b.getAttribute('aria-label')),
        };
      })()`,
    });
    const result = probe.result.result.value;
    if (result.error) die(`hover probe: ${result.error}`);

    if (SHOTS) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const file = join(SHOTS, BASELINE ? "hover-baseline.png" : "hover.png");
      writeFileSync(file, Buffer.from(shot.result.data, "base64"));
      console.log(`screenshot -> ${file}`);
    }
    return result;
  } finally {
    chrome.kill();
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function die(message) {
  console.error(`run.mjs: ${message}`);
  process.exit(2);
}
