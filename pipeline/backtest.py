import json
import statistics
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import TypedDict

from scipy.stats import theilslopes

from clean import Sample, decimal_year
from trends import SODIUM_GUIDELINE, projection, span_years

TRAIN_END = date(2016, 1, 1)
TEST_START = date(2020, 1, 1)
MIN_TRAIN_SAMPLES = 4
MIN_TRAIN_SPAN = 6.0


@dataclass(frozen=True)
class WellCase:
    well: str
    last_train: float
    baseline: float
    rule: float
    actual: float


class BacktestOut(TypedDict):
    wells_tested: int
    mae_baseline: float | None
    mae_rule: float | None
    crossed: int
    caught: int
    false_alarms: int


def split(samples: Sequence[Sample]) -> tuple[list[Sample], list[Sample]]:
    """Train is before TRAIN_END, test on or after TEST_START, both sorted by (date, value)."""
    ordered = sorted(samples, key=lambda s: (s.date, s.value))
    train = [s for s in ordered if s.date < TRAIN_END]
    test = [s for s in ordered if s.date >= TEST_START]
    return train, test


def make_case(well: str, samples: Sequence[Sample]) -> WellCase | None:
    """Uses the well's sodium samples only. None when the well fails the inclusion rule."""
    train, test = split([s for s in samples if s.chemical == "SODIUM"])
    if len(train) < MIN_TRAIN_SAMPLES or span_years(train) < MIN_TRAIN_SPAN or not test:
        return None
    last = train[-1]
    years = [decimal_year(s.date) for s in train]
    slope = float(theilslopes([s.value for s in train], years).slope)
    gap = statistics.fmean(decimal_year(s.date) for s in test) - decimal_year(last.date)
    return WellCase(
        well=well,
        last_train=last.value,
        baseline=last.value,
        rule=projection(train, slope, gap),
        actual=statistics.fmean(s.value for s in test),
    )


def _mae(errors: list[float]) -> float | None:
    return round(statistics.median(errors), 2) if errors else None


def score(cases: Sequence[WellCase]) -> BacktestOut:
    g = SODIUM_GUIDELINE
    under = [c for c in cases if c.last_train <= g]
    crossed = [c for c in under if c.actual > g]
    return {
        "wells_tested": len(cases),
        "mae_baseline": _mae([abs(c.actual - c.baseline) for c in cases]),
        "mae_rule": _mae([abs(c.actual - c.rule) for c in cases]),
        "crossed": len(crossed),
        "caught": sum(c.rule > g for c in crossed),
        "false_alarms": sum(c.actual <= g and c.rule > g for c in under),
    }


def run(samples: Iterable[Sample]) -> BacktestOut:
    by_well: dict[str, list[Sample]] = defaultdict(list)
    for s in samples:
        if s.chemical == "SODIUM":
            by_well[s.well].append(s)
    cases = (make_case(well, ss) for well, ss in by_well.items())
    return score([c for c in cases if c is not None])


def write_backtest(data_dir: Path, out: BacktestOut) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "backtest.json").write_text(json.dumps(out, separators=(",", ":")))
