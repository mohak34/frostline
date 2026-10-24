import json
import os
from collections.abc import Callable
from pathlib import Path

import httpx

from clean import Chemical, RawItem

PAGE_SIZE = 5000
BASE_URL = (
    "https://eeaonline.eea.state.ma.us/EEA/DataLake/V1.0/DataLakeAPI/drinkingWater"
)
CHEMICALS: tuple[Chemical, ...] = ("SODIUM", "CHLORIDE")


class FetchError(Exception):
    pass


def collect_pages(
    get_page: Callable[[int, int], tuple[list[RawItem], int]],
) -> list[RawItem]:
    """Calls get_page(start, end) with start = 0, 5000, ... until len(items) >= TotalCount.

    `end` is exclusive. get_page returns (Items, TotalCount).
    """
    items: list[RawItem] = []
    start = 0
    while True:
        page, total = get_page(start, start + PAGE_SIZE)
        items.extend(page)
        if len(items) >= total:
            return items
        if not page:
            raise FetchError(f"empty page at _start={start} before TotalCount {total}")
        start = len(items)


def fetch_chemical(client: httpx.Client, chemical: Chemical) -> list[RawItem]:
    def get_page(start: int, end: int) -> tuple[list[RawItem], int]:
        response = client.get(
            BASE_URL, params={"ChemicalName": chemical, "_start": start, "_end": end}
        )
        if not response.is_success:
            raise FetchError(
                f"{chemical} page _start={start}: HTTP {response.status_code}"
            )
        body = response.json()
        return body["Items"], body["TotalCount"]

    return collect_pages(get_page)


def fetch(
    raw_dir: Path, refresh: bool, client: httpx.Client
) -> dict[Chemical, list[RawItem]]:
    """Returns all Items per Chemical, reading raw_dir/<chemical>.json unless refresh is set.

    Downloads are written to a .tmp file and renamed, so a failed download keeps the old file.
    """
    raw_dir.mkdir(parents=True, exist_ok=True)
    result: dict[Chemical, list[RawItem]] = {}
    for chemical in CHEMICALS:
        path = raw_dir / f"{chemical.lower()}.json"
        if path.exists() and not refresh:
            result[chemical] = json.loads(path.read_text())
            continue
        items = fetch_chemical(client, chemical)
        tmp = path.with_name(path.name + ".tmp")
        tmp.write_text(json.dumps(items))
        os.replace(tmp, path)
        result[chemical] = items
    return result
