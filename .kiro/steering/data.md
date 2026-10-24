# Data

## Source

MassDEP drinking water results via the EEA Data Lake API. No auth.

```
https://eeaonline.eea.state.ma.us/EEA/DataLake/V1.0/DataLakeAPI/drinkingWater?ChemicalName=SODIUM&_start=0&_end=5000
```

## Response and paging

- Shape: `{"Items": [...], "TotalCount": n}`.
- Page with `_start` / `_end` in steps of 5000 until `TotalCount` is reached.

## Chemicals

- `SODIUM`: ~37k numeric results.
- `CHLORIDE`: ~11.7k numeric; the filter is a substring match and also returns other chlorides, which clean.py drops.

## Item fields used

- `PWSId`, `PWSName`, `Town`
- `Class`: `COM` / `NC` / `NTNC`
- `ChemicalName`, `CollectedDate`
- `RaworFinished`: `R` = raw, `F` = finished
- `Result`, `LocationName`

## Rules

- A well is identified by `PWSId` + `LocationName`.
- `Result` can be non-numeric. Drop those.
- Confirm the unit is mg/L before trusting values.
