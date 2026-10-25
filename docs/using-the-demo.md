# Using the demo

## Run it locally

From the project root, start a temporary local server:

```sh
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/` in your browser. A server is needed because browsers block the page's ES modules on `file://`. Python 3 supplies the server. There is no build step or project dependency. The page makes local requests only and does not need external network access. Stop the server with Ctrl+C.

## Explore the bundled example

The page starts with a synthetic current configuration. The rows are invented and contain no real model names or vendor measurements. Each reasoning effort is a separate configuration.

The directions appear in this order: More capable, More capable, no slower, Cheaper, and Cheaper, no slower. Upgrades require strictly higher intelligence. Savings require strictly lower cost. A no-slower direction excludes any target whose measured time exceeds the current time. Only rows with finite intelligence, finite cost and finite measured time greater than zero are eligible. The current configuration cannot be a target. A direction can have no candidate, and one target can win several directions.

Conservative upgrades first choose the highest intelligence among candidates that cost no more, then the lowest cost. If none exists, they choose the lowest cost, then the highest intelligence. Conservative savings first choose the lowest cost among candidates that preserve or improve intelligence, then the highest intelligence. If none exists, they choose the highest intelligence, then the lowest cost.

Best value gives direct improvements priority over ratios, using the corresponding Conservative ordering. Direct upgrades have higher intelligence at no extra cost and rank by intelligence, then cost. Direct savings have lower cost with no loss of intelligence and rank by cost, then intelligence. Otherwise, upgrade value is `(target cost − current cost) / (target intelligence − current intelligence)`, minimised. Saving value is `(current cost − target cost) / (current intelligence − target intelligence)`, maximised. Zero intelligence differences never enter a ratio. Remaining ties use shorter measured time, then the model ID in ascending lexicographic order.

Selecting a target changes the page's current configuration and recalculates the four directions. It does not switch any real model.

## Use your own measurements

Open **Use your own measurements** and paste one configuration per line:

```text
name, effort, intelligence, USD per task, seconds
```

Effort is optional. Four fields mean name, intelligence, cost and seconds. Separate fields with commas or tabs. Use a dot decimal separator; tab-separated lines also accept comma decimals. Names cannot contain commas or tabs. Blank lines and lines whose trimmed content starts with `#` are ignored.

Apply at least three usable rows, then choose the current configuration from the selector. Empty names, missing or non-finite measurements, and seconds that are not greater than zero make a row unusable. The result reports used and skipped rows. Fewer than three usable rows leave the active dataset unchanged.

Nothing leaves the browser and nothing is stored. Your measurements remain in the current browser tab and disappear when you reload. **Restore synthetic example** clears the pasted data and returns to the starting configuration and Conservative strategy.

## Checks

From the project root, run the pure-logic tests with Node.js:

```sh
node --test
```

For rendered checks, provide your own Playwright module and optionally an installed Chromium executable:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright PLAYWRIGHT_EXECUTABLE=/path/to/chromium node checks/browser.js
```

Playwright is supplied by the reader and is not a project dependency. Omit `PLAYWRIGHT_EXECUTABLE` to use Playwright's configured browser. Omit `PLAYWRIGHT_MODULE` if `playwright` is already resolvable. The check starts a temporary loopback server, checks mobile and desktop views, writes both screenshots under `screenshots/`, and closes the browser and server. It does not install a browser.

## Limits and scope

- An intelligence-index difference does not guarantee better performance on a particular task, and small score differences may be noise.
- API cost is not subscription-credit consumption. Measured time is not a latency guarantee.
- Best value can recommend a large jump. Reasoning efforts need separate measurements before supporting separate performance claims.
- The project has no backend, accounts, telemetry, automatic routing or model API calls. The local server only serves static files.
- Own-data input supports plain rows, not quoted CSV, file imports or spreadsheet uploads.

Recommendations require verification on your own task, scoring scale and measurement conditions. The bundled synthetic data and the own-data tool make no claim that a recommended jump will improve a particular task.

Artificial Analysis measurements are not redistributed, and the demo needs no such data to run. This is an independent project, not affiliated with or endorsed by Artificial Analysis.
