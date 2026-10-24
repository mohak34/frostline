# How we used Kiro

## Tools

We used the Kiro IDE for the data pipeline: specs, steering, and running the task lists. For the frontend we used Kiro Crew with Claude Code connected over ACP, working from the same specs and steering in `.kiro/`.

TODO (confirm): exact split of who did what in Kiro IDE vs Kiro Crew, and whether CLI or Web were used at all. Do not claim either unless they were.

The difference we noticed: the IDE was best for working through a spec task by task with us reviewing each step. Crew was better for the frontend, where we iterated on the look a lot and wanted the agent to handle many small UI passes against the same spec.

## Specs

Two specs, in `.kiro/specs/`:

- `salt-data-pipeline`: requirements, design, and a 109-line task list. The design pins down the module chain (fetch, clean, trends, towns, backtest), the JSON shapes the site reads, and facts we checked against the live API first, like `_end` being exclusive and units living in `ResultWithUnit`. Every task points back to the requirement numbers it covers, and each one ends in a commit.
- `salt-site`: 13 requirements (static build, home chart, town search, town page, well table, chart rules, MassDOT checker, accuracy page, and so on), a design, and a 152-line task list.

`tasks.meta.json` in each spec has Kiro's execution history for every task.

What it changed for us: writing the requirements first forced the hard calls early. We had to decide what "rising" means (Kendall tau p < 0.05 with a Theil-Sen slope, at least 4 tests over at least 5 years) before any code, and we had to write a rule for the "watch" flag that we could then backtest. With vibe coding we would have found those questions halfway through the UI. The spec also kept the pipeline and site honest with each other, since both sides were built from the same JSON shapes.

TODO (confirm): the site spec was committed after the first site commits. If it was written in Kiro first and committed later, say so; if it was written after, say that instead.

## Steering

Three steering files in `.kiro/steering/`:

- `product.md`: users, the MassDEP and MassDOT thresholds, and product rules like "no unsafe by year X countdowns" and "publish our own backtest accuracy".
- `tech.md`: uv only, ruff, ty, type every function, SvelteKit static, no `any`, and the rule that the site only reads static JSON.
- `data.md`: the API URL, paging, the field names we use, and data quirks.

The one that mattered most was `data.md`. The chloride filter in the API is a substring match, so it also returns other chlorides. Once that was in steering, every later task dropped them without us repeating it. We also corrected the chloride count in it when we found the real number, so the agent stopped quoting the wrong one.

`product.md` kept the tone in check. Without it the agent kept wanting to show scary "unsafe by" dates the data can't support.

## Agent hooks

We did not use hooks. TODO (confirm). Lint, format, type check, and tests were run as explicit checkpoint tasks in the task lists instead.

## MCP

TODO (confirm whether any MCP servers were connected in Kiro). If none: we did not need one, since the only external source is one public API with no auth, and we checked it by hand before writing the design.

## Property-based testing

We did not use PBT. `pbtResults` is empty in both specs. The tests are example tests: 10 in the pipeline (cleaning, paging, trend labels, the watch flag, backtest counts) and 28 in the site (MassDOT checker, formatting, search, chart, stats). The trend and checker rules would be good PBT targets next, for example "a series that only goes up is never labeled falling".

## Powers

TODO (confirm). If none were used, say so.
