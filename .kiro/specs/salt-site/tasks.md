# Implementation Plan: salt-site

## Overview

Build the SvelteKit static site in `site/` on a new branch `feat/salt-site`, bottom up: scaffold, pure TypeScript modules with their example tests, the SVG chart, build-time data loads, then the three pages. Each top-level task ends with `bun run check` (plus `bun run build` once routes read data) and one commit. Task 8 runs the design's build checks and negative builds, then hands the manual browser checklist to the user.

## Tasks

- [x] 1. Scaffold the site on a new branch
  - [x] 1.1 Create the branch and scaffold `site/`
    - Confirm the current branch is `feat/salt-data-pipeline`, then `git switch -c feat/salt-site`
    - From the repo root, run the design's `bunx sv@1.1.1 create --template minimal --types ts --add ... --install bun --no-dir-check site` command; confirm `git status --porcelain site/static/data` prints nothing
    - Delete `src/lib/vitest-examples/`; replace `src/lib/assets/favicon.svg` with a plain favicon
    - Rewrite every caret range in `package.json` to the exact version bun resolved, then `bun install`; set the `test` script to `vitest run`
    - In `vite.config.ts`, pass `adapter({ fallback: '404.html' })`; keep the scaffold's `compilerOptions.runes`, its vitest project, `tsconfig.json` (`strict: true`), and `lang="en"` in `src/app.html`
    - _Requirements: 1.1, 1.7, 1.9, 2.10, 7.5_
  - [x] 1.2 Add the theme, layout, and error page
    - `src/routes/layout.css`: Tailwind import, `--color-dim: #a3a3a3`, `html` with `#000` background, `#fff` text, `color-scheme: dark`, and the white `:focus-visible` outline from the design's Visual rules
    - `src/routes/+layout.ts`: `export const prerender = true`
    - `src/routes/+layout.svelte`: import `layout.css`; Header with `Winter Water Watch` and `Accuracy` links through `resolve()`; `<main>` in a `max-w-5xl px-3` column rendering `children`; Footer with the design's public-systems and MassDEP text
    - `src/routes/+error.svelte`: `Town not found` for a 404 under `/town/`, `Page not found` for other 404s, `Error <status>` otherwise, each with a link to `/`
    - Run `bun run check` (0 errors, 0 warnings) and `bun run build` (exit 0)
    - Commit `chore(site): scaffold sveltekit static site`, staging by name each file `git status --porcelain -uall site` lists; stage nothing under `.kiro/`
    - _Requirements: 1.5, 2.1, 2.2, 2.4, 2.6, 2.7, 2.9, 2.12, 7.5_

- [x] 2. Add data types and pure logic modules
  - [x] 2.1 Write `types.ts`, `format.ts`, and `format.test.ts`
    - `src/lib/types.ts`: the design's Data Models types, unchanged
    - `src/lib/format.ts`: `MISSING`, `titleCase`, `tenths`, `fixed1`, `mgl`, `pct`, `count`, `percentOf`, and `trendLabel` (`insufficient` to `not enough data`), building `fixed1` from `tenths` as the design describes, with no `toFixed`
    - `src/lib/format.test.ts`: the design's format examples; run `bun run test src/lib/format.test.ts`
    - _Requirements: 1.6, 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 8.5_
  - [x] 2.2 Write `search.ts`, `massdot.ts`, and their tests
    - `src/lib/search.ts`: `MAX_OPTIONS`, `matchTowns`, and `nextIndex` per the design
    - `src/lib/massdot.ts`: `Diet`, `DIETS`, `parseAmount`, `Trigger`, `Result`, `evaluate`, and `resultText` per the design, with the exact result strings
    - `src/lib/search.test.ts` and `src/lib/massdot.test.ts`: the design's examples; run each with `bun run test <file>`
    - _Requirements: 6.2, 6.4, 6.5, 6.6, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13, 12.15_
  - [x] 2.3 Write `stats.ts` and `accuracy.ts`
    - `src/lib/stats.ts`: `Statewide` and `statewide(files)`, counting Wells, Trended_Wells, and `pctRising` through `percentOf`
    - `src/lib/accuracy.ts`: `caughtShare` and `meaning` per the design, comparing the MAEs with `tenths` and returning null when neither part applies
    - Run `bun run check` and `bun run test`
    - Commit `feat(site): add data types and pure logic modules`, staging the nine `src/lib` files from 2.1 to 2.3 by name
    - _Requirements: 5.1, 5.5, 13.4, 13.7, 13.8, 13.9, 13.10_

- [x] 3. Build the SVG chart
  - [x] 3.1 Write `chart.ts` and `chart.test.ts`
    - `src/lib/chart.ts`: `GUIDELINE`, `Chemical`, the geometry types, `dayMs`, `linear` (centers when `d0 === d1`), `niceTop`, `yearTicks`, `plot`, `chartLabel`, and `STROKE` per the design
    - `plot` sorts each series by date, drops empty series, returns null when none is left, sets `d` to null for a one-sample series, and spans y from 0 to at least `max(20, largest value)`
    - `chartLabel` formats values with `fixed1` and dates as `YYYY-MM-DD`
    - `src/lib/chart.test.ts`: the design's chart examples; run `bun run test src/lib/chart.test.ts`
    - _Requirements: 2.3, 4.1, 4.3, 9.5, 9.6, 10.2, 10.3, 10.5, 10.6, 10.8, 10.9_
  - [x] 3.2 Write `Chart.svelte`
    - Props `{ series: PlotSeries[]; variant: 'home' | 'detail' | 'spark' }`, with the sizes, margins, axes, markers, and `bind:clientWidth` width (default 640) from the design's variant table
    - Guideline_Line across the plot area with the `20 mg/L` label in the right margin (home and detail; line only in spark), one `<path>` per series styled from `STROKE`, `r="2.5"` point markers, `#a3a3a3` tick text, and `role="img"` with `aria-label={chartLabel(series)}`
    - Null plot: spark shows `no sodium data`; detail renders nothing
    - Draw-in only on the home sodium path: `pathLength="1"`, `class="draw"`, and the design's `prefers-reduced-motion: no-preference` CSS; no other animation or transition
    - Run `bun run check`
    - Commit `feat(site): add inline svg chart`, staging `chart.ts`, `chart.test.ts`, and `Chart.svelte` by name
    - _Requirements: 2.2, 2.3, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 9.5, 9.6, 10.1, 10.2, 10.4, 10.5, 10.6, 10.7, 10.9_

- [x] 4. Read the data files at build time
  - [x] 4.1 Write `src/lib/server/data.ts`
    - `FEATURE_ID`, `readJson` (errors name the path: `cannot read (...)` or `not valid JSON`), `readTowns`, `readTownFile`, `readBacktest`, `parseBacktest` (a type guard over the six fields that throws `backtest.json: missing or non-numeric field <name>`), and `featureWell`
    - Paths are relative to `process.cwd()` (`static/data/...`); one `as` assertion per reader and no other casts
    - _Requirements: 1.3, 1.4, 4.6, 5.7, 7.6, 13.11_
  - [x] 4.2 Write the three route loads
    - `src/routes/+page.server.ts`: the design's four-step home load (Feature_Well first with the `Feature well <FEATURE_ID>: ` rethrow, every Town_File, `statewide` with the well-count check, then the `{ towns, statewide, feature }` return)
    - `src/routes/town/[slug]/+page.server.ts`: async `entries()` over every Town_List slug, and the load that throws `error(404, 'Town not found')` for an unknown slug
    - `src/routes/accuracy/+page.server.ts`: return `{ backtest: await readBacktest() }`
    - Add a minimal `src/routes/town/[slug]/+page.svelte` (`<title>` as `<Display_Name> | Winter Water Watch` and the Display_Name `h1`) and a minimal `src/routes/accuracy/+page.svelte` (`h1` `Accuracy`) so every route prerenders; tasks 6.3 and 7.1 complete them
    - Run `bun run check` and `bun run build`; confirm `ls build/town/*.html | wc -l` prints 328
    - Commit `feat(site): load data files at build time`, staging `data.ts` and the five route files by name
    - _Requirements: 1.2, 1.3, 1.4, 4.6, 5.2, 5.4, 5.6, 5.7, 7.1, 7.2, 7.5, 7.6, 13.1_

- [x] 5. Build the home page
  - [x] 5.1 Write `TownSearch.svelte`
    - Props `{ towns: { name: string; slug: string }[] }`; the design's runes state: `text`, `active`, `dismissed`, and derived `matches`, `open`, `noMatch`
    - Markup: visible label `Find your town`; combobox input with `aria-expanded`, `aria-controls`, and `aria-activedescendant` only while an option is active; listbox kept in the DOM with `hidden={!open}`; options show `titleCase(name)`, with `aria-selected="true"` and an inverted highlight only on the active one; a `role="status"` paragraph holding `No matching town` only while `noMatch`
    - Events per the design: typing resets `dismissed` and `active`; ArrowDown and ArrowUp step with `nextIndex`; Enter goes to the active option or the first match, and does nothing with no match; Escape and blur dismiss; option `pointerdown` calls `preventDefault` and `click` navigates; navigation uses `goto(resolve('/town/[slug]', { slug }))`
    - _Requirements: 3.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14_
  - [x] 5.2 Write the Home_Page
    - Replace `src/routes/+page.svelte`: `h1` `Is your water getting saltier?`; a section with `h2` `Sodium at {name}, {system}` and `<Chart variant="home" series={[{ chemical: 'sodium', samples }]} />`; the Statewide_Line `{count(wells)} wells tracked. {pct(pctRising)} of the {count(trended)} with a sodium trend are rising.`; `<TownSearch towns={data.towns} />`
    - Run `bun run check` and `bun run build`; confirm `rg -c '5,672 wells tracked' build/index.html` prints 1
    - Commit `feat(site): add home page and town search`, staging `TownSearch.svelte` and `src/routes/+page.svelte` by name
    - _Requirements: 2.13, 3.4, 4.1, 4.2, 4.3, 5.1, 5.3, 5.5, 5.6_

- [x] 6. Build the town page
  - [x] 6.1 Write `WellRow.svelte`
    - Props `{ well: Well; index: number }` and `let open = $state(false)`; two sibling `<tr>`s as in the design, with the only click handler on the first `<tr>` and the design's `svelte-ignore` comment
    - First row: an Expand_Button wrapping the Material Symbols `chevron_right` SVG (`aria-hidden="true"`, `rotate-90` while open, no transition) and `well.name`, with `aria-expanded` and `aria-controls="well-{index}-chart"`; then `system`, `class`, `mgl(sodium.latest)`, `trendLabel(sodium.trend)`, `watch` or empty, and the spark Chart
    - Detail row: `id="well-{index}-chart"`, `hidden={!open}`, one `colspan="7"` cell; while open, the detail Chart of sodium and chloride and one legend line per chemical (a stroke sample from `STROKE`, then `latest` in mg/L and the Trend_Label, or `no sodium data` / `no chloride data`)
    - _Requirements: 2.5, 3.4, 8.1, 8.2, 8.3, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 10.7_
  - [x] 6.2 Write `Checker.svelte`
    - Labeled sodium and chloride inputs (`type="number" step="any" min="0" inputmode="decimal"`, empty on load) and a labeled diet select from `DIETS`, defaulting to `none`
    - Each `oninput` stores `parseAmount(value, validity.badInput)`; `result` is `$derived` from `evaluate` with `'invalid'` treated as null; `resultText(result)` goes in a `role="status"` paragraph; no form submit and no network call
    - An invalid input gets `aria-invalid="true"`, `aria-describedby="<id>-error"`, and `Enter a number 0 or greater`; a valid or empty input gets none of the three
    - _Requirements: 12.1, 12.2, 12.3, 12.8, 12.9, 12.10, 12.11, 12.14, 12.15, 12.16_
  - [x] 6.3 Complete the Town_Page
    - Fill `src/routes/town/[slug]/+page.svelte` in the design's order: title and `h1`; the summary `dl` for `Wells`, `Rising`, and `Over 20 mg/L` with their labels; a section with `h2` `Wells` and the Well_Table in an `overflow-x-auto` div (seven headers, one `WellRow` per Well keyed by `id`); the legend `dl` for the classes, `watch`, and the guideline stroke sample; a section with `h2` `What to do`, the instruction sentence, and `<Checker />`
    - Run `bun run check` and `bun run build`
    - Commit `feat(site): add town page with well table and checker`, staging `WellRow.svelte`, `Checker.svelte`, and the town `+page.svelte` by name
    - _Requirements: 2.9, 2.13, 7.2, 7.3, 7.4, 8.1, 8.2, 8.4, 8.5, 11.1, 11.2, 11.3_

- [x] 7. Build the accuracy page
  - [x] 7.1 Complete the Accuracy_Page
    - Fill `src/routes/accuracy/+page.svelte`: `h1` `Accuracy`; the `meaning(backtest)` sentence when it is not null; the design's results `dl` (wells tested, both median errors with `mg/L` only after non-null values, crossings caught as `caught of crossed (share)`, false alarms); `h2` `Terms` with the five one-clause definitions
    - Run `bun run check` and `bun run build`; confirm `rg -o '1,376|49 of 160|30\.6%' build/accuracy.html` finds all three
    - Commit `feat(site): add accuracy page`, staging the accuracy `+page.svelte` by name
    - _Requirements: 2.13, 3.8, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10_

- [x] 8. Final checkpoint - verify the build
  - [x] 8.1 Run the design's build checks in `site/`
    - `bun run check` (0 errors, 0 warnings), `bun run test`, and `bun run build` (exit 0)
    - Town page count and slug diff (328 twice, empty diff); `5,672 wells tracked` in `build/index.html`; the three accuracy numbers in `build/accuracy.html`
    - The design's greps for `any`, `export let`, `$:`, emoji in `src` and `build`, and external origins in `build`, each printing nothing
    - Fix each failure in the file that causes it
    - _Requirements: 1.1, 1.2, 1.5, 1.7, 1.8, 2.11, 5.3, 7.1, 13.1_
  - [x] 8.2 Run the negative builds and hand off
    - From the repo root, run the design's three `neg` builds in `/tmp/salt-neg` (`acton.json` removed, Feature_Well removed, `caught` removed); each exits non-zero and prints `acton.json`, `4239000|NO. PLYMOUTH GP WELL`, and `backtest.json` with `caught`, respectively; then `rm -rf /tmp/salt-neg`
    - If 8.1 or 8.2 needed fixes, commit them as `fix(site): <what>`, staging the fixed files by name
    - Ensure all tests pass, ask the user if questions arise
    - List the design's manual browser checklist for the user, with the loopback-only `bunx serve@14.2.6 -l tcp://127.0.0.1:4173 build` command; do not run it
    - _Requirements: 1.3, 4.6, 5.7, 7.6, 13.11_

## Notes

- Every task is required. There are no optional tasks and no property tests; the only tests are the four vitest example files.
- Never start `bun run dev`, `vite preview`, or `serve`. The manual browser check is the user's.
- Commands run in `site/` unless a step says repo root. Commit once per top-level task with the given one-line message, staging files by name. Never push. Never stage or edit files under `.kiro/`.
- Sub-tasks that share a wave write different files and run only their own test file. `bun run check`, `bun run build`, and the commit happen in the last sub-task of each top-level task.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["3.1", "4.1"] },
    { "id": 5, "tasks": ["3.2"] },
    { "id": 6, "tasks": ["4.2"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2"] },
    { "id": 9, "tasks": ["6.1", "6.2"] },
    { "id": 10, "tasks": ["6.3"] },
    { "id": 11, "tasks": ["7.1"] },
    { "id": 12, "tasks": ["8.1"] },
    { "id": 13, "tasks": ["8.2"] }
  ]
}
```
