# Building Winter Water Watch in a day

Massachusetts salts its roads hard every winter. The salt doesn't go away when the snow melts. It soaks into the ground, and a lot of towns pull their drinking water from wells in that same ground. I wanted to know one thing: are the wells getting saltier, and is mine one of them?

The state already has the answer. MassDEP publishes every sodium and chloride test from public water systems through the EEA Data Lake API. About 37k sodium and 11.7k chloride results going back decades, as one giant list of rows nobody reads.

So we built Winter Water Watch. It turns those rows into a trend for every public well and puts it on a map.

## What it does

The home page is a map of all 351 towns, colored by how many of their wells are rising. There's a time-lapse that plays the share of wells over 20 mg/L of sodium, year by year. 20 mg/L is the MassDEP guideline for people on sodium-restricted diets.

Search a town and the map zooms in on it, then glides into the town page. That page tells you how many wells are over 20, how many are getting saltier, and how many are under 20 now but projected to pass it. Below that is every well, and each one opens into a chart of its own history.

There's also a checker for the MassDOT road-salt triggers. If your water's chloride is at 250 mg/L, or sodium is over 20 or 40 depending on what your doctor has you on, MassDOT has a remediation process.

Right now the numbers are: 5,672 wells, 856 rising, 108 on watch. 2,721 of the 5,379 wells with a sodium test were over 20 at their last test.

## What was hard

**The data.** It looks clean and it isn't. `Result` is sometimes "ND" or other text, so we drop anything that isn't a number. Units live in a separate field, so we check for mg/L before trusting a value. A well isn't a row ID, it's the water system ID plus the location name. And the chloride query is a substring match, so asking for chloride also gets you other chlorides.

**Deciding what "rising" means.** It's easy to draw a line through any set of points. We didn't want to call a well rising off three tests and a hunch. The rule we ended up with: at least 4 tests across at least 5 years, a Kendall tau test with p under 0.05, and a Theil-Sen slope for the direction. Theil-Sen is a slope that one weird test can't drag around. Anything that doesn't meet the bar is labeled insufficient, which is honestly most wells (2,698 of them). We'd rather say "not enough data" than guess.

**Not overselling it.** The first idea was "your well will be unsafe by 2031". The data can't back that, so we dropped it. Instead there's a watch flag: rising, under 20 now, and projected over 20 within five years. Then we backtested that rule. We trained on tests before 2016 and checked against tests from 2020 on, across 1,376 wells. Our projection's average error was 4.6 mg/L against 5.11 for "just assume nothing changes". Of 160 wells that crossed 20, the rule flagged 49 ahead of time, with 15 false alarms. Not amazing, but it's on the accuracy page, because people should see how often we're wrong.

**The map and the transitions.** Town shapes come from MassGIS, simplified into one SVG. Zooming is just animating the SVG viewBox onto a box around the town. The hard part was the jump to the town page, which felt like a hard cut after a smooth zoom. We fixed it with the View Transitions API, so the zoomed map on the home page morphs into the map on the town page. Browsers that don't support it, or people who've asked for reduced motion, just get a normal page load.

## How Kiro helped

We wrote two specs in Kiro before building: one for the data pipeline and one for the site. The useful part wasn't the code it generated, it was being forced to answer questions up front. What counts as a well. What JSON shape the site reads. What "rising" means. What the watch flag is and how we'd check it. Each task in the list pointed back at the requirements it covered and ended in a commit, so the history reads like the plan.

Steering mattered more than I expected. We put the API quirks in `data.md`, the thresholds and the "no scary countdowns" rule in `product.md`, and our stack rules in `tech.md`. After that we stopped repeating ourselves. When we found the chloride substring issue, we fixed it once in steering and the later tasks just handled it.

The pipeline went through the Kiro IDE task by task. The frontend went through Kiro Crew with Claude Code over ACP, which was better for the many small UI passes the design needed.

## What's next

- Point the pipeline at other states. Most publish the same kind of drinking water records.
- Give towns a way to use the per-well trends when planning their salt budgets.
- Property-based tests for the trend and checker rules.
- A printable town report for town meetings.

The data was always public. Now you can actually see it.
