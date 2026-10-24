import calendar
import math
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from typing import Literal, TypedDict

Chemical = Literal["SODIUM", "CHLORIDE"]


# The subset of Data Lake API item fields the pipeline reads. All are JSON strings.
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
    well: str
    location_name: str
    chemical: Chemical
    date: date
    value: float
    town: str
    pws_name: str
    cls: str
    raw_or_finished: str


def parse_value(item: RawItem) -> float | None:
    """Returns the result in mg/L, or None if it is non-numeric, non-finite, or in another unit."""
    if item["ResultWithUnit"].rsplit(" ", 1)[-1].lower() != "mg/l":
        return None
    try:
        value = float(item["Result"])
    except ValueError:
        return None
    return value if math.isfinite(value) else None


def parse_date(raw: str) -> date | None:
    """Parses `YYYY-MM-DDTHH:MM:SS` (time ignored), or None if malformed."""
    try:
        return date.fromisoformat(raw.split("T", 1)[0])
    except ValueError:
        return None


def parse_chemical(raw: str) -> Chemical:
    match raw:
        case "SODIUM" | "CHLORIDE":
            return raw
        case _:
            raise ValueError(f"unexpected ChemicalName {raw!r}")


def to_sample(item: RawItem) -> Sample | None:
    """Returns None for items that should be dropped. Missing keys raise KeyError."""
    value = parse_value(item)
    collected = parse_date(item["CollectedDate"])
    if value is None or collected is None:
        return None
    return Sample(
        well=f"{item['PWSId']}|{item['LocationName']}",
        location_name=item["LocationName"],
        chemical=parse_chemical(item["ChemicalName"]),
        date=collected,
        value=value,
        town=item["Town"],
        pws_name=item["PWSName"],
        cls=item["Class"],
        raw_or_finished=item["RaworFinished"],
    )


def clean(items: Iterable[RawItem]) -> list[Sample]:
    return [s for item in items if (s := to_sample(item)) is not None]


def decimal_year(d: date) -> float:
    days = 366 if calendar.isleap(d.year) else 365
    return d.year + (d.toordinal() - date(d.year, 1, 1).toordinal()) / days
