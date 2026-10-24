# Requirements Document

## Introduction

Winter Water Watch is a static website in `site/` that shows road-salt (sodium and chloride) results for Massachusetts public drinking water wells. The pipeline in `pipeline/` has already written every data file the site needs into `site/static/data/`. The site reads only those files, prerenders every page at build time, and makes no live API calls.

This spec covers three pages: the home page (`/`), one page per town (`/town/<slug>`), and the accuracy page (`/accuracy`). The state map page from `product.md` is out of scope, so `state.json` is not read by any page in this spec.

Facts about the data that these requirements rely on, checked against the files on disk:

- `towns.json` has 328 entries. `wells/` has 328 files, one per `towns.json` slug.
- The Town_Files hold 5,672 Wells in total, equal to the sum of `wells` in `towns.json`. 2,974 are Trended_Wells and 856 of those are rising.
- Town names contain only the letters A to Z and spaces.
- 293 Wells have no sodium samples. 3,694 Wells have no chloride samples.
- `pct_rising` is null for 6 towns. `slope` and `latest` can be null.

## Glossary

- **Site**: The SvelteKit app in `site/`, built with adapter-static, bun, Tailwind, Svelte 5 runes, and TypeScript.
- **Build**: Running `bun run build` in `site/`, which prerenders every page to static HTML.
- **Data_Files**: The JSON files in `site/static/data/` written by the pipeline, served by the Site under `/data/`.
- **Town_List**: `towns.json`, an array of `{name, slug, wells, pct_rising, pct_over_20}` sorted by name. `name` is upper case. `pct_rising` and `pct_over_20` are percentages with one decimal place, or null.
- **Town_File**: `wells/<slug>.json`, shaped `{town, wells}`, where `wells` is an array of Well. One Town_File exists per Town_List entry.
- **Well**: One entry in a Town_File: `{id, name, system, class, raw_or_finished, sodium, chloride}`. `id` is `PWSId|LocationName` and is unique across all Town_Files. `class` is `COM`, `NC`, or `NTNC`.
- **Series**: The `sodium` or `chloride` object of a Well: `{samples, trend, slope, latest}`, where `samples` is an array of `{date, value}` with `date` in `YYYY-MM-DD` form and `value` in mg/L. `trend` is `rising`, `flat`, `falling`, or `insufficient`. The sodium Series also has the boolean `watch`.
- **Backtest_Result**: `backtest.json`, shaped `{wells_tested, mae_baseline, mae_rule, crossed, caught, false_alarms}`. `mae_baseline` and `mae_rule` are median absolute errors in mg/L, or null.
- **Trended_Well**: A Well whose sodium `trend` is not `insufficient`.
- **Trend_Label**: The text the Site shows for a sodium or chloride `trend`: `rising`, `flat`, `falling`, or `not enough data` for `insufficient`.
- **Watch_Flag**: The sodium `watch` value of a Well. The pipeline sets the value to true when the latest sodium is at or under 20 mg/L and the pipeline's projection puts sodium over 20 mg/L.
- **Guideline_Line**: A dashed horizontal line at 20 mg/L, the MassDEP sodium guideline for people on sodium-restricted diets.
- **Display_Name**: A town name in Title Case: each space-separated word has an upper-case first letter and lower-case remaining letters.
- **Missing_Text**: The text `n/a`, shown in place of a null value.
- **Header**: The bar at the top of every page.
- **Footer**: The bar at the bottom of every page.
- **Home_Page**: The page at `/`.
- **Feature_Well**: The Well with `id` `4239000|NO. PLYMOUTH GP WELL` in `wells/plymouth.json`.
- **Home_Chart**: The sodium chart of the Feature_Well on the Home_Page.
- **Statewide_Line**: The one line of text on the Home_Page that states the number of Wells tracked and the share of Trended_Wells that are rising.
- **Town_Search**: The type-ahead town search box on the Home_Page.
- **Town_Page**: The page at `/town/<slug>` for one Town_List entry.
- **Well_Table**: The table of Wells on a Town_Page.
- **Well_Row**: One row of the Well_Table, for one Well.
- **Expand_Button**: The button in a Well_Row that opens and closes the Detail_Chart.
- **Sparkline**: The small sodium chart in a Well_Row.
- **Detail_Chart**: The larger chart with sodium and chloride shown under an expanded Well_Row.
- **Action_Box**: The "What to do" box on a Town_Page.
- **MassDOT_Checker**: The form in the Action_Box that tells the user whether a MassDOT remediation trigger is met.
- **Diet_Input**: The MassDOT_Checker select for a doctor-ordered sodium diet, with options `none`, `under 2,000 mg/day`, and `under 1,000 mg/day`.
- **Accuracy_Page**: The page at `/accuracy`.
- **Reduced_Motion**: The state where the browser reports `prefers-reduced-motion: reduce`.

## Requirements

### Requirement 1: Static build

**User Story:** As the maintainer, I want every page prerendered from the Data_Files, so that the Site can be hosted as plain static files with no server.

#### Acceptance Criteria

1. THE Site SHALL use SvelteKit with adapter-static, bun, Tailwind, and TypeScript, and SHALL declare component props and reactive state with Svelte 5 runes, with zero `export let` props and zero `$:` statements.
2. WHEN the Build runs, THE Build SHALL write a prerendered HTML file to the Build output for `/`, for `/accuracy`, and for `/town/<slug>` for every slug in the Town_List, so that the number of Town_Page HTML files equals the number of Town_List entries.
3. IF any page fails to prerender, including when a Data_File the page reads is missing or is not valid JSON, THEN THE Build SHALL exit with a non-zero status and print an error message that names the failing route or Data_File.
4. THE Site SHALL read data, at build time and in the browser, only from the Data_Files.
5. WHILE a page of the built Site is open in a browser, THE Site SHALL send network requests, including requests for scripts, styles, fonts, and icons, only to its own origin.
6. THE Site SHALL declare a TypeScript type for each Data_File it reads (the Town_List, the Town_File, and the Backtest_Result), with each field the Glossary or Introduction lists as nullable typed as nullable, and each field with listed values (`class`, `trend`) typed as a union of those values.
7. WHEN `bun run check` runs with TypeScript strict mode enabled, THE Site SHALL report zero type errors and exit with status 0.
8. THE Site source, excluding dependencies and generated files, SHALL contain zero uses of the `any` type, including type annotations, `as any` casts, and type arguments.
9. WHEN the Build output is served by a static file server with no server-side code, THE Site SHALL load each page listed in criterion 2 with zero network requests that return an error status or fail to complete.

### Requirement 2: Layout and visual design

**User Story:** As a resident or official, I want a dense, plain, dark page, so that I can read the numbers without decoration getting in the way.

#### Acceptance Criteria

1. THE Site SHALL render every page with a `#000` background across the full viewport and with headings and paragraph text in `#fff`.
2. THE Site SHALL render all text, including link text, input placeholder text, chart axis labels, and legend text, at a contrast ratio of at least 4.5:1 against `#000`.
3. THE Site SHALL render chart lines, chart points, the Guideline_Line, and the borders of inputs and selects at a contrast ratio of at least 3:1 against `#000`.
4. THE Site SHALL show content blocks and text labels with no background fill other than `#000`, no shadow, no rounded corners, and no border on all four sides, except on inputs, selects, buttons, and the Town_Search listbox.
5. THE Site SHALL draw every icon with Material Symbols served from the Site's own origin, hide each icon from assistive technology, and give any meaning an icon carries in text.
6. THE Header SHALL show the name `Winter Water Watch` as a link to `/` and a link with the text `Accuracy` to `/accuracy`.
7. THE Footer SHALL state that the data covers public water systems only and excludes private wells, and SHALL name MassDEP as the data source.
8. THE Site SHALL run no CSS animation, CSS transition, or scripted motion other than the single Home_Chart draw-in defined in Requirement 4.
9. WHILE the viewport is at least 360 CSS pixels wide, THE Site SHALL show each page with zero page-level horizontal scrolling, scrolling any Well_Table wider than the viewport horizontally inside its own container.
10. THE Site SHALL set the `lang` attribute of every page to `en`.
11. THE Site SHALL contain zero emoji characters in the text and attribute values of every built page.
12. WHILE an interactive element has keyboard focus, THE Site SHALL show a focus indicator at a contrast ratio of at least 3:1 against `#000`.
13. THE Site SHALL place each section heading as the first text in its section, with no subtitle or label line above the heading.

### Requirement 3: Names and number formatting

**User Story:** As a reader, I want names and numbers shown the same way everywhere, so that pages are easy to compare.

#### Acceptance Criteria

1. THE Site SHALL show every town name, whether read from the Town_List `name` or the Town_File `town`, as its Display_Name (for example, `NORTH ATTLEBOROUGH` as `North Attleborough`).
2. FOR ALL town names in the Town_List, converting to the Display_Name and then to lower case SHALL equal the original name in lower case.
3. FOR ALL town names in the Town_List, converting the Display_Name to a Display_Name again SHALL return the same Display_Name.
4. THE Site SHALL show Well `name` and `system` values exactly as given in the Town_File, with no change to letter case, spacing, or punctuation.
5. THE Site SHALL show `pct_rising`, `pct_over_20`, and every percentage the Site computes with exactly one decimal place followed directly by `%` with no space (for example, `0.0%`, `28.8%`, `100.0%`).
6. THE Site SHALL show every mg/L value read from the Data_Files (sample `value`, `latest`, `mae_baseline`, `mae_rule`) with exactly one decimal place, keeping a trailing `.0` on whole numbers (for example, `122.0`), while threshold labels and axis tick labels are outside this rule.
7. THE Site SHALL show counts (`wells`, `wells_tested`, `crossed`, `caught`, `false_alarms`, Trended_Well counts, and sample counts) as whole numbers with a comma between each group of three digits for values of 1,000 or more (for example, `856` and `5,672`).
8. IF a value to show is null, THEN THE Site SHALL show Missing_Text in place of the value, with no unit or `%` sign after it.
9. THE Site SHALL round every value shown with one decimal place to the nearest tenth, with halves rounded away from zero (for example, 6.25 as `6.3`).

### Requirement 4: Home chart

**User Story:** As a resident, I want to see one well's sodium climb over decades, so that I understand why the Site exists.

#### Acceptance Criteria

1. THE Home_Chart SHALL draw one point per sodium sample of the Feature_Well, placed at the sample `date` on the x axis and the sample `value` on the y axis, and SHALL join all points in ascending date order with one line.
2. THE Home_Chart SHALL show the Guideline_Line across the full width of the plot area, with the text `20 mg/L` next to the line.
3. THE Home_Chart SHALL show the Feature_Well `name` and `system` as its title, at least 3 four-digit year labels on the x axis with each label at January 1 of its year, and at least 3 mg/L labels on the y axis including 0, with no two axis labels overlapping.
4. WHILE Reduced_Motion is not active, WHEN the Home_Page loads, THE Home_Chart SHALL draw the sodium line in from the earliest sample to the latest sample over 1.5 seconds, then keep the complete line shown without replaying the draw-in until the Home_Page loads again.
5. WHILE Reduced_Motion is active, WHEN the Home_Page loads, THE Home_Chart SHALL show the complete sodium line at once with zero animation.
6. IF `wells/plymouth.json` is missing, the Feature_Well is absent from that file, or the Feature_Well has zero sodium samples, THEN THE Build SHALL exit with a non-zero status and an error message that contains the Feature_Well `id`.
7. WHILE the sodium line draws in, THE Home_Chart SHALL show the sample points, the Guideline_Line, the title, and the axis labels complete from the start, with only the sodium line animating.

### Requirement 5: Statewide line

**User Story:** As a resident, I want one line that sums up the state, so that I know how common rising sodium is.

#### Acceptance Criteria

1. THE Statewide_Line SHALL state the number of Wells across all Town_Files, the number of Trended_Wells, and the percentage of Trended_Wells whose sodium `trend` is `rising`, computed as the rising Trended_Wells count divided by the Trended_Wells count times 100 and formatted as Requirement 3 sets out.
2. WHEN the Build prerenders the Home_Page, THE Build SHALL compute the Statewide_Line numbers by reading the Town_File in `site/static/data/wells/` for every Town_List slug.
3. WHEN the Build prerenders the Home_Page, THE Build SHALL write the Statewide_Line, with all three numbers, into the prerendered Home_Page HTML.
4. THE Statewide_Line well count SHALL equal the sum of `wells` over all Town_List entries.
5. IF the number of Trended_Wells is 0, THEN THE Statewide_Line SHALL show Missing_Text for the percentage.
6. WHILE the Home_Page is open in a browser, THE Home_Page SHALL request zero Town_Files.
7. IF the Town_File for a Town_List slug is missing or cannot be parsed as JSON, THEN THE Build SHALL fail with an error message that contains the slug.

### Requirement 6: Town search

**User Story:** As a resident, I want to type my town's name and jump to its page, using a mouse or only the keyboard.

#### Acceptance Criteria

1. THE Town_Search SHALL be a text input with a visible label that follows the WAI-ARIA combobox pattern: the input has `role="combobox"`, `aria-expanded` set to whether the listbox is open, and `aria-controls` set to the id of a `role="listbox"` popup in which each listed town has `role="option"`.
2. WHEN the user changes the text in the Town_Search and at least one town matches, THE Town_Search SHALL open the listbox, clear the active option, and list the matching Town_List entries, where a town matches if its name contains the trimmed text (the typed text with leading and trailing spaces removed), ignoring letter case.
3. THE Town_Search SHALL show each listed town as its Display_Name.
4. THE Town_Search SHALL list matching towns whose name starts with the trimmed text, ignoring letter case, before the other matching towns, sort each group in ascending alphabetical order of name, and show only the first 8 matches in that order.
5. WHILE the trimmed text is empty, THE Town_Search SHALL keep the listbox closed.
6. WHILE the listbox is open, WHEN the user presses ArrowDown or ArrowUp, THE Town_Search SHALL move the active option to the next or previous listed option, making the first option active on ArrowDown and the last option active on ArrowUp when no option is active, and wrapping from the last option to the first and from the first to the last.
7. WHILE an option is active, THE Town_Search SHALL set `aria-activedescendant` on the input to the active option's id, set `aria-selected="true"` on the active option and on no other option, and show the active option with a visual highlight that no other option has.
8. WHILE an option is active, WHEN the user presses Enter, THE Town_Search SHALL navigate to `/town/<slug>` using the slug of the active option's Town_List entry.
9. WHILE no option is active, WHEN the user presses Enter and at least one town matches, THE Town_Search SHALL navigate to `/town/<slug>` using the slug of the first listed option.
10. WHEN the user clicks an option, THE Town_Search SHALL navigate to `/town/<slug>` using the slug of that option's Town_List entry.
11. WHILE the listbox is open, WHEN the user presses Escape, THE Town_Search SHALL close the listbox, clear the active option, and keep the typed text.
12. IF the trimmed text is non-empty and matches zero towns, THEN THE Town_Search SHALL close the listbox and show the text `No matching town` in a polite live region, and SHALL show that text at no other time.
13. WHILE no option is active, THE Town_Search SHALL leave `aria-activedescendant` unset on the input and set `aria-selected="true"` on no option.
14. IF the user presses Enter while the trimmed text is empty or matches zero towns, THEN THE Town_Search SHALL stay on the Home_Page and keep the typed text.

### Requirement 7: Town page summary

**User Story:** As a resident or official, I want the town's headline numbers at the top, so that I see the overall picture before the details.

#### Acceptance Criteria

1. WHEN the Build runs, THE Build SHALL prerender exactly one Town_Page for each Town_List entry at `/town/<slug>`, where `<slug>` is the entry's `slug` value, and zero other pages under `/town/`.
2. THE Town_Page SHALL show the town Display_Name as its only `h1` heading and set the document title to `<Display_Name> | Winter Water Watch`.
3. THE Town_Page SHALL show the `wells`, `pct_rising`, and `pct_over_20` values of the Town_List entry whose `slug` matches the page, above the Well_Table and the Action_Box, formatted as in Requirement 3, with Missing_Text for each null value.
4. THE Town_Page SHALL label `wells` as the number of Wells in the town, `pct_rising` as the share of Trended_Wells whose sodium `trend` is `rising`, and `pct_over_20` as the share of Wells with a non-null sodium `latest` whose `latest` is over 20 mg/L.
5. IF a request is for `/town/<slug>` with a slug absent from the Town_List, THEN THE Site SHALL respond with a 404 status and an error page that states the town was not found.
6. IF the Town_File for a Town_List entry is missing or is not valid JSON, THEN THE Build SHALL fail with an error message that contains the entry's `slug`.

### Requirement 8: Well table

**User Story:** As a town official, I want one row per well with its latest sodium and trend, so that I can see which wells need attention.

#### Acceptance Criteria

1. THE Well_Table SHALL show exactly one Well_Row for each Well in the Town_File, in the order the Wells appear in the Town_File.
2. THE Well_Table SHALL show the Well `name`, `system`, `class`, latest sodium (the sodium Series `latest` value), sodium Trend_Label, Watch_Flag, and Sparkline in one column each, with a column header for each column and `mg/L` stated in the latest sodium header.
3. IF the Watch_Flag of a Well is true, THEN THE Well_Row SHALL show the word `watch` in the Watch_Flag column.
4. THE Town_Page SHALL show a legend that states `COM` means community, `NC` means transient non-community, and `NTNC` means non-transient non-community; states that `watch` marks a Well whose latest sodium is at or under 20 mg/L and is projected to go over 20 mg/L; and states that the Guideline_Line marks the 20 mg/L MassDEP sodium guideline for people on sodium-restricted diets.
5. THE Site SHALL describe the future sodium of a Well only through the Trend_Label and the Watch_Flag, and SHALL show zero dates, years, or time spans at which sodium or chloride is predicted to cross a threshold.
6. IF the Watch_Flag of a Well is false, THEN THE Well_Row SHALL leave the Watch_Flag column empty.

### Requirement 9: Expanded well chart

**User Story:** As a town official, I want to open a well and see sodium and chloride together, so that I can judge the full salt picture.

#### Acceptance Criteria

1. THE Well_Row SHALL contain an Expand_Button whose accessible name contains the Well `name`, with `aria-expanded` set to `true` while the Detail_Chart is open and `false` while it is closed, and `aria-controls` set to the id of the Detail_Chart region.
2. WHEN the user clicks anywhere in a Well_Row, including on the Expand_Button, or presses Enter or Space while the Expand_Button has focus, THE Town_Page SHALL toggle the Detail_Chart of that Well_Row exactly once, opening a closed Detail_Chart and closing an open one.
3. WHEN one Detail_Chart opens or closes, THE Town_Page SHALL leave the open or closed state of every other Detail_Chart unchanged.
4. WHILE a Well_Row is open, THE Town_Page SHALL show its Detail_Chart in the table row immediately after that Well_Row, spanning every Well_Table column.
5. THE Detail_Chart SHALL plot each sodium sample and each chloride sample of the Well at its date, join each Series in date order by one line, use one shared x axis with year labels and one shared y axis with mg/L labels, and show the Guideline_Line labeled `20 mg/L`.
6. THE Detail_Chart SHALL draw the sodium line and the chloride line with two different stroke patterns, neither matching the Guideline_Line pattern, and SHALL name each Series in a text legend next to a sample of its line, so that the two Series stay distinguishable with all color removed.
7. THE Detail_Chart legend SHALL show, for each Series with at least one sample, the Series `latest` value in mg/L and its Trend_Label.
8. IF one Series of the Well has zero samples, THEN THE Detail_Chart SHALL plot the other Series only and show `no sodium data` or `no chloride data` in the legend in place of the empty Series' latest value and Trend_Label.
9. WHEN the Town_Page loads, THE Town_Page SHALL show every Detail_Chart closed.
10. WHILE a Well_Row is closed, THE Town_Page SHALL hide its Detail_Chart from view and from assistive technology.

### Requirement 10: Chart rules

**User Story:** As a reader, including one using a screen reader, I want every chart to be readable and to keep the 20 mg/L line in view.

#### Acceptance Criteria

1. THE Site SHALL render the Home_Chart, every Sparkline, and every Detail_Chart as inline SVG written in the Site source, with zero dependencies whose purpose is drawing charts.
2. THE Home_Chart, every Sparkline, and every Detail_Chart SHALL each span the y axis from 0 mg/L at the bottom to at least the larger of 20 mg/L and the largest sample value plotted in that chart across all of its Series.
3. THE Home_Chart, every Sparkline, and every Detail_Chart SHALL each span the x axis from the earliest to the latest sample date plotted in that chart, with earlier dates to the left.
4. THE Sparkline SHALL show the Guideline_Line.
5. THE Home_Chart, every Sparkline, and every Detail_Chart SHALL each have `role="img"` and an accessible name that states, for each plotted chemical, the chemical name, the sample count, the first sample date and value, and the latest sample date and value, with dates in `YYYY-MM-DD` form and values in mg/L with one decimal place.
6. IF a plotted Series has exactly one sample, THEN THE Site SHALL draw that sample as one visible point marker with no connecting line.
7. IF a Well has zero sodium samples, THEN THE Sparkline SHALL show the text `no sodium data` in place of the chart.
8. IF every sample plotted in a chart has the same date, THEN THE Site SHALL draw those samples at the horizontal center of the plot area.
9. THE Detail_Chart SHALL show year labels on the x axis and mg/L labels on the y axis.

### Requirement 11: What to do

**User Story:** As a resident, I want to know who to ask about my water, so that I can act on what I see.

#### Acceptance Criteria

1. THE Town_Page SHALL show the Action_Box below the Well_Table, with `What to do` as a heading one level below the Town_Page heading.
2. THE Action_Box SHALL tell the user to find the Well_Row for the Well that serves them and to contact the water system named in the `system` column of that Well_Row.
3. THE Action_Box SHALL contain the MassDOT_Checker, placed after the text defined in criterion 2.

### Requirement 12: MassDOT checker

**User Story:** As a resident, I want to enter my latest results and diet, so that I know whether a MassDOT remediation trigger is met.

#### Acceptance Criteria

1. THE MassDOT_Checker SHALL provide two number inputs that accept decimal values, one for latest sodium in mg/L and one for latest chloride in mg/L, and the Diet_Input, each with a visible label.
2. WHEN the Town_Page loads, THE MassDOT_Checker SHALL show the Diet_Input set to `none` and both number inputs empty.
3. WHEN the value of any MassDOT_Checker input changes, THE MassDOT_Checker SHALL update the result in a polite live region with no submit action.
4. WHILE the chloride input holds a number of at least 250 mg/L, THE MassDOT_Checker SHALL report the chloride trigger as met for every Diet_Input option.
5. WHILE the Diet_Input is `under 1,000 mg/day` and the sodium input holds a number greater than 20 mg/L, THE MassDOT_Checker SHALL report the sodium trigger as met.
6. WHILE the Diet_Input is `under 2,000 mg/day` and the sodium input holds a number greater than 40 mg/L, THE MassDOT_Checker SHALL report the sodium trigger as met.
7. WHILE the Diet_Input is `none`, THE MassDOT_Checker SHALL evaluate the chloride trigger only and ignore the sodium input.
8. WHILE at least one trigger is met, THE MassDOT_Checker SHALL state `MassDOT trigger met` and name each met trigger with its threshold: chloride 250 mg/L, sodium 20 mg/L with a diet under 1,000 mg/day, or sodium 40 mg/L with a diet under 2,000 mg/day.
9. WHILE every input needed by an applicable trigger holds a number 0 or greater and no trigger is met, THE MassDOT_Checker SHALL state `No MassDOT trigger met`.
10. IF no trigger is met and one or more inputs needed by an applicable trigger are empty, THEN THE MassDOT_Checker SHALL name each of those empty inputs and show neither `MassDOT trigger met` nor `No MassDOT trigger met`.
11. WHILE a number input holds a negative number or text that is not a number, THE MassDOT_Checker SHALL set `aria-invalid="true"` on the input, show `Enter a number 0 or greater` linked to the input by `aria-describedby`, and treat the input as empty.
12. FOR ALL valid sodium values, chloride values, and Diet_Input options, raising the sodium value or the chloride value while the other inputs stay the same SHALL keep a met result met.
13. FOR ALL valid sodium values and chloride values, moving the Diet_Input from `none` to `under 2,000 mg/day` to `under 1,000 mg/day` while both number inputs stay the same SHALL keep a met result met.
14. THE MassDOT_Checker SHALL compute the result in the browser with zero network requests carrying input values.
15. WHILE at least one trigger is met, THE MassDOT_Checker SHALL direct the user to contact the water system named in the `system` column of the Well_Row for the Well that serves the user.
16. WHILE a number input is empty or holds a number 0 or greater, THE MassDOT_Checker SHALL show no `Enter a number 0 or greater` message for that input and SHALL NOT set `aria-invalid="true"` on it.

### Requirement 13: Accuracy page

**User Story:** As a resident or official, I want to see how well our trend rule did on past data, so that I can decide how much to trust the labels.

#### Acceptance Criteria

1. THE Build SHALL prerender the Accuracy_Page with every value read from the Backtest_Result at build time, so that the prerendered HTML contains every number on the page and the browser requests zero Data_Files to show the Accuracy_Page.
2. THE Accuracy_Page SHALL state `wells_tested` as the number of Wells tested.
3. THE Accuracy_Page SHALL state the median error of carrying the last value forward (`mae_baseline`) and the median error of our rule (`mae_rule`), each in mg/L.
4. THE Accuracy_Page SHALL state crossings caught as `caught` out of `crossed`, where `caught` counts crossed Wells that our rule projected over 20 mg/L, with the caught share computed as `caught` / `crossed` × 100.
5. THE Accuracy_Page SHALL state `false_alarms` as the number of false alarms.
6. THE Accuracy_Page SHALL define each term in one clause: "last value" as the Well's last sodium sample before 2016, carried forward as the guess for its samples from 2020 on; "our rule" as the Well's sodium trend before 2016, projected forward to its samples from 2020 on; "crossed" as a Well at or under 20 mg/L at its last sample before 2016 whose average sodium from 2020 on is over 20 mg/L; "false alarm" as a Well at or under 20 mg/L at its last sample before 2016 that our rule projected over 20 mg/L but whose average sodium from 2020 on stayed at or under 20 mg/L.
7. THE Accuracy_Page SHALL show one sentence on what the numbers mean, built from the Backtest_Result values, that states whether `mae_rule` is smaller than, equal to, or larger than `mae_baseline`, compared at the one-decimal precision shown on the page, and states the caught share.
8. IF `mae_baseline` or `mae_rule` is null, THEN THE Accuracy_Page SHALL show Missing_Text for each null value and leave the error comparison out of the meaning sentence.
9. IF `crossed` is 0, THEN THE Accuracy_Page SHALL show Missing_Text for the caught share and leave the caught share out of the meaning sentence.
10. IF the meaning sentence would contain neither the error comparison nor the caught share, THEN THE Accuracy_Page SHALL omit the meaning sentence.
11. IF the Backtest_Result is absent, is not valid JSON, or lacks any of its six fields, THEN THE Build SHALL fail with an error message that names the Backtest_Result.
