# Requirements Document

## Introduction

The salt data pipeline lives in `pipeline/` and turns MassDEP sodium and chloride drinking water results into static JSON files in `site/static/data/`. The site reads only these files. Running `uv run build.py` executes five modules in order: fetch, clean, trends, towns, backtest. The pipeline covers public water systems only (all classes: COM, NC, NTNC) and uses both raw and finished samples.

## Glossary

- **Pipeline**: The Python project in `pipeline/`, run with `uv run build.py`, managed with uv, linted with ruff, type-checked with ty, depending only on httpx and scipy.
- **Build_Script**: `pipeline/build.py`, which runs Fetcher, Cleaner, Trend_Analyzer, Town_Aggregator, and Backtester in that order.
- **Fetcher**: `pipeline/fetch.py`, which downloads results from the Data_Lake_API.
- **Cleaner**: `pipeline/clean.py`, which filters and normalizes raw results into Samples.
- **Trend_Analyzer**: `pipeline/trends.py`, which computes per-well, per-chemical trends.
- **Town_Aggregator**: `pipeline/towns.py`, which computes per-town summaries and writes town outputs.
- **Backtester**: `pipeline/backtest.py`, which measures prediction accuracy of the watch rule.
- **Data_Lake_API**: `https://eeaonline.eea.state.ma.us/EEA/DataLake/V1.0/DataLakeAPI/drinkingWater`, which returns `{"Items": [...], "TotalCount": n}` and pages with `_start` and `_end`.
- **Chemical**: One of `SODIUM` or `CHLORIDE`.
- **Raw_Directory**: `pipeline/raw/`, gitignored, holding one raw JSON file per Chemical.
- **Data_Directory**: `site/static/data/`.
- **Well**: A sampling point identified by the key `PWSId|LocationName`. Raw and finished sampling points with different keys are separate Wells.
- **Sample**: One cleaned result: Well key, Chemical, collected date, numeric value in mg/L, plus Town, PWSName, Class, and RaworFinished.
- **Decimal_Year**: A date expressed as year plus the elapsed fraction of that year.
- **Span**: Decimal_Year of the newest Sample minus Decimal_Year of the oldest Sample in a set.
- **Slope**: Theil-Sen slope (`scipy.stats.theilslopes`) of value against Decimal_Year, in mg/L per year.
- **Trend**: One of `rising`, `flat`, `falling`, `insufficient`.
- **Latest**: The value of the most recent Sample of a Well for a Chemical.
- **Watch_Flag**: Boolean on a Well's sodium series signalling a projected crossing of 20 mg/L.
- **Projection**: Median of the last 3 Samples plus `max(Slope, 0) * gap_years`.
- **Trended_Well**: A Well whose sodium Trend is not `insufficient`.
- **Slug**: Lowercase town name with each run of non-alphanumeric characters replaced by a single hyphen and leading or trailing hyphens removed.

## Requirements

### Requirement 1: Fetch raw results

**User Story:** As a pipeline maintainer, I want all sodium and chloride results downloaded once and cached, so that later steps run offline and repeat runs are fast.

#### Acceptance Criteria

1. WHEN the Build_Script runs, THE Fetcher SHALL request each Chemical from the Data_Lake_API using `ChemicalName=<Chemical>` with `_start` and `_end` advancing in steps of 5000 until the number of collected Items reaches `TotalCount`.
2. WHEN all pages for a Chemical are collected, THE Fetcher SHALL write the combined Items as one JSON file per Chemical in the Raw_Directory.
3. WHILE a raw file for a Chemical exists in the Raw_Directory and `--refresh` is absent, THE Fetcher SHALL use the existing file and skip the download for that Chemical.
4. WHERE `--refresh` is passed to the Build_Script, THE Fetcher SHALL download every Chemical and overwrite the existing raw files.
5. IF a Data_Lake_API request returns a non-success HTTP status, THEN THE Fetcher SHALL stop the Build_Script with an error naming the Chemical and page offset, leaving any previous raw file for that Chemical unchanged.
6. THE Pipeline SHALL list the Raw_Directory in `.gitignore`.

### Requirement 2: Clean results

**User Story:** As a pipeline maintainer, I want only trustworthy numeric mg/L results kept and keyed by well, so that trends are computed on valid data.

#### Acceptance Criteria

1. WHEN an Item's `Result` does not parse as a number, THE Cleaner SHALL drop the Item.
2. WHEN an Item's unit, read from the suffix of `ResultWithUnit` and compared case-insensitively, is not `mg/L`, THE Cleaner SHALL drop the Item.
3. THE Cleaner SHALL parse `CollectedDate` into a date for each kept Item.
4. IF an Item's `CollectedDate` does not parse, THEN THE Cleaner SHALL drop the Item.
5. THE Cleaner SHALL key each Sample by `PWSId|LocationName`.
6. THE Cleaner SHALL keep Items of every Class (`COM`, `NC`, `NTNC`) and of both RaworFinished values (`R`, `F`).
7. THE Cleaner SHALL record on each Sample the Town, PWSName, Class, and RaworFinished of the source Item.

### Requirement 3: Compute trends

**User Story:** As a resident, I want each well labelled rising, flat, or falling, so that I can tell whether my water is getting saltier.

#### Acceptance Criteria

1. IF a Well has fewer than 4 Samples for a Chemical or a Span under 5 years for that Chemical, THEN THE Trend_Analyzer SHALL set the Trend to `insufficient` for that Well and Chemical.
2. WHEN a Well has at least 4 Samples and a Span of at least 5 years for a Chemical, THE Trend_Analyzer SHALL compute the Slope with `scipy.stats.theilslopes` on (Decimal_Year, value) pairs.
3. WHEN a Well has at least 4 Samples and a Span of at least 5 years for a Chemical, THE Trend_Analyzer SHALL compute the p-value with `scipy.stats.kendalltau` on the same (Decimal_Year, value) pairs.
4. WHEN the p-value is below 0.05 and the Slope is greater than 0, THE Trend_Analyzer SHALL set the Trend to `rising`.
5. WHEN the p-value is below 0.05 and the Slope is less than 0, THE Trend_Analyzer SHALL set the Trend to `falling`.
6. WHEN a Well has at least 4 Samples and a Span of at least 5 years and neither the `rising` nor the `falling` condition holds, THE Trend_Analyzer SHALL set the Trend to `flat`.
7. THE Trend_Analyzer SHALL record the Latest value for each Well and Chemical.
8. WHEN a Well's sodium Latest is at most 20 mg/L and the sodium Projection with `gap_years` of 5 exceeds 20 mg/L, THE Trend_Analyzer SHALL set the Watch_Flag to true.
9. WHEN either Watch_Flag condition in criterion 8 fails, THE Trend_Analyzer SHALL set the Watch_Flag to false.
10. WHILE a Well's sodium Trend is `insufficient`, THE Trend_Analyzer SHALL set the Watch_Flag to false and the Slope to null.
11. THE Trend_Analyzer SHALL compute the Watch_Flag for sodium only.

### Requirement 4: Aggregate towns

**User Story:** As a town official, I want per-town summaries, so that I can see which towns and wells need attention.

#### Acceptance Criteria

1. THE Town_Aggregator SHALL count the Wells of each Town.
2. THE Town_Aggregator SHALL compute `pct_rising` as the percentage of the Town's Trended_Wells whose sodium Trend is `rising`.
3. IF a Town has no Trended_Wells, THEN THE Town_Aggregator SHALL set `pct_rising` to null.
4. THE Town_Aggregator SHALL compute `pct_over_20` as the percentage of the Town's Wells with a sodium Latest whose sodium Latest exceeds 20 mg/L.
5. IF a Town has no Wells with sodium Samples, THEN THE Town_Aggregator SHALL set `pct_over_20` to null.
6. THE Town_Aggregator SHALL select the Town's worst 5 Wells ranked by sodium Latest, highest first.
7. THE Town_Aggregator SHALL derive each Town's Slug from the Town name.

### Requirement 5: Write site outputs

**User Story:** As a site developer, I want stable static JSON files, so that the site reads them without live API calls.

#### Acceptance Criteria

1. THE Town_Aggregator SHALL write `towns.json` to the Data_Directory as a list of `{name, slug, wells, pct_rising, pct_over_20}` with one entry per Town.
2. THE Town_Aggregator SHALL write `wells/<slug>.json` to the Data_Directory for each Town as `{town, wells: [...]}`.
3. THE Town_Aggregator SHALL write each Well entry as `{id, name, system, class, raw_or_finished, sodium, chloride}`, where `id` is the Well key, `name` is LocationName, and `system` is PWSName.
4. THE Town_Aggregator SHALL write the `sodium` object as `{samples: [{date, value}], trend, slope, latest, watch}` with samples ordered by date ascending and dates in ISO `YYYY-MM-DD` form.
5. THE Town_Aggregator SHALL write the `chloride` object as `{samples: [{date, value}], trend, slope, latest}`.
6. IF a Well has no Samples for a Chemical, THEN THE Town_Aggregator SHALL write that Chemical's object with an empty `samples` list, Trend `insufficient`, and null `slope` and `latest`.
7. THE Town_Aggregator SHALL write `state.json` to the Data_Directory as an object mapping each Slug to `{pct_rising, pct_over_20}`.
8. THE Backtester SHALL write `backtest.json` to the Data_Directory containing every metric from Requirement 6.

### Requirement 6: Backtest the watch rule

**User Story:** As a resident, I want the site to publish its own prediction accuracy, so that I can judge how far to trust the watch flag.

#### Acceptance Criteria

1. THE Backtester SHALL split each Well's sodium Samples into a training set of Samples collected before 2016-01-01 and a test set of Samples collected on or after 2020-01-01.
2. THE Backtester SHALL include a Well only when the training set has at least 4 Samples and a Span of at least 6 years and the test set has at least 1 Sample.
3. THE Backtester SHALL compute a baseline prediction equal to the last training value for each included Well.
4. THE Backtester SHALL compute a rule prediction equal to the Projection on the training set, with `gap_years` equal to the Decimal_Year of the mean test date minus the Decimal_Year of the last training Sample.
5. THE Backtester SHALL report the median absolute error between the mean test value and each prediction, separately for baseline and rule.
6. THE Backtester SHALL report the number of included Wells as `wells_tested`.
7. THE Backtester SHALL report, among included Wells whose last training value is at most 20 mg/L, the count whose mean test value exceeds 20 mg/L (`crossed`).
8. THE Backtester SHALL report, among the Wells counted in criterion 7, the count whose rule prediction exceeds 20 mg/L (`caught`).
9. THE Backtester SHALL report, among included Wells whose last training value is at most 20 mg/L and whose mean test value is at most 20 mg/L, the count whose rule prediction exceeds 20 mg/L (`false_alarms`).

### Requirement 7: Build orchestration and code quality

**User Story:** As a pipeline maintainer, I want one command and a typed, linted codebase, so that the pipeline is easy to run and change.

#### Acceptance Criteria

1. WHEN `uv run build.py` is run in `pipeline/`, THE Build_Script SHALL run Fetcher, Cleaner, Trend_Analyzer, Town_Aggregator, and Backtester in that order.
2. THE Pipeline SHALL declare httpx and scipy as its only runtime dependencies.
3. THE Pipeline SHALL type-annotate every function and pass `ruff check`, `ruff format --check`, and `ty check` with zero errors.
4. THE Pipeline SHALL include focused tests for trend classification, the Watch_Flag rule, Cleaner filtering, and backtest metrics.

### Requirement 8: Acceptance on real data

**User Story:** As the project owner, I want concrete checks on real data, so that I know the pipeline output is correct.

#### Acceptance Criteria

1. WHEN the Build_Script completes on real data, THE Pipeline SHALL produce a `towns.json` that contains entries for Plymouth and Amherst.
2. WHEN the Build_Script completes on real data, THE Pipeline SHALL produce a `wells/plymouth.json` that contains a Well with a sodium Sample under 10 mg/L dated in the 1990s and a sodium Sample over 100 mg/L dated 2020 or later.
3. WHEN the Build_Script completes on real data, THE Pipeline SHALL produce a `backtest.json` whose `wells_tested` is at least 1,300.
