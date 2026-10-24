import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

import httpx

import backtest
import clean
import fetch
import towns
import trends

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "raw"
DATA_DIR = ROOT.parent / "site" / "static" / "data"


def parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the static JSON for the site from MassDEP results."
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="re-download raw results even when cached files exist",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        with httpx.Client(timeout=60.0) as client:
            raw = fetch.fetch(RAW_DIR, args.refresh, client)
    except fetch.FetchError as e:
        print(f"fetch failed: {e}", file=sys.stderr)
        return 1
    items = [item for chem_items in raw.values() for item in chem_items]
    per_chem = ", ".join(f"{c.lower()} {len(v)}" for c, v in raw.items())
    print(f"fetch: {len(items)} items ({per_chem})")

    samples = clean.clean(items)
    print(f"clean: {len(samples)} samples kept, {len(items) - len(samples)} dropped")

    well_trends = trends.analyze_wells(samples)
    rising = sum(t.sodium.trend == "rising" for t in well_trends.values())
    print(f"trends: {len(well_trends)} wells, {rising} sodium rising")

    town_list, files = towns.build_towns(samples, well_trends)
    towns.write_towns(DATA_DIR, town_list, files)
    placed = sum(t["wells"] for t in town_list)
    print(
        f"towns: {len(town_list)} towns, {placed} wells,"
        f" {len(well_trends) - placed} dropped (no town)"
    )

    result = backtest.run(samples)
    backtest.write_backtest(DATA_DIR, result)
    print(
        f"backtest: {result['wells_tested']} wells tested,"
        f" {len(well_trends) - result['wells_tested']} excluded"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
