# Regression test

A static fixture of the chatgpt.com sidebar plus a headless-Chrome runner. It
exists because the injected controls break in ways that are invisible in a code
review: a row that throws takes every later row down with it, a leftover button
from an older build floats against the whole sidebar, an extra icon lands on top
of a project name.

```
node test/run.mjs                     # the current build must pass all checks
node test/run.mjs --baseline          # run the same checks against HEAD
node test/run.mjs --only throw        # one scenario
node test/run.mjs --shots /tmp/shots  # also write a hovered screenshot
node test/run.mjs --keep              # keep the temp work dir for inspection
```

Requirements: Node 22+ (uses the global `WebSocket`) and a local Chrome
(`--chrome <path>` or `CHROME_PATH` if it is not in the usual place). Nothing is
downloaded and nothing connects to chatgpt.com — the fixture is a local file.

`--baseline` is the interesting one: it renders the fixture against
`git show HEAD:content.js` / `HEAD:content.css`, so you can see which checks the
current working tree actually fixes. It always exits 0.

## What is checked

| Scenario | Breaks the fixture with | Must hold |
|---|---|---|
| `normal` | nothing | one control per row, one toolbar, no extras |
| `stale` | leftover absolutely positioned trash with a foreign `data-cgbd-id` (the `WEB` button seen on a real sidebar) | stale buttons are swept, nothing floats |
| `throw` | one row's anchor throws while injecting | only that row is lost; the rows after it and every project still get a control |
| `select` | entering and leaving select mode | no `position` / `padding` / checkbox left on the app's own rows |
| `syncwipe` | the app rebuilds the chat list synchronously mid-injection | the rows come back |
| `noanchor` | chat rows without a native `•••` button | the icon stays in the row, never floats |
| `collapsed` | the chat section is collapsed and re-expanded | hidden rows are not mistaken for stale markup |
| `projhover` | a long project name, real `:hover` forced over the DevTools protocol | the third icon clears the project name, and the padding reserve accounts for it |

Every scenario also asserts a shared set of invariants: no `.cgbd-row-del--abs`,
no stale foreign-id button, exactly one toolbar, no leftover checkboxes, DOM
churn below 200 mutations (catches a render loop), and the number of injected
controls equal to the number of rows (catches a control attached to something
that is not a row, e.g. the section header).

## Files

- `fixture.html` / `fixture.css` / `fixture.js` — the sidebar stand-in. It keeps
  the real class names and containment (including `group/sidebar-expando-section`,
  `#history`, `a.__menu-item`, and the absolutely positioned project action group
  with its 4rem reserve) so `content.js` needs no test-only code path.
- `run.mjs` — copies the fixture plus the build under test into a temp dir, runs
  each scenario, and prints one line per scenario. Exit code 1 on failure.

Hover is forced with `CSS.forcePseudoState`, because headless Chrome has no
pointer: `fixture.css` can also fake the hover state from a `data-force-hover`
attribute, but that is only for screenshots.

## Adding a scenario

Add a mode to `fixture.js`, a matching entry to `SCENARIOS` in `run.mjs`, and the
expectations to `checkReport`. Give the scenario a one-line `why` — the point of
this file is to say which real sidebar behaviour the failure mode mirrors.
