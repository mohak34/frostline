# Building Frostline in a day

Massachusetts salts its roads hard every winter. The salt doesn't go away when the snow melts. It soaks into the ground, and a lot of towns pull their drinking water from wells in that same ground. I wanted to know one thing: are the wells getting saltier, and is mine one of them?

The state already has the answer. MassDEP publishes every sodium and chloride test from public water systems through the EEA Data Lake API. About 37k sodium and 11.7k chloride results going back decades, as one giant list of rows nobody reads.

So we built Frostline. It turns those rows into a trend for every public well and puts it on a map.

## What it does

The home page asks the question straight: is your well water getting saltier? Next to it is a map of all 351 towns. When it scrolls into view it plays back the years, each town shaded by the share of its wells over 20 mg/L of sodium. 20 mg/L is the MassDEP guideline for people on sodium-restricted diets. Hover a town for its numbers, drag the slider to any year.

Search a town and the map zooms in on it, then glides into the town page. That page opens with four lines: how many wells were over 20 at their last test, how many are getting saltier, how many are under 20 now but on track to pass it, and the saltiest well in town. Next to that is a small map of the town and its neighbors, so you can hop over to the next town.

Below that is every public well, with plain labels for who drinks from it (homes, a school or workplace, a visitor site). The first well opens its chart by itself when you scroll down, so you see a real history right away. Click any other well for its own.

At the bottom is a checker for the MassDOT road-salt triggers. Pick a well or type in your own results, pick the diet your doctor has you on, and two gauges show where the water sits against the lines: chloride at 250 mg/L for anyone, sodium over 20 for a 1,000 mg/day diet or over 40 for 2,000. A line under the gauges says why you did or didn't hit a trigger. If you did, MassDOT has a remediation process.

Right now the numbers are: 5,672 wells, 856 rising, 108 on watch. 2,721 of the 5,379 wells with a sodium test were over 20 at their last test.

## What was hard

**The data.** It looks clean and it isn't. `Result` is sometimes "ND" or other text, so we drop anything that isn't a number. Units live in a separate field, so we check for mg/L before trusting a value. A well isn't a row ID, it's the water system ID plus the location name. And the chloride query is a substring match, so asking for chloride also gets you other chlorides.

**Deciding what "rising" means.** It's easy to draw a line through any set of points. We didn't want to call a well rising off three tests and a hunch. The rule we ended up with: at least 4 tests across at least 5 years, a Kendall tau test with p under 0.05, and a Theil-Sen slope for the direction. Theil-Sen is a slope that one weird test can't drag around. Anything that doesn't meet the bar is labeled insufficient, which is honestly most wells (2,698 of them). We'd rather say "not enough data" than guess.

**Not overselling it.** The first idea was "your well will be unsafe by 2031". The data can't back that, so we dropped it. Instead there's a watch flag: rising, under 20 now, and projected over 20 within five years. Then we backtested that rule. We trained on tests before 2016 and checked against tests from 2020 on, across 1,376 wells. Our projection's average error was 4.6 mg/L against 5.11 for "just assume nothing changes". Of 160 wells that crossed 20, the rule flagged 49 ahead of time, with 15 false alarms. Not amazing, but it's on the accuracy page, because people should see how often we're wrong.

**The map and the transitions.** Town shapes come from MassGIS, simplified into one SVG. Zooming is just animating the SVG viewBox onto a box around the town. The hard part was the jump to the town page, which felt like a hard cut after a smooth zoom. We fixed it with the View Transitions API, so the zoomed map on the home page morphs into the map on the town page. Browsers that don't support it, or people who've asked for reduced motion, just get a normal page load.

## How Kiro helped

We wrote two specs in Kiro before building: one for the data pipeline and one for the site. The useful part wasn't the code it generated, it was being forced to answer questions up front. What counts as a well. What JSON shape the site reads. What "rising" means. What the watch flag is and how we'd check it. Each task in the list pointed back at the requirements it covered and ended in a commit, so the history reads like the plan.

Both task lists ran in Kiro's spec mode on autopilot, one session, 56 runs from scaffolding to the accuracy page.

Steering mattered more than I expected. We put the API quirks in `data.md`, the thresholds and the "no scary countdowns" rule in `product.md`, and our stack rules in `tech.md`. After that we stopped repeating ourselves. When we found the chloride substring issue, we fixed it once in steering and the later tasks just handled it.

The visual redesign after that went through Claude Code, working from the same specs and steering, which was better for the many small UI passes the design needed.

At the end we pointed Kiro CLI at the finished code, headless, and had it add two agent hooks (run the site tests when a lib file is saved, run pytest when a pipeline file is saved) and property-based tests for the two rules that would mislead people if they were wrong. 7 fast-check properties on the checker, like "chloride at 250 always triggers" and "raising sodium never removes a trigger". 6 hypothesis properties on the trend rule, like "a series that only goes up is never labeled falling". All 53 tests pass.

## What's next

- Point the pipeline at other states. Most publish the same kind of drinking water records.
- Give towns a way to use the per-well trends when planning their salt budgets.
- Private wells. They aren't in the state data, but people could add their own test results to the checker.
- A printable town report for town meetings.

The data was always public. Now you can actually see it, at [frostline.mohak.dev](https://frostline.mohak.dev). The code is at [github.com/mohak34/frostline](https://github.com/mohak34/frostline).
