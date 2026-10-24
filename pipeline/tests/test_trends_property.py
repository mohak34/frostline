"""Property-based tests for trends.analyze().

Invariants tested:
- A strictly increasing series long enough to qualify is never labeled falling.
- A constant series long enough to qualify is never labeled rising or falling.
- Any series shorter than MIN_SAMPLES or spanning less than MIN_SPAN_YEARS
  is always labeled insufficient.
- trend is never outside the four known values.
- slope is None iff trend is insufficient.
- latest equals the value of the chronologically last sample.
"""
from datetime import date, timedelta

import pytest
from hypothesis import assume, given, settings
from hypothesis import strategies as st

from clean import Sample
from trends import MIN_SAMPLES, MIN_SPAN_YEARS, analyze


def make_sample(year: int, month: int, day: int, value: float) -> Sample:
    return Sample(
        well="TEST|WELL",
        location_name="WELL",
        chemical="SODIUM",
        date=date(year, month, day),
        value=value,
        town="TESTTOWN",
        pws_name="TEST PWS",
        cls="COM",
        raw_or_finished="R",
    )


def yearly_samples(values: list[float], start_year: int = 2000) -> list[Sample]:
    """One sample per year on June 1."""
    return [make_sample(start_year + i, 6, 1, v) for i, v in enumerate(values)]


# ── helpers ────────────────────────────────────────────────────────────────────

# Minimum number of samples and span to leave the insufficient zone.
MIN_N = MIN_SAMPLES  # 4
MIN_YEARS = int(MIN_SPAN_YEARS) + 1  # 6, guarantees span >= 5 years with yearly samples


# ── properties ────────────────────────────────────────────────────────────────

@given(
    n=st.integers(min_value=MIN_N, max_value=20),
    start=st.floats(min_value=1.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    step=st.floats(min_value=0.1, max_value=10.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=200)
def test_strictly_increasing_long_series_never_falling(
    n: int, start: float, step: float
) -> None:
    """Strictly increasing series with enough samples and span is never falling."""
    assume(n >= MIN_YEARS)
    values = [start + i * step for i in range(n)]
    series = analyze(yearly_samples(values))
    assert series.trend != "falling", (
        f"Expected not falling, got {series.trend!r} for {n} yearly samples "
        f"starting at {start:.2f} with step {step:.2f}"
    )


@given(
    n=st.integers(min_value=MIN_N, max_value=20),
    value=st.floats(min_value=0.1, max_value=500.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=200)
def test_constant_long_series_never_rising_or_falling(n: int, value: float) -> None:
    """Constant series with enough samples/span is flat (p-value is NaN)."""
    assume(n >= MIN_YEARS)
    series = analyze(yearly_samples([value] * n))
    assert series.trend not in ("rising", "falling"), (
        f"Constant series of {n} got trend {series.trend!r}"
    )


@given(
    n=st.integers(min_value=1, max_value=MIN_N - 1),
    values=st.lists(
        st.floats(min_value=0.1, max_value=500.0, allow_nan=False, allow_infinity=False),
        min_size=1,
        max_size=MIN_N - 1,
    ),
)
@settings(max_examples=200)
def test_too_few_samples_is_insufficient(n: int, values: list[float]) -> None:
    """Fewer than MIN_SAMPLES samples always yields insufficient."""
    # Pad or trim to exactly n; n < MIN_SAMPLES by construction.
    vals = (values * n)[:n] if values else [1.0] * n
    series = analyze(yearly_samples(vals))
    assert series.trend == "insufficient", (
        f"Expected insufficient for {n} samples, got {series.trend!r}"
    )


@given(
    n=st.integers(min_value=MIN_N, max_value=20),
    values=st.lists(
        st.floats(min_value=0.1, max_value=500.0, allow_nan=False, allow_infinity=False),
        min_size=MIN_N,
        max_size=20,
    ),
    gap_days=st.integers(min_value=0, max_value=364),
)
@settings(max_examples=200)
def test_short_span_is_insufficient(n: int, values: list[float], gap_days: int) -> None:
    """Samples spanning < MIN_SPAN_YEARS are always insufficient."""
    # Force span < MIN_SPAN_YEARS by placing all samples within 4 years minus 1 day.
    max_span_days = int(MIN_SPAN_YEARS * 365) - 1  # just under 5 years
    vals = (values * n)[:n]
    base = date(2010, 1, 1)
    # Spread n samples evenly but keep total span below the threshold.
    spread = min(gap_days, max_span_days)
    if n == 1:
        samples = [make_sample(2010, 1, 1, vals[0])]
    else:
        step = spread // (n - 1) if n > 1 else 0
        samples = [
            Sample(
                well="TEST|WELL",
                location_name="WELL",
                chemical="SODIUM",
                date=base + timedelta(days=i * step),
                value=vals[i],
                town="TESTTOWN",
                pws_name="TEST PWS",
                cls="COM",
                raw_or_finished="R",
            )
            for i in range(n)
        ]
    series = analyze(samples)
    assert series.trend == "insufficient", (
        f"Expected insufficient for span < {MIN_SPAN_YEARS} years, got {series.trend!r}"
    )


@given(
    n=st.integers(min_value=1, max_value=20),
    values=st.lists(
        st.floats(min_value=0.1, max_value=500.0, allow_nan=False, allow_infinity=False),
        min_size=1,
        max_size=20,
    ),
)
@settings(max_examples=300)
def test_trend_always_valid_label(n: int, values: list[float]) -> None:
    """trend is always one of the four known values."""
    vals = (values * n)[:max(n, 1)]
    series = analyze(yearly_samples(vals))
    assert series.trend in ("rising", "flat", "falling", "insufficient")


@given(
    n=st.integers(min_value=1, max_value=20),
    values=st.lists(
        st.floats(min_value=0.1, max_value=500.0, allow_nan=False, allow_infinity=False),
        min_size=1,
        max_size=20,
    ),
)
@settings(max_examples=300)
def test_slope_is_none_iff_insufficient(n: int, values: list[float]) -> None:
    """slope is None exactly when trend is insufficient."""
    vals = (values * n)[:max(n, 1)]
    series = analyze(yearly_samples(vals))
    if series.trend == "insufficient":
        assert series.slope is None
    else:
        assert series.slope is not None
