"""Writes site/static/data/map.json: one SVG path per Massachusetts town, from MassGIS.

Run with `uv run map.py`. Separate from build.py because town borders do not change
with the lab data. Slugs match towns.json, so the site joins the two by slug.
"""

import json
import math
import re
import sys
from pathlib import Path
from typing import TypedDict

import httpx

DATA_DIR = Path(__file__).resolve().parent.parent / "site" / "static" / "data"
URL = (
    "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/"
    "Census2020_Towns/MapServer/2/query"
)
PARAMS = {
    "where": "1=1",
    "outFields": "TOWN20",
    "outSR": "4326",
    "maxAllowableOffset": "0.004",
    "geometryPrecision": "4",
    "returnGeometry": "true",
    "f": "geojson",
}
# MassGIS name slug -> towns.json slug.
ALIAS = {"manchester-by-the-sea": "manchester"}

# Equirectangular projection, x scaled by cos(mid latitude) so the state is not stretched.
LON0, LON1, LAT0, LAT1 = -73.51, -69.92, 41.23, 42.89
K = math.cos(math.radians(42.1))
WIDTH = 1000
SCALE = WIDTH / ((LON1 - LON0) * K)
HEIGHT = round((LAT1 - LAT0) * SCALE)

type Ring = list[list[float]]


class MapTown(TypedDict):
    s: str  # slug
    n: str  # display name
    d: str  # SVG path in the WIDTH x HEIGHT frame


class Map(TypedDict):
    w: int
    h: int
    towns: list[MapTown]


def point(c: list[float]) -> str:
    return f"{(c[0] - LON0) * K * SCALE:.1f},{(LAT1 - c[1]) * SCALE:.1f}"


def path(rings: list[Ring]) -> str:
    return "".join("M" + "L".join(point(c) for c in ring) + "Z" for ring in rings)


def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return ALIAS.get(s, s)


def to_map(geojson: dict) -> Map:
    towns: list[MapTown] = []
    for f in geojson["features"]:
        name: str = f["properties"]["TOWN20"]
        geom = f["geometry"]
        polys: list[list[Ring]] = (
            [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        )
        rings = [ring for poly in polys for ring in poly]
        towns.append({"s": slug(name), "n": name.title(), "d": path(rings)})
    towns.sort(key=lambda t: t["s"])
    return {"w": WIDTH, "h": HEIGHT, "towns": towns}


def main() -> int:
    try:
        r = httpx.get(URL, params=PARAMS, timeout=60.0)
        r.raise_for_status()
    except httpx.HTTPError as e:
        print(f"MassGIS download failed: {e}", file=sys.stderr)
        return 1
    m = to_map(r.json())
    out = DATA_DIR / "map.json"
    out.write_text(json.dumps(m, separators=(",", ":")))
    print(f"wrote {out} ({len(m['towns'])} towns, {out.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
