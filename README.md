# Model Jumps Demo

## What it is

A small static page that answers “which configuration should I try next?” from the configuration you use today, in four directions and with two strategies. The mathematics is standard; the contribution is the scenario-based interaction.

## Run it

From this project's directory, run:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/` in your browser. A local server is necessary because browsers block ES modules on `file://`. Python 3 supplies the server; there is no build step or project dependency. The page makes local requests only and needs no external network access. Stop the server with Ctrl+C.

## Use your own measurements

Open **Use your own measurements** and paste one configuration per line:

```text
name, effort, intelligence, USD per task, seconds
```

Effort is optional: four fields mean name, intelligence, cost, seconds. Separate fields with tabs or commas. Use a dot decimal separator; tab-separated lines also accept comma decimals. Names cannot contain commas or tabs. Blank lines and lines starting with `#` are ignored.

Apply at least three usable rows, then choose your current configuration from the selector. Missing or non-finite measurements, empty names and seconds not greater than zero cause a row to be skipped. The result reports used and skipped rows. Too few usable rows leave the active dataset unchanged.

Nothing leaves the browser and nothing is stored. Reloading loses your measurements. **Restore synthetic example** clears the pasted data and returns to the starting configuration and Conservative strategy.

## The four directions and the two strategies

In order, the directions are **More capable**, **More capable, no slower**, **Cheaper**, and **Cheaper, no slower**. Upgrades require strictly higher intelligence; savings require strictly lower cost. “No slower” is a hard filter: target measured time must not exceed current measured time.

Only rows with finite intelligence, finite cost and finite measured time greater than zero are eligible. The current configuration is excluded. A direction may have no candidate, and the same target may win several directions.

**Conservative upgrades:** if any higher-intelligence candidate costs no more than the current configuration, choose highest intelligence, then lowest cost. Otherwise choose lowest cost, then highest intelligence.

**Conservative savings:** if any cheaper candidate preserves or improves intelligence, choose lowest cost, then highest intelligence. Otherwise choose highest intelligence, then lowest cost.

**Best value:** direct improvements always win over a better ratio, using the corresponding Conservative ordering. A direct upgrade costs no more; a direct saving preserves or improves intelligence. Otherwise compare:

- Upgrade value: `(target cost − current cost) / (target intelligence − current intelligence)`, minimised.
- Saving value: `(current cost − target cost) / (current intelligence − target intelligence)`, maximised.

No division happens when the intelligence difference is zero. Remaining ties use shorter measured time, then stable model ID in ascending lexicographic order. Each effort level is a separate configuration.

Select a target name to explore its next four jumps. This changes the page's current configuration, not any actual model.

## Data

The bundled rows are synthetic and invented. No real model names or vendor measurements appear in that dataset. Artificial Analysis measurements are not redistributed, and the demo needs no such data to run. Independent project; not affiliated with or endorsed by Artificial Analysis.

## Checks

From the project directory, run the pure-logic tests with Node.js:

```sh
node --test
```

For rendered checks, supply your own Playwright module and optionally an installed Chromium executable:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright PLAYWRIGHT_EXECUTABLE=/path/to/chromium node checks/browser.js
```

Playwright is supplied by the reader and is not a project dependency. Omit `PLAYWRIGHT_EXECUTABLE` to use Playwright's configured default browser; omit `PLAYWRIGHT_MODULE` if `playwright` is already resolvable. The check starts a temporary loopback server, checks mobile and desktop views, writes both files under `screenshots/`, and closes the browser and server. It does not install a browser.

## Limits

- Intelligence-index differences do not guarantee better performance on a particular task.
- Small score differences may be noise.
- API cost is not subscription-credit consumption.
- Measured time is not a latency guarantee.
- Best value can recommend a large jump.
- Reasoning efforts need separate measurements to support separate performance claims.

## What this deliberately does not do

No backend application, accounts, telemetry, automatic routing or model API calls. The local server only serves static files. A recommended jump is not a claim of improvement for any particular task. Own-data input supports plain rows, not quoted CSV, file imports or spreadsheet uploads.

## Licence

MIT. See [LICENSE](LICENSE).

Copyright (c) 2026 Jaime Gonzalez Vallejo.
