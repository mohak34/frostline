import json
import re
from collections import defaultdict
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import TypedDict

from clean import Sample
from trends import SODIUM_GUIDELINE, Series, SodiumSeries, Trend, WellTrend

SLOPE_DIGITS = 3


class SamplePoint(TypedDict):
    date: str
    value: float


class ChlorideOut(TypedDict):
    samples: list[SamplePoint]
    trend: Trend
    slope: float | None
    latest: float | None


class SodiumOut(ChlorideOut):
    watch: bool


# "class" is a Python keyword, so WellOut uses the functional form.
WellOut = TypedDict(
    "WellOut",
    {
        "id": str,
        "name": str,
        "system": str,
        "class": str,
        "raw_or_finished": str,
        "sodium": SodiumOut,
        "chloride": ChlorideOut,
    },
)


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


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def percent(part: int, whole: int) -> float | None:
    return round(100 * part / whole, 1) if whole else None


def series_out(series: Series) -> ChlorideOut:
    # `+ 0.0` turns the -0.0 that theilslopes gives for constant series into 0.0.
    slope = None if series.slope is None else round(series.slope, SLOPE_DIGITS) + 0.0
    return {
        "samples": [
            {"date": s.date.isoformat(), "value": s.value} for s in series.samples
        ],
        "trend": series.trend,
        "slope": slope,
        "latest": series.latest,
    }


def sodium_out(series: SodiumSeries) -> SodiumOut:
    return {**series_out(series), "watch": series.watch}


def well_out(well: str, meta: Sample, trend: WellTrend) -> WellOut:
    return {
        "id": well,
        "name": meta.location_name,
        "system": meta.pws_name,
        "class": meta.cls,
        "raw_or_finished": meta.raw_or_finished,
        "sodium": sodium_out(trend.sodium),
        "chloride": series_out(trend.chloride),
    }


def summarize(name: str, trends: Sequence[WellTrend]) -> TownOut:
    trended = [t for t in trends if t.sodium.trend != "insufficient"]
    latest = [t.sodium.latest for t in trends if t.sodium.latest is not None]
    return {
        "name": name,
        "slug": slugify(name),
        "wells": len(trends),
        "pct_rising": percent(
            sum(t.sodium.trend == "rising" for t in trended), len(trended)
        ),
        "pct_over_20": percent(sum(v > SODIUM_GUIDELINE for v in latest), len(latest)),
    }


def worst_wells(wells: Sequence[tuple[str, WellTrend]], n: int = 5) -> list[str]:
    """Well ids ranked by sodium latest, highest first, ties on id. Wells with no latest are dropped."""
    ranked = [(t.sodium.latest, w) for w, t in wells if t.sodium.latest is not None]
    ranked.sort(key=lambda p: (-p[0], p[1]))
    return [w for _, w in ranked[:n]]


def build_towns(
    samples: Sequence[Sample], trends: Mapping[str, WellTrend]
) -> tuple[list[TownOut], dict[str, TownFile]]:
    """Returns towns sorted by name and town files keyed by slug.

    Each file lists every well of the town: ranked wells first (so wells[:5] is the
    worst 5), then wells with no sodium latest, by id.
    """
    meta: dict[str, Sample] = {}
    for s in samples:
        current = meta.get(s.well)
        if current is None or s.date >= current.date:
            meta[s.well] = s

    by_town: dict[str, list[str]] = defaultdict(list)
    for well in trends:
        by_town[meta[well].town].append(well)

    slugs: dict[str, str] = {}
    towns: list[TownOut] = []
    files: dict[str, TownFile] = {}
    for name in sorted(by_town):
        slug = slugify(name)
        # A few small systems have Town "" in the API; they have no page to go on.
        if not slug:
            continue
        if slug in slugs:
            raise ValueError(f"towns {slugs[slug]!r} and {name!r} share slug {slug!r}")
        slugs[slug] = name

        wells = by_town[name]
        pairs = [(w, trends[w]) for w in wells]
        ranked = worst_wells(pairs, n=len(pairs))
        unranked = sorted(set(wells) - set(ranked))
        towns.append(summarize(name, [t for _, t in pairs]))
        files[slug] = {
            "town": name,
            "wells": [well_out(w, meta[w], trends[w]) for w in ranked + unranked],
        }
    return towns, files


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=None, separators=(",", ":")))


def write_towns(
    data_dir: Path, towns: list[TownOut], files: dict[str, TownFile]
) -> None:
    wells_dir = data_dir / "wells"
    wells_dir.mkdir(parents=True, exist_ok=True)
    state: dict[str, StateEntry] = {
        t["slug"]: {"pct_rising": t["pct_rising"], "pct_over_20": t["pct_over_20"]}
        for t in towns
    }
    dump(data_dir / "towns.json", sorted(towns, key=lambda t: t["name"]))
    dump(data_dir / "state.json", state)
    for slug, file in files.items():
        dump(wells_dir / f"{slug}.json", file)
    for stale in wells_dir.glob("*.json"):
        if stale.stem not in files:
            stale.unlink()
