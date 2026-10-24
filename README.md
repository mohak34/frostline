# Frostline

Road salt is pushing sodium and chloride up in Massachusetts public wells. This site shows the trend for every public well with test data, by town, and flags wells that are still under the 20 mg/L sodium advisory but on track to pass it.

Hackachusetts 2026, Climate Tech track. Built with Kiro: specs and steering are in [`.kiro/`](.kiro), and the write-up is in [`submission/kiro.md`](submission/kiro.md).

## Layout

- `pipeline/`: Python. Pulls MassDEP drinking water results, cleans them, fits a trend per well (Mann-Kendall test with a Theil-Sen slope), rolls wells up by town, and backtests the watch flag. Writes static JSON to `site/static/data/`.
- `site/`: SvelteKit static site. Reads only that JSON, so it deploys as plain files.

The generated data is committed, so you can build the site without running the pipeline.

## Run the site

Needs [bun](https://bun.sh).

```sh
cd site
bun install
bun run build      # static site in site/build
bun run preview    # serve it locally
bun run test       # unit tests
```

## Rebuild the data

Needs [uv](https://docs.astral.sh/uv/).

```sh
cd pipeline
uv sync
uv run build.py            # uses cached raw downloads in pipeline/raw if present
uv run build.py --refresh  # re-download from MassDEP
uv run map.py              # town borders from MassGIS, rarely needed
uv run pytest
```

## Data

- Sodium and chloride results: MassDEP drinking water results through the EEA Data Lake API, public, no key needed.
- Town borders: MassGIS.
- Thresholds: 20 mg/L sodium (MassDEP advisory for low-sodium diets), MassDOT road-salt review triggers for sodium and chloride.
