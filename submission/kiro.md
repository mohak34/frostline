# How we used Kiro

## Tools

Kiro IDE did the core build. One spec-mode session with autopilot on (Claude Opus 5.5 as the model) ran both task lists end to end: 56 sub-executions across the pipeline and site specs, from scaffolding to the accuracy page. Separate Kiro sessions wrote the steering files, explained the project structure back to us as a check, and planned how to merge a teammate's repo.

After Kiro had the site working, we did the visual redesign (town map, time-lapse, page transitions, checker gauges) with Claude Code, feeding it the same `.kiro/` specs and steering so it kept to the data contracts and product rules. Kiro for spec-driven build-out, a second agent for fast visual iteration on top.

We did not use Kiro CLI, Web or Crew on this project.

## Specs

Two specs, in `.kiro/specs/`:

- `salt-data-pipeline`: requirements, design, and a 109-line task list. The design pins down the module chain (fetch, clean, trends, towns, backtest), the JSON shapes the site reads, and facts we checked against the live API first, like `_end` being exclusive and units living in `ResultWithUnit`. Every task points back to the requirement numbers it covers, and each one ends in a commit.
- `salt-site`: 13 requirements (static build, home chart, town search, town page, well table, chart rules, MassDOT checker, accuracy page, and so on), a design, and a 152-line task list.

The pipeline spec used Kiro's fast-task workflow and the site spec used requirements-first. `tasks.meta.json` in each spec is Kiro's execution history: 43 task runs across 19 tasks for the pipeline, 59 runs across 25 tasks for the site, each tied to a chat session.

What it changed for us: writing the requirements first forced the hard calls early. We had to decide what "rising" means (Kendall tau p < 0.05 with a Theil-Sen slope, at least 4 tests over at least 5 years) before any code, and we had to write a rule for the "watch" flag that we could then backtest. With vibe coding we would have found those questions halfway through the UI. The spec also kept the pipeline and site honest with each other, since both sides were built from the same JSON shapes.

## Steering

Three steering files in `.kiro/steering/`:

- `product.md`: users, the MassDEP and MassDOT thresholds, and product rules like "no unsafe by year X countdowns" and "publish our own backtest accuracy".
- `tech.md`: uv only, ruff, ty, type every function, SvelteKit static, no `any`, and the rule that the site only reads static JSON.
- `data.md`: the API URL, paging, the field names we use, and data quirks.

The one that mattered most was `data.md`. The chloride filter in the API is a substring match, so it also returns other chlorides. Once that was in steering, every later task dropped them without us repeating it. We also corrected the chloride count in it when we found the real number, so the agent stopped quoting the wrong one.

`product.md` kept the tone in check. Without it the agent kept wanting to show scary "unsafe by" dates the data can't support.

## Agent hooks

We did not use hooks. Lint, format, type check, and tests were run as explicit checkpoint tasks in the task lists instead.

## MCP

We did not connect MCP servers for this build. We did not need one: the only external source is one public API with no auth, and we checked it by hand before writing the design.

## Property-based testing

We did not use PBT. `pbtResults` is empty in both specs. The tests are example tests: 10 in the pipeline (cleaning, paging, trend labels, the watch flag, backtest counts) and 28 in the site (MassDOT checker, formatting, search, chart, stats). The trend and checker rules would be good PBT targets next, for example "a series that only goes up is never labeled falling".

## Powers

We did not install any powers. The stack (SvelteKit static, a uv Python pipeline) was covered by our steering files.
