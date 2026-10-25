# Frostline: Intelligent Water Monitoring and Coastal Risk Prediction

Hackachusetts 2026, Climate Tech track. Built with Kiro: specs and steering are in [`.kiro/`](.kiro), and the write-up is in [`submission/kiro.md`](submission/kiro.md).

## Problem

Massachusetts faces two major water-related threats: rising drinking-water salinity from winter road salt and coastal flooding from severe storms. UMass Amherst research on the Wachusett Reservoir shows that road salt can persist in water supplies for decades, while MassDEP data reveals that 2,721 of 5,379 tested public wells exceed the 20 mg/L sodium advisory level for people on low-sodium diets. Meanwhile, extreme coastal storms, including Boston's historic 2018 flood, highlight the need for reliable flood forecasting. Although extensive water-quality, weather, and tidal data exists, it remains difficult for residents and local officials to interpret and act upon. Frostline addresses this gap by tracking groundwater contamination trends and using machine learning to predict coastal water levels and flood risks up to 72 hours ahead, helping communities make informed decisions about drinking-water safety, road-salt management, and flood preparedness.

## Features and Functionality

Frostline is an environmental monitoring and prediction platform with two integrated modules focused on drinking-water safety and coastal flood preparedness in Massachusetts.

### 1. Water Quality Monitoring

- Interactive map of all 351 Massachusetts towns, showing historical sodium contamination trends.
- Town-level dashboards identifying wells exceeding 20 mg/L sodium, rising contamination levels, and wells at risk of future exceedance.
- Individual well profiles with historical charts, trend analysis, and projections.
- Personalized sodium and chloride safety checker based on MassDOT guidelines and dietary restrictions.
- Statistically validated trends and historical backtesting to evaluate prediction accuracy.

### 2. Coastal Flood Prediction (Harbor Pulse)

- Machine-learning-based 72-hour coastal water-level forecasts for Boston Harbor using NOAA and weather data.
- Flood probability estimates for different National Weather Service severity categories, with uncertainty ranges.
- Flood-and-freeze alerts when coastal flooding is followed by freezing temperatures.
- Interactive replay of the historic January 2018 Boston flood to demonstrate model performance.
- Transparent accuracy evaluations comparing predictions against observed water levels and baseline models.

Frostline combines interactive visualizations, historical environmental data, and predictive machine learning to help residents and local authorities monitor water contamination, anticipate coastal hazards, and make informed decisions.

## Screenshots

**Water Quality Monitoring:** share of each town's wells over 20 mg/L sodium, with a time-lapse slider and town search.

![Frostline home page with the Massachusetts town map](docs/images/frostline-map.png)

**Coastal Flood Prediction:** Harbor Pulse replaying the January 2018 nor'easter, with the model's median and 10th–90th percentile band against NWS flood stages, and the Flood + Freeze warning.

![Harbor Pulse storm replay of the January 2018 nor'easter](docs/images/harbor-pulse-replay.png)

## How we used Kiro

We used Kiro IDE's spec-driven development to build both Frostline modules efficiently. Before coding, we created structured requirements, design documents, and task lists, supported by steering files defining product rules, technology stacks, API behavior, and scientific methods. Kiro's Autopilot mode executed 56 tasks across the water-quality pipeline and website, while Supervised mode helped us validate critical modeling decisions for Harbor Pulse. We also used Kiro CLI and agent hooks to automate testing, validate data accuracy, prevent data leakage, and enforce coding standards. Property-based tests using fast-check and Hypothesis verified key safety thresholds and trend calculations, with all 53 tests passed. This workflow helped us maintain scientific accuracy, consistency, and rapid development across both modules within a tight hackathon timeline.

## Tech Stack

**Water Quality Monitoring**

- Data pipeline: Python 3.14, managed with [uv](https://docs.astral.sh/uv/); httpx for API calls, SciPy for the Mann-Kendall test and Theil-Sen slopes.
- Website: SvelteKit (Svelte 5 runes) with adapter-static, TypeScript, Tailwind CSS 4, Vite, built and run with [bun](https://bun.sh). Archivo variable font via Fontsource.
- Testing and quality: Vitest and fast-check (site), pytest and Hypothesis (pipeline), Ruff for lint and format, ty and svelte-check for type checking.

**Coastal Flood Prediction (Harbor Pulse)**

- Model: LightGBM quantile regression (10th, 50th and 90th percentile) on the storm-surge residual, with storm-hour weighting and gauge-based error correction.
- App: Streamlit, deployed at [hackachusetts2026.streamlit.app](https://hackachusetts2026.streamlit.app/).
- Data: Parquet for cached NOAA and weather history.

**Tooling:** Kiro IDE (spec-driven development, Autopilot and Supervised modes), Kiro CLI and agent hooks.

## Layout

- `pipeline/`: Python. Pulls MassDEP drinking water results, cleans them, fits a trend per well (Mann-Kendall test with a Theil-Sen slope), rolls wells up by town, and backtests the watch flag. Writes static JSON to `site/static/data/`.
- `site/`: SvelteKit static site. Reads only that JSON, so it deploys as plain files.

The generated data is committed, so you can build the site without running the pipeline. Harbor Pulse runs as a separate Streamlit app, linked from the site header.

## Run the site

Needs [bun](https://bun.sh).

```sh
cd site
bun install
bun run build      # static site in site/build
bun run preview    # serve it locally
bun run test       # unit tests
```

## Rebuild the data

Needs [uv](https://docs.astral.sh/uv/).

```sh
cd pipeline
uv sync
uv run build.py            # uses cached raw downloads in pipeline/raw if present
uv run build.py --refresh  # re-download from MassDEP
uv run map.py              # town borders from MassGIS, rarely needed
uv run pytest
```

## Datasets

- Sodium and chloride results: MassDEP drinking water results through the EEA Data Lake API, public, no key needed.
- Town borders: MassGIS.
- Thresholds: 20 mg/L sodium (MassDEP advisory for low-sodium diets), MassDOT road-salt review triggers for sodium and chloride.
- Water levels: [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/) for live observed water level and predicted tide at the Boston tide gauge (station 8443970).
- Weather: [Open-Meteo](https://open-meteo.com/) for weather forecasts (GFS) and ERA5 reanalysis history: sea-level pressure, 10 m wind and 2 m temperature.

## Research

Harbor Pulse's design draws on these studies:

- Tiggeloven et al. 2021, [Exploring deep learning capabilities for surge predictions in coastal areas](https://doi.org/10.1038/s41598-021-96674-0), *Scientific Reports*. Compared ANN, CNN, LSTM and ConvLSTM at 736 gauges, including Boston; the source of our surge-as-nowcast setup, weather features and training defaults.
- [Large-scale deep learning hourly storm surge modeling, U.S. Gulf and East Coasts](https://aquila.usm.edu/fac_pubs/21960) (University of Southern Mississippi). CNN-LSTM surge models at 28 gauges, our planned next model.
- [Computing extreme storm surges in Europe using neural networks](https://research.vu.nl/en/publications/computing-extreme-storm-surges-in-europe-using-neural-networks/) (VU Amsterdam). Density-based sample weighting for extremes, which we use to weight storm hours.
- [Implicit assimilation of sparse in situ data for storm surge forecasting](https://arxiv.org/pdf/2404.05758) (arXiv 2404.05758). Supports combining recent gauge observations with weather, as in our error-correction step.
- Wei & Nguyen 2022, [encoder-decoder RNN storm surge forecast](https://doi.org/10.3390/jmse10121980), *Journal of Marine Science and Engineering*. Direct multi-horizon surge forecasting.
