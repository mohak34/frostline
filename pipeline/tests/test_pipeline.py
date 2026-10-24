from datetime import date

from clean import RawItem, to_sample


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
