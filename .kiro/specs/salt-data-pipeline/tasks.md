# Implementation Plan: salt-data-pipeline

## Overview

Build `pipeline/` as plain Python modules in dependency order: `clean` (shared types) first, then `fetch` and `trends`, then `towns` and `backtest`, then `build.py` wires them together. Work on a `feat/salt-data-pipeline` branch. Commit after each top-level task with a one-line conventional commit, staging only that task's files; never push. Use uv for everything, ruff for lint and format, ty for types, and annotate every function. All tests are plain pytest example tests in one file, `pipeline/tests/test_pipeline.py`.

## Tasks

- [x] 1. Scaffold the pipeline project
  - [x] 1.1 Create branch, `pipeline/pyproject.toml`, and `.gitignore` entry
    - `git switch -c feat/salt-data-pipeline`
    - `uv init` in `pipeline/`; `uv add httpx scipy`; `uv add --dev pytest ruff ty`
    - `[project] dependencies` must be exactly httpx and scipy
    - Add `pipeline/raw/` to the repo `.gitignore`; create empty `pipeline/tests/`
    - Commit: `chore: scaffold pipeline project`
    - _Requirements: 1.6, 7.2_

- [x] 2. Implement the Cleaner
  - [x] 2.1 Implement `pipeline/clean.py`
    - `Chemical`, `RawItem`, frozen `Sample`, `parse_value`, `parse_date`, `to_sample`, `clean`, `decimal_year` as in the design
    - Unit check: `ResultWithUnit.rsplit(" ", 1)[-1].lower() == "mg/l"`; finite float only
    - No filtering on `Class` or `RaworFinished`; missing keys raise `KeyError`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 2.2 Write Cleaner tests in `pipeline/tests/test_pipeline.py`
    - `to_sample` keeps `Result="24.26"`, `ResultWithUnit="24.26 MG/L"` with value 24.26 and well key `PWSId|LocationName`
    - `to_sample` drops `Result="ND"` and drops an unparseable `CollectedDate`
    - Commit: `feat(pipeline): clean raw results into samples`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 7.4_

- [x] 3. Implement the Fetcher
  - [x] 3.1 Implement `pipeline/fetch.py`
    - `collect_pages` over an injected `get_page(start, end)`; `_end` is exclusive, steps of 5000
    - `FetchError` on non-2xx (message names chemical and `_start`) and on an empty page before `TotalCount`
    - `fetch` reuses `raw/<chemical>.json` unless `refresh`; writes via `.tmp` + `os.replace`
    - Commit: `feat(pipeline): fetch and cache data lake results`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Implement the Trend_Analyzer
  - [x] 4.1 Implement `pipeline/trends.py`
    - `Trend`, `Series`, `SodiumSeries`, `WellTrend`, `span_years`, `classify`, `analyze`, `projection`, `watch_flag`, `analyze_wells`
    - Insufficient (fewer than 4 samples or span under 5 years) means slope `None`, watch false; NaN p-value lands on flat
    - Watch only exists on `SodiumSeries`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_
  - [-] 4.2 Write trend label and watch flag tests in `pipeline/tests/test_pipeline.py`
    - Trend label: `2t + 10` yearly over 10 years gives `rising`; values alternating around a constant over 10 years give `flat`; 3 samples give `insufficient` with slope `None`
    - Watch flag: rising sodium series with latest at most 20 and 5-year projection over 20 gives `True`; series with latest already over 20 gives `False`
    - Commit: `feat(pipeline): classify well trends and watch flag`
    - _Requirements: 3.1, 3.4, 3.6, 3.8, 3.9, 7.4_

- [~] 5. Checkpoint
  - In `pipeline/`: `uv run pytest`, `uv run ruff check`, `uv run ty check`. Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement the Town_Aggregator
  - [-] 6.1 Implement `pipeline/towns.py`
    - Output TypedDicts (`WellOut` in functional form for the `class` key), `slugify`, `series_out`, `sodium_out`, `well_out`, `summarize`, `worst_wells`, `build_towns`, `write_towns`
    - Well metadata from its most recent Sample; wells in each town file sorted by sodium latest descending, ties on id
    - `ValueError` on slug collision; remove stale `wells/*.json` only inside `wells/`; compact JSON
    - Commit: `feat(pipeline): aggregate towns and write site json`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 7. Implement the Backtester
  - [-] 7.1 Implement `pipeline/backtest.py`
    - `split`, `make_case`, `score`, `run`, `write_backtest`; sodium only
    - Train before 2016-01-01, test on or after 2020-01-01; include iff train has at least 4 samples and span at least 6 years and test is non-empty
    - Rule uses `trends.projection` with `gap = mean test decimal year - last train decimal year`; MAE is a median, rounded to 2 decimals, `None` with no cases
    - _Requirements: 5.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_
  - [~] 7.2 Write backtest counts test in `pipeline/tests/test_pipeline.py`
    - `run` on 3 hand-made wells: one crosses 20 and is caught, one stays under 20 with no alarm, one excluded for too few training samples
    - Expect `wells_tested == 2`, `crossed == 1`, `caught == 1`, `false_alarms == 0`
    - Commit: `feat(pipeline): backtest the watch rule`
    - _Requirements: 6.2, 6.6, 6.7, 6.8, 6.9, 7.4_

- [ ] 8. Wire the build
  - [~] 8.1 Implement `pipeline/build.py`
    - `--refresh` flag; paths from `Path(__file__).parent`; Data_Directory is `../site/static/data`
    - Runs fetch, clean, trends, towns, backtest in order; one count line per step including dropped items
    - `FetchError` prints to stderr and exits 1
    - Commit: `feat(pipeline): add build entry point`
    - _Requirements: 1.4, 1.5, 7.1_

- [~] 9. Final checkpoint
  - In `pipeline/`: `uv run build.py`, then `uv run pytest`, `uv run ruff check`, `uv run ruff format --check`, `uv run ty check`, and from the repo root `git check-ignore pipeline/raw/`. Confirm `[project] dependencies` is exactly httpx and scipy.
  - Manual acceptance on the real output in `site/static/data/`:
    - `towns.json` has entries with slugs `plymouth` and `amherst`
    - `wells/plymouth.json` has a well with a sodium sample under 10 mg/L dated 1990-1999 and a sodium sample over 100 mg/L dated 2020 or later
    - `backtest.json` has `wells_tested >= 1300`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.6, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

## Notes

- No task is optional. Tests 2.2, 4.2, and 7.2 are required by Requirement 7.4.
- No Hypothesis and no property-based tests. Nothing in the tests touches the network or the filesystem.
- Tests 2.2, 4.2, and 7.2 all write `pipeline/tests/test_pipeline.py`, so each sits in a different wave.
- Never push; the user opens the PR after testing.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1"] }
  ]
}
```
