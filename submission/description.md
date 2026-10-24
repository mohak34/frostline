# Winter Water Watch

Track: Climate Tech

Massachusetts puts a lot of salt on its roads every winter. Some of it ends up in the ground, and some of that ends up in the public wells people drink from. Nobody tells you if your town's wells are getting saltier. The data exists, it's just buried.

Winter Water Watch pulls every sodium and chloride test MassDEP has published for public water systems (about 37k sodium results and 11.7k chloride results from the state's EEA Data Lake API) and turns them into a per-well trend you can actually read.

What it does:

- A state map of all 351 towns, colored by how many of their wells are getting saltier, with a time-lapse of the share of wells over the 20 mg/L sodium guideline year by year.
- Search your town and the map zooms into it. The town page shows how many wells are over 20 mg/L, how many are rising, and which ones are under 20 now but projected to pass it.
- Every well has its own chart of sodium and chloride over time.
- A checker for the MassDOT road-salt triggers (chloride 250 mg/L, sodium 20 or 40 mg/L depending on diet), so you know whether you can ask MassDOT to act.
- An accuracy page where we backtest our own projection rule instead of just asking you to trust it.

The numbers right now: 5,672 public wells, 856 rising, 108 under the guideline but heading over it. Of the 5,379 wells with a sodium test, 2,721 were over 20 mg/L at their last one.

Who it's for: people on low-sodium diets on town water, and town water and health officials deciding which wells to look at first.

How it scales: the pipeline is plain Python over a public API and the site is static JSON, so it costs nothing to run. Most states publish the same drinking water records, so the same pipeline can point at another state. Towns could also use the per-well trends when they plan their salt budgets.
