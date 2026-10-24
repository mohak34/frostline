# Design Document

## Overview

The pipeline is a straight line of plain functions. Each module takes the previous module's output as in-memory Python values and returns new values. Only `fetch.py` touches the network, and only `towns.py` and `backtest.py` write site files. No classes with behavior and no framework: frozen dataclasses for internal records, TypedDicts for the JSON shapes the site reads.

```
build.py
  fetch.fetch(raw_dir, refresh, client)    -> dict[Chemical, list[RawItem]]   (reads/writes pipeline/raw/)
  clean.clean(items)                        -> list[Sample]
  trends.analyze_wells(samples)             -> dict[str, WellTrend]
  towns.build_towns(samples, trends)        -> list[TownOut]   + write towns.json, state.json, wells/<slug>.json
  backtest.run(samples)                     -> BacktestOut     + write backtest.json
```

Facts checked against the live API (`ChemicalName=SODIUM&_start=0&_end=2`):

- `_end` is exclusive: `_start=0&_end=2` returned 2 Items. A page is `_start=k&_end=k+5000`.
- `CollectedDate` looks like `1993-06-21T00:00:00`.
- `ResultWithUnit` looks like `24.26 MG/L`; `Result` is `24.26`. The unit is the text after the last space.
- `TotalCount` for sodium was 37,647.

## Architecture

```
pipeline/
  pyproject.toml      deps: httpx, scipy. dev group: pytest, ruff, ty
  build.py            argparse (--refresh), runs the five steps in order
  fetch.py
  clean.py            RawItem, Sample, Chemical, decimal_year
  trends.py           Trend, Series, SodiumSeries, WellTrend
  towns.py            slugify, output TypedDicts, file writers
  backtest.py
  raw/                gitignored (Requirement 1.6)
  tests/
    test_pipeline.py    example tests: clean, trend label, watch flag, backtest counts
```

Dependency direction: `trends`, `towns`, `backtest` import types and `decimal_year` from `clean`; `towns` and `backtest` import `projection` and `analyze` from `trends`. No cycles.

Paths are resolved from `Path(__file__).parent` in `build.py`, so `uv run build.py` works from `pipeline/` regardless of the shell's cwd. Data_Directory is `../site/static/data`.

## Components and Interfaces

### fetch.py

```python
PAGE_SIZE = 5000
BASE_URL = "https://eeaonline.eea.state.ma.us/EEA/DataLake/V1.0/DataLakeAPI/drinkingWater"
CHEMICALS: tuple[Chemical, ...] = ("SODIUM", "CHLORIDE")

class FetchError(Exception): ...

def collect_pages(get_page: Callable[[int, int], tuple[list[RawItem], int]]) -> list[RawItem]:
    """Calls get_page(start, end) with start = 0, 5000, ... until len(items) >= TotalCount."""

def fetch_chemical(client: httpx.Client, chemical: Chemical) -> list[RawItem]: ...

def fetch(raw_dir: Path, refresh: bool, client: httpx.Client) -> dict[Chemical, list[RawItem]]: ...
```

- `collect_pages` is pure over the injected `get_page`, so paging logic is testable without HTTP.
- `fetch_chemical` builds `get_page` from `client.get(BASE_URL, params=...)`. On a non-2xx status it raises `FetchError(f"{chemical} page _start={start}: HTTP {status}")`.
- If a page returns zero Items before `TotalCount` is reached, `collect_pages` raises `FetchError` instead of looping forever.
- `fetch` reads `raw_dir / f"{chemical.lower()}.json"` when it exists and `refresh` is false. Otherwise it downloads all pages, then writes to `<name>.json.tmp` and `os.replace`s it over the final file. A failure mid-download never touches the previous file (Requirement 1.5).
- Client timeout is set explicitly (60 s); httpx's 5 s default is too short for 5000-item pages.

### clean.py

```python
Chemical = Literal["SODIUM", "CHLORIDE"]
RawFinished = Literal["R", "F"]

class RawItem(TypedDict):
    PWSId: str
    PWSName: str
    Town: str
    Class: str
    ChemicalName: str
    CollectedDate: str
    RaworFinished: str
    Result: str
    ResultWithUnit: str
    LocationName: str

@dataclass(frozen=True)
class Sample:
    well: str            # f"{PWSId}|{LocationName}"
    location_name: str
    chemical: Chemical
    date: date
    value: float         # mg/L
    town: str
    pws_name: str
    cls: str
    raw_or_finished: str

def parse_value(item: RawItem) -> float | None: ...
def parse_date(raw: str) -> date | None: ...
def to_sample(item: RawItem) -> Sample | None: ...
def clean(items: Iterable[RawItem]) -> list[Sample]: ...
def decimal_year(d: date) -> float: ...
```

- `parse_value` returns `None` unless `float(Result)` succeeds, the result is finite, and `ResultWithUnit.rsplit(" ", 1)[-1].lower() == "mg/l"`.
- `parse_date` takes the part before `T` and uses `date.fromisoformat`; any `ValueError` returns `None`.
- `to_sample` returns `None` if either parse fails. It never inspects `Class` or `RaworFinished` for filtering (Requirement 2.6).
- `decimal_year(d) = d.year + (d.toordinal() - date(d.year, 1, 1).toordinal()) / days_in_year(d.year)`.
- Missing keys in a RawItem are a schema change in the API, not bad data. Let the `KeyError` stop the build.

### trends.py

```python
Trend = Literal["rising", "flat", "falling", "insufficient"]

MIN_SAMPLES = 4
MIN_SPAN_YEARS = 5.0
ALPHA = 0.05
SODIUM_GUIDELINE = 20.0
WATCH_GAP_YEARS = 5.0

@dataclass(frozen=True)
class Series:
    samples: tuple[Sample, ...]   # sorted by (date, value)
    trend: Trend
    slope: float | None
    latest: float | None

@dataclass(frozen=True)
class SodiumSeries(Series):
    watch: bool

@dataclass(frozen=True)
class WellTrend:
    sodium: SodiumSeries
    chloride: Series

def span_years(samples: Sequence[Sample]) -> float: ...
def classify(p_value: float, slope: float) -> Trend: ...
def analyze(samples: Sequence[Sample]) -> Series: ...
def projection(samples: Sequence[Sample], slope: float, gap_years: float) -> float: ...
def watch_flag(series: Series) -> bool: ...
def analyze_wells(samples: Iterable[Sample]) -> dict[str, WellTrend]: ...
```

- `analyze` sorts by `(date, value)`. `latest` is the last sample's value, or `None` when empty. If `len < 4` or `span_years < 5`, it returns `trend="insufficient"`, `slope=None`. Otherwise it computes `theilslopes(y, x).slope` and `kendalltau(x, y).pvalue` on `x = decimal_year(date)`, `y = value`, then `classify`.
- `classify`: `p < 0.05 and slope > 0` → rising; `p < 0.05 and slope < 0` → falling; else flat. A NaN p-value (constant series) fails `p < 0.05` and lands on flat.
- `projection = median(last 3 values by date) + max(slope, 0) * gap_years`. With fewer than 3 samples it uses all of them (only reachable from tests; both callers require at least 4).
- `watch_flag` is false when `trend == "insufficient"`; else `latest <= 20 and projection(samples, slope, 5) > 20`.
- Only `SodiumSeries` has a `watch` field, so "watch is sodium only" (Requirement 3.11) is enforced by the type, not by a runtime check.
- Slope is null whenever the trend is insufficient, for both chemicals. Requirement 5.6 already needs this for empty series; applying it uniformly is one rule instead of two.

### towns.py

```python
class SamplePoint(TypedDict):
    date: str        # YYYY-MM-DD
    value: float

class ChlorideOut(TypedDict):
    samples: list[SamplePoint]
    trend: Trend
    slope: float | None
    latest: float | None

class SodiumOut(ChlorideOut):
    watch: bool

# "class" is a Python keyword, so WellOut uses the functional form
WellOut = TypedDict("WellOut", {
    "id": str, "name": str, "system": str, "class": str,
    "raw_or_finished": str, "sodium": SodiumOut, "chloride": ChlorideOut,
})

class TownOut(TypedDict):
    name: str
    slug: str
    wells: int
    pct_rising: float | None
    pct_over_20: float | None

class TownFile(TypedDict):
    town: str
    wells: list[WellOut]

class StateEntry(TypedDict):
    pct_rising: float | None
    pct_over_20: float | None

def slugify(name: str) -> str: ...
def series_out(series: Series) -> ChlorideOut: ...
def sodium_out(series: SodiumSeries) -> SodiumOut: ...
def well_out(well: str, meta: Sample, trend: WellTrend) -> WellOut: ...
def summarize(name: str, trends: Sequence[WellTrend]) -> TownOut: ...
def worst_wells(wells: Sequence[tuple[str, WellTrend]], n: int = 5) -> list[str]: ...
def build_towns(samples: Sequence[Sample], trends: Mapping[str, WellTrend]) -> tuple[list[TownOut], dict[str, TownFile]]: ...
def write_towns(data_dir: Path, towns: list[TownOut], files: dict[str, TownFile]) -> None: ...
```

- `slugify`: `re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")`.
- A Well's metadata (Town, PWSName, Class, RaworFinished, LocationName) comes from its most recent Sample. A Well belongs to exactly one Town.
- `summarize`:
  - `wells = len(trends)`
  - `pct_rising = 100 * rising / trended`, or `None` when `trended == 0`
  - `pct_over_20 = 100 * over / with_latest`, or `None` when no well has a sodium latest
  - Percentages are rounded to 1 decimal.
- `worst_wells` ranks by sodium `latest` descending and drops wells with no sodium latest. Ties break on well id so output is stable. The town file stores all wells sorted this way; the worst 5 are its first 5 entries. That avoids a second list in the JSON. The site slices `wells[:5]`.
- If two Town names produce the same Slug, `build_towns` raises `ValueError` naming both. Silently merging towns would publish wrong numbers.
- `write_towns` writes `towns.json` (sorted by name), `state.json` (`{slug: {pct_rising, pct_over_20}}`), and `wells/<slug>.json`. It removes stale `wells/*.json` files whose slug is no longer produced, but only inside `wells/`. JSON is written with `indent=None, separators=(",", ":")` to keep the files small.

### backtest.py

```python
TRAIN_END = date(2016, 1, 1)     # train: date < TRAIN_END
TEST_START = date(2020, 1, 1)    # test:  date >= TEST_START
MIN_TRAIN_SAMPLES = 4
MIN_TRAIN_SPAN = 6.0

@dataclass(frozen=True)
class WellCase:
    well: str
    last_train: float
    baseline: float
    rule: float
    actual: float        # mean test value

class BacktestOut(TypedDict):
    wells_tested: int
    mae_baseline: float | None
    mae_rule: float | None
    crossed: int
    caught: int
    false_alarms: int

def split(samples: Sequence[Sample]) -> tuple[list[Sample], list[Sample]]: ...
def make_case(well: str, samples: Sequence[Sample]) -> WellCase | None: ...
def score(cases: Sequence[WellCase]) -> BacktestOut: ...
def run(samples: Iterable[Sample]) -> BacktestOut: ...
def write_backtest(data_dir: Path, out: BacktestOut) -> None: ...
```

- `make_case` uses sodium Samples only. It returns `None` unless the train set has at least 4 Samples and span at least 6 years and the test set is non-empty.
- `baseline = last_train` = value of the last training Sample by `(date, value)`.
- `rule = projection(train, theilslopes(train).slope, gap)`, where `gap = mean(decimal_year(t) for t in test) - decimal_year(last train date)`. The mean of decimal years is used as "Decimal_Year of the mean test date"; the two differ by at most a fraction of a day.
- `score`:
  - `mae_*` = median of `|actual - prediction|`, `None` when there are no cases.
  - `crossed` = cases with `last_train <= 20 and actual > 20`.
  - `caught` = crossed cases with `rule > 20`.
  - `false_alarms` = cases with `last_train <= 20 and actual <= 20 and rule > 20`.
- MAE values are rounded to 2 decimals in the output.

### build.py

```python
def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    with httpx.Client(timeout=60.0) as client:
        raw = fetch.fetch(RAW_DIR, args.refresh, client)
    samples = clean.clean(item for items in raw.values() for item in items)
    trends = trends_mod.analyze_wells(samples)
    town_list, files = towns.build_towns(samples, trends)
    towns.write_towns(DATA_DIR, town_list, files)
    backtest.write_backtest(DATA_DIR, backtest.run(samples))
    return 0
```

It prints one line per step with counts (items fetched, samples kept, wells, towns, wells tested). A `FetchError` prints its message to stderr and exits 1.

## Data Models

Internal: `RawItem` (TypedDict, API shape) → `Sample` (frozen dataclass) → `Series` / `SodiumSeries` / `WellTrend` (frozen dataclasses).

Output (all in `site/static/data/`):

```json
// towns.json
[{"name": "PLYMOUTH", "slug": "plymouth", "wells": 31, "pct_rising": 62.5, "pct_over_20": 40.0}]

// state.json
{"plymouth": {"pct_rising": 62.5, "pct_over_20": 40.0}}

// wells/plymouth.json
{"town": "PLYMOUTH", "wells": [{
  "id": "4239000|WELL #1", "name": "WELL #1", "system": "PLYMOUTH WATER DEPT",
  "class": "COM", "raw_or_finished": "R",
  "sodium":   {"samples": [{"date": "1994-05-02", "value": 8.1}], "trend": "rising", "slope": 2.3, "latest": 104.0, "watch": false},
  "chloride": {"samples": [], "trend": "insufficient", "slope": null, "latest": null}
}]}

// backtest.json
{"wells_tested": 1350, "mae_baseline": 4.1, "mae_rule": 3.2, "crossed": 60, "caught": 41, "false_alarms": 25}
```

Example values are illustrative, not real output. Town names are kept as the API gives them (upper case); the site formats them for display.

## Error Handling

| Condition | Behavior |
|---|---|
| Non-2xx HTTP status | `FetchError` with chemical and `_start`; build exits 1; previous raw file untouched |
| Network error / timeout | httpx exception propagates; same exit; previous raw file untouched |
| Empty page before `TotalCount` | `FetchError` (prevents an infinite loop) |
| Non-numeric `Result`, non-mg/L unit, bad date | Item dropped silently; dropped count printed by build.py |
| Missing key in an Item | `KeyError` stops the build (API schema changed) |
| Constant series (NaN p-value) | Trend `flat` |
| Two towns with the same Slug | `ValueError` stops the build |
| No backtest cases | `wells_tested = 0`, MAE fields null |


## Testing Strategy

Plain pytest example tests in one file, `pipeline/tests/test_pipeline.py`, run with `uv run pytest`. No property-based testing. Tests build `RawItem`s and `Sample`s by hand and call the pure functions directly; nothing touches the network or the filesystem.

- Clean (Requirements 2.1, 2.2, 2.4): `to_sample` keeps an item with `Result="24.26"`, `ResultWithUnit="24.26 MG/L"` and returns value 24.26; drops an item with `Result="ND"`; drops an item with an unparseable `CollectedDate`.
- Trend label (Requirements 3.1, 3.4, 3.6): `analyze` on a clearly rising series (for example `2t + 10` yearly over 10 years) returns `rising`; a flat noisy series (values alternating around a constant over 10 years) returns `flat`; 3 samples return `insufficient` with slope `None`.
- Watch flag (Requirements 3.8, 3.9): one rising sodium series with latest at most 20 and a 5-year projection over 20 gives `True`; one series whose latest already exceeds 20 gives `False`.
- Backtest counts (Requirements 6.6-6.9): `run` on 3 hand-made wells, one that crosses 20 and is caught, one that stays under 20 with no alarm, and one excluded for too few training samples, returns `wells_tested == 2` and the expected `crossed`, `caught`, `false_alarms`.

Smoke checks, run as commands rather than tests (Requirements 1.6, 7.1-7.3): `ruff check`, `ruff format --check`, `ty check`, `git check-ignore pipeline/raw/`, and the `[project] dependencies` list in `pyproject.toml` being exactly httpx and scipy.

Acceptance on real data (Requirement 8) is a manual command check in the final checkpoint, not a test file. After `uv run build.py`, read the files in `site/static/data/` and confirm:

- `towns.json` has entries with slugs `plymouth` and `amherst`.
- `wells/plymouth.json` has a well with a sodium sample under 10 mg/L dated 1990-1999 and a sodium sample over 100 mg/L dated 2020 or later.
- `backtest.json` has `wells_tested >= 1300`.
