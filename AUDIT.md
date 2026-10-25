# Model jumps: rule-by-rule audit

Scope: the accepted selection engine, interface amendments and own-data panel.
Only README.md and this audit are authored in Molino 4. Code is not changed.

Evidence conventions:
- T: exact test name in `test/selection.test.js`. “S:” means both the
  `conservative: ` and `best-value: ` prefixes are exercised.
- P: exact test name in `test/own-data.test.js`.
- B: exact passing message suffix printed by `checks/browser.js`; both
  `PASS mobile: ` and `PASS desktop: ` apply unless explicitly scoped.
- A “no” records a coverage gap, not an observed implementation mismatch.
  Source locations identify the intended implementation, without pretending
  that an unexecuted assertion passed.

| Rule | Where it lives (file and function) | Proving test or check | Verified |
| --- | --- | --- | --- |
| Four directions appear in the fixed order. | `selection.js:modelJumps, DIRECTIONS`; `app.js:render` | T S: all four directions are demonstrated and every target meets constraints; B four ordered directions, one target or explicit empty line each | yes |
| Upgrades strictly raise intelligence. | `selection.js:modelJumps`, candidate filter | T S: all four directions are demonstrated and every target meets constraints | yes |
| Savings strictly lower cost. | `selection.js:modelJumps`, candidate filter | T S: all four directions are demonstrated and every target meets constraints | yes |
| No-slower means measured target time <= current time, including equality. | `selection.js:modelJumps`, candidate filter | T S: no-slower is a hard filter and equal time is eligible | yes |
| Conservative direct upgrades rank highest intelligence, then lowest cost. | `selection.js:modelJumps`, direct upgrade comparator | T S: direct upgrades rank score before cost; direct savings rank cost before score; T conservative secondary ranks resolve equal scores and equal costs | yes |
| Conservative fallback upgrades rank lowest cost, then highest intelligence. | `selection.js:modelJumps`, conservative upgrade comparator | T strategies differ on upgrade and saving tradeoffs; T conservative secondary ranks resolve equal scores and equal costs | yes |
| Conservative direct savings rank lowest cost, then highest intelligence. | `selection.js:modelJumps`, direct saving comparator | T S: direct upgrades rank score before cost; direct savings rank cost before score; T conservative secondary ranks resolve equal scores and equal costs | yes |
| Conservative fallback savings rank highest intelligence, then lowest cost. | `selection.js:modelJumps`, conservative saving comparator | T strategies differ on upgrade and saving tradeoffs; T conservative secondary ranks resolve equal scores and equal costs | yes |
| Best value prioritises direct improvements using Conservative ordering. | `selection.js:modelJumps`, direct candidate pool | T best value prioritises direct improvements over attractive tradeoff ratios; T best-value: direct upgrades rank score before cost; direct savings rank cost before score | yes |
| Upgrade value minimises additional cost divided by intelligence gained. | `selection.js:modelJumps`, ratio and upgrade comparator | T strategies differ on upgrade and saving tradeoffs; T best-value equal ratios use time then ID rather than conservative secondary ranks | yes |
| Saving value maximises cost saved divided by intelligence lost. | `selection.js:modelJumps`, ratio and saving comparator | T strategies differ on upgrade and saving tradeoffs; T best-value equal ratios use time then ID rather than conservative secondary ranks | yes |
| Equal-intelligence savings are direct; zero denominators do not enter ratio comparison. | `selection.js:modelJumps`, direct pool and points guard | T S: equal intelligence saving is direct and outputs contain no nonfinite values | yes |
| Remaining ties use shorter measured time, then ascending lexicographic model ID. | `selection.js:tie` | T S: exact metric ties resolve by time and then lexicographic ID; T best-value equal ratios use time then ID rather than conservative secondary ranks | yes |
| The current configuration is never a target. | `selection.js:modelJumps`, available filter | T S: all four directions are demonstrated and every target meets constraints | yes |
| Missing/non-finite scores or costs, missing/non-finite times, and times <= 0 are excluded. | `selection.js:eligible` | T S: missing and nonfinite measurements and nonpositive time are excluded | yes |
| Unknown current ID and empty candidate sets return four explanatory null results without throwing. | `selection.js:modelJumps`, invalidReason and empty | T S: absent current and empty directions return four explanatory null results | yes |
| An invalid current measurement returns four explanatory null results without throwing. | `selection.js:modelJumps`, invalidReason | T S: missing and nonfinite measurements and nonpositive time are excluded | yes |
| One destination may win multiple directions. | `selection.js:modelJumps` | T S: no-slower is a hard filter and equal time is eligible (repeated expected destinations) | yes |
| Signed deltas are target minus current and unrounded in the engine. | `selection.js:delta` | T delta returns signed unrounded measurement differences | yes |
| The engine does not mutate its input and repeated calls are stable. | `selection.js:modelJumps` | T engine does not mutate models and returns stable repeated results | yes |
| Ten labelled synthetic configurations include effort levels and at least two incomplete rows. | `models.js:models` | T synthetic dataset has ten labelled configurations, effort levels and missing data | yes |
| Real bundled data demonstrates recommendations in all four directions. | `models.js:models`; `selection.js:modelJumps` | T S: all four directions are demonstrated and every target meets constraints | yes |
| Initial configuration is synthetic-b-medium, with name, effort and three absolute measurements. | `app.js:initial state, render, measurements` | B starting configuration, effort, measurements and synthetic notice | yes |
| One shared selector switches strategy and exposes pressed state. | `index.html:.strategy`; `app.js:strategy handlers` | B shared strategy changes targets and pressed state | yes |
| A target changes the current plate and all four directions without reloading. | `app.js:directions click handler, render` | B target updates current plate and all directions without reload; focus restored | yes |
| Replaced target controls transfer focus to the current heading. | `app.js:directions click handler` | B target updates current plate and all directions without reload; focus restored | yes |
| Each direction has exactly one target or explicit No candidate line. | `app.js:render` | B four ordered directions, one target or explicit empty line each | yes |
| A disclosure reveals the selection reasoning. | `app.js:render`, details construction | B click disclosure reveals selection reasoning | yes |
| Base controls are keyboard reachable in document order with visible focus; disclosures open by keyboard. | `index.html:buttons, details`; `styles.css:focus rules` | B all controls reachable in document order with visible focus; keyboard disclosures work | yes |
| Own-data controls are keyboard reachable with visible focus. | `index.html:.own-data-content`; `styles.css:focus rules` | B own controls are keyboard reachable with focus; textarea expands without nested scrolling | yes |
| All interactive controls are at least 44px high. | `styles.css:button, summary, textarea, select rules` | No rendered control-height assertion exists; CSS specifies minimum heights but runtime geometry was not measured. | no |
| All text has at least 4.5:1 contrast and is at least 14px, with 16px body. | `styles.css::root, text and panel rules` | B no nested scrolling; visible text contrast at least 4.5:1 and size at least 14px covers the then-visible view, not every expanded panel state. Full-state coverage is absent. | no |
| Reduced motion removes transitions and animations. | `styles.css:prefers-reduced-motion` | Browser contexts request reduced motion, but no assertion measures computed animation/transition properties. | no |
| No nested scrolling; the textarea grows to fit input. | `styles.css:overflow rules`; `app.js:resizeInput` | B no nested scrolling; visible text contrast at least 4.5:1 and size at least 14px; B own controls are keyboard reachable with focus; textarea expands without nested scrolling | yes |
| Initial desktop view with disclosures closed fits 1280 x 800 without page scrolling. | `styles.css:desktop grid`; `index.html:closed details` | B desktop-only 1280 x 800: scrollHeight=800, innerHeight=800; no page scrolling | yes |
| No horizontal overflow at 390px and 1280px. | `styles.css:responsive layout` | B no horizontal overflow; own panel width is also asserted in B own controls are keyboard reachable with focus; textarea expands without nested scrolling | yes |
| Four desktop direction columns align targets, deltas and disclosures. | `styles.css:#directions, .direction h2` | B desktop-only targets, delta blocks and disclosures align across four columns | yes |
| Mobile reading order is title, purpose, notice, plate, strategy, hint, directions. | `index.html:main order`; `styles.css:mobile rules` | B mobile-only mobile title, purpose, notice, current plate, strategy, hint and directions in order | yes |
| Between 720px and 1023px, directions use two columns. | `styles.css:#directions, media queries` | No intermediate-width browser assertion exists; the suite only renders 390px and 1280px widths. | no |
| Four-field and five-field rows support optional/empty effort. | `own-data.js:parseRows` | P five and four fields parse with optional effort | yes |
| Tab-separated numbers accept comma decimals; comma-separated rows do not add decimal columns. | `own-data.js:parseRows` | P tab-separated spreadsheet numbers accept comma decimals; P extra delimiters, quoted comma names and comma names in tab rows are rejected | yes |
| Blank lines and trimmed # comments are ignored, not skipped. | `own-data.js:parseRows` | P blank lines and trimmed comments do not count as skipped | yes |
| Missing, nonnumeric or nonfinite measurements and nonpositive seconds skip the whole row. | `own-data.js:parseRows` | P missing, nonnumeric and nonfinite measurements skip the whole line | yes |
| Negative intelligence and cost, and zero cost, are accepted as finite; seconds must be greater than zero. | `own-data.js:parseRows` | P negative scores and costs and zero cost are finite, while seconds must be positive | yes |
| Empty/whitespace input yields an empty result without throwing. | `own-data.js:parseRows` | P empty and whitespace input never throws | yes |
| Names/effort are trimmed and empty names are skipped. | `own-data.js:parseRows` | P names and effort are trimmed and empty names are rejected | yes |
| Duplicate names remain separate, with sequential user IDs in usable-row order. | `own-data.js:parseRows` | P duplicate names are retained with sequential IDs in usable line order | yes |
| Markup-like names and effort are preserved literally as parser data. | `own-data.js:parseRows` | P markup-like names and effort are preserved as literal data | yes |
| Applying usable data replaces the working set, selects its first row, fills the selector and reports counts. | `app.js:apply-data handler` | B own panel applies three valid rows, skips one broken row and updates notice | yes |
| Own-data mode replaces the synthetic notice with a local-data notice. | `app.js:render` | B own panel applies three valid rows, skips one broken row and updates notice | yes |
| Fewer than three usable rows retain the active dataset. | `app.js:apply-data handler` | B fewer than three usable rows preserves the active dataset | yes |
| Selecting a current row recalculates immediately without a reload. | `app.js:currentRow change handler` | B choosing another own current row recalculates without reload | yes |
| Restore returns to synthetic-b-medium and Conservative, clears input and disables the user selector. | `app.js:restore-example handler` | B restore returns to the original synthetic configuration and strategy | yes |
| User names/effort are inserted as text, never HTML; onerror markup cannot execute or create image elements. | `app.js:element, modelName, render` | B hostile labels and effort render literally without elements, execution, requests or storage | yes |
| The application uses no storage or cookies. | `app.js:in-memory state and handlers` | B hostile labels and effort render literally without elements, execution, requests or storage asserts empty localStorage, sessionStorage and cookies after the workflow; source review finds no writes. | yes |
| No request leaves the static page's local origin. | `index.html:local assets`; `app.js:local imports, handlers` | B all requests local; no console errors or failed resources | yes |
| Applying/choosing own data makes no resource request or model API call. | `app.js:apply-data and current-row handlers` | B hostile labels and effort render literally without elements, execution, requests or storage asserts unchanged request count; B all requests local; no console errors or failed resources | yes |
| Display precision uses 1–2 intelligence decimals, 2–4 cost decimals, and 0–1 time decimals; negative values retain precision and rounded zero has no negative sign. | `format.js:formatNumber` | `test/format.test.js`: intelligence/cost/time: rounds to maximum decimals and trims to its minimum; intelligence/cost/time: negative values retain sign and precision; small distinct costs remain distinct and nonzero; zero and negative zero have no sign and keep the minimum decimals; rounded zero never has a negative sign while representable losses keep their precision | yes |
| A sentence beside the input says rows are comparable only with the same task or task mix, scoring scale and measurement conditions. | `index.html:.own-data-content` | B small intelligence/time changes retain precision; exact zero has no sign; comparability note present | yes |

## Boundaries and findings

No code/rule mismatch was observed in the reviewed implementation. The four
“no” rows identify missing rendered checks, not demonstrated defects. Existing
tests are evidence for their exercised cases, not a proof over arbitrary input.

The browser suite runs Chromium at 390 x 844 and 1280 x 900, with an additional
1280 x 800 initial-view check. Expanded panels may scroll. Arbitrary zoom,
physical devices, screen-reader announcements and other browser engines are
not verified here. The initial screenshots do not show expanded own-data mode.

The six README limitations are copied from `index.html:.methodology`.
The bundled measurements are invented; this audit establishes no real-world
performance, latency, cost advantage or novelty claim. No licence is granted.
