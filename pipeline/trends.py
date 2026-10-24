import statistics
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Literal

from scipy.stats import kendalltau, theilslopes

from clean import Sample, decimal_year

Trend = Literal["rising", "flat", "falling", "insufficient"]

MIN_SAMPLES = 4
MIN_SPAN_YEARS = 5.0
ALPHA = 0.05
SODIUM_GUIDELINE = 20.0
WATCH_GAP_YEARS = 5.0


# One well's samples for one chemical. Slope is None whenever trend is insufficient.
@dataclass(frozen=True)
class Series:
    samples: tuple[Sample, ...]
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


def span_years(samples: Sequence[Sample]) -> float:
    if not samples:
        return 0.0
    years = [decimal_year(s.date) for s in samples]
    return max(years) - min(years)


def classify(p_value: float, slope: float) -> Trend:
    """A NaN p-value (constant series) fails `< ALPHA` and lands on flat."""
    if p_value < ALPHA and slope > 0:
        return "rising"
    if p_value < ALPHA and slope < 0:
        return "falling"
    return "flat"


def analyze(samples: Sequence[Sample]) -> Series:
    ordered = tuple(sorted(samples, key=lambda s: (s.date, s.value)))
    latest = ordered[-1].value if ordered else None
    if len(ordered) < MIN_SAMPLES or span_years(ordered) < MIN_SPAN_YEARS:
        return Series(ordered, "insufficient", None, latest)
    x = [decimal_year(s.date) for s in ordered]
    y = [s.value for s in ordered]
    slope = float(theilslopes(y, x).slope)
    p_value = float(kendalltau(x, y).pvalue)
    return Series(ordered, classify(p_value, slope), slope, latest)


def projection(samples: Sequence[Sample], slope: float, gap_years: float) -> float:
    """Median of the last 3 values by date, plus the positive part of slope over gap_years."""
    ordered = sorted(samples, key=lambda s: (s.date, s.value))
    recent = [s.value for s in ordered[-3:]]
    return statistics.median(recent) + max(slope, 0.0) * gap_years


def watch_flag(series: Series) -> bool:
    if series.slope is None or series.latest is None:
        return False
    return (
        series.latest <= SODIUM_GUIDELINE
        and projection(series.samples, series.slope, WATCH_GAP_YEARS) > SODIUM_GUIDELINE
    )


def analyze_wells(samples: Iterable[Sample]) -> dict[str, WellTrend]:
    by_well: dict[str, dict[str, list[Sample]]] = defaultdict(
        lambda: {"SODIUM": [], "CHLORIDE": []}
    )
    for s in samples:
        by_well[s.well][s.chemical].append(s)
    result: dict[str, WellTrend] = {}
    for well, chems in by_well.items():
        na = analyze(chems["SODIUM"])
        sodium = SodiumSeries(na.samples, na.trend, na.slope, na.latest, watch_flag(na))
        result[well] = WellTrend(sodium=sodium, chloride=analyze(chems["CHLORIDE"]))
    return result
