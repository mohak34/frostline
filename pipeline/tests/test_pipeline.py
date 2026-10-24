from datetime import date

from backtest import run
from clean import RawItem, Sample, to_sample
from trends import analyze, watch_flag


def raw_item(
    result: str = "24.26",
    unit: str = "24.26 MG/L",
    collected: str = "2021-06-15T00:00:00",
) -> RawItem:
    return RawItem(
        PWSId="4239000",
        PWSName="PLYMOUTH WATER DIVISION",
        Town="PLYMOUTH",
        Class="COM",
        ChemicalName="SODIUM",
        CollectedDate=collected,
        RaworFinished="R",
        Result=result,
        ResultWithUnit=unit,
        LocationName="WELL #1",
    )


def test_to_sample_keeps_numeric_mg_l_result() -> None:
    sample = to_sample(raw_item())
    assert sample is not None
    assert sample.value == 24.26
    assert sample.well == "4239000|WELL #1"
    assert sample.date == date(2021, 6, 15)


def test_to_sample_drops_non_numeric_result() -> None:
    assert to_sample(raw_item(result="ND", unit="ND MG/L")) is None


def test_to_sample_drops_unparseable_date() -> None:
    assert to_sample(raw_item(collected="not-a-date")) is None


def samples(points: list[tuple[date, float]], name: str = "WELL #1") -> list[Sample]:
    return [
        Sample(
            well=f"4239000|{name}",
            location_name=name,
            chemical="SODIUM",
            date=d,
            value=v,
            town="PLYMOUTH",
            pws_name="PLYMOUTH WATER DIVISION",
            cls="COM",
            raw_or_finished="R",
        )
        for d, v in points
    ]


def yearly(
    values: list[float], start: int = 2010, name: str = "WELL #1"
) -> list[Sample]:
    return samples([(date(start + t, 6, 1), v) for t, v in enumerate(values)], name)


def test_linear_increase_is_rising() -> None:
    series = analyze(yearly([2 * t + 10 for t in range(10)]))
    assert series.trend == "rising"
    assert series.slope is not None and abs(series.slope - 2) < 0.01


def test_alternating_values_are_flat() -> None:
    assert analyze(yearly([10, 12] * 5)).trend == "flat"


def test_three_samples_are_insufficient() -> None:
    series = analyze(yearly([10, 15, 20]))
    assert series.trend == "insufficient"
    assert series.slope is None


def test_watch_when_below_guideline_but_projected_over() -> None:
    # Latest 19, median of last 3 is 18, slope 1/yr: 18 + 5 = 23 > 20.
    assert watch_flag(analyze(yearly([t + 10 for t in range(10)])))


def test_no_watch_when_latest_already_over_guideline() -> None:
    assert not watch_flag(analyze(yearly([2 * t + 10 for t in range(10)])))


def test_backtest_counts() -> None:
    # Yearly 2009-2021: train is 2009-2015, test is 2020-2021.
    caught = yearly([10 + t for t in range(13)], 2009, "CAUGHT")
    quiet = yearly([10] * 13, 2009, "QUIET")
    short = yearly([10] * 9, 2013, "SHORT")  # 3 training samples
    out = run(caught + quiet + short)
    assert out["wells_tested"] == 2
    assert out["crossed"] == 1
    assert out["caught"] == 1
    assert out["false_alarms"] == 0
