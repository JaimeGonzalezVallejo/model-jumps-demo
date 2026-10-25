import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { models } from '../models.js';
import { modelJumps } from '../selection.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const files = {
  '/': ['index.html', 'text/html'],
  '/styles.css': ['styles.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'],
  '/models.js': ['models.js', 'text/javascript'],
  '/selection.js': ['selection.js', 'text/javascript'],
  '/own-data.js': ['own-data.js', 'text/javascript'],
  '/format.js': ['format.js', 'text/javascript'],
};
const server = createServer(async (request, response) => {
  const file = files[request.url];
  if (!file) { response.writeHead(404).end('Not found'); return; }
  try {
    const content = await readFile(new URL('../' + file[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1] }).end(content);
  } catch {
    response.writeHead(500).end('Could not read local resource');
  }
});
let browser;
let step = 'initialisation';
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}/`;
  const options = { headless: true };
  if (process.env.PLAYWRIGHT_EXECUTABLE) options.executablePath = process.env.PLAYWRIGHT_EXECUTABLE;
  browser = await chromium.launch(options);
  for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push('Failed resource: ' + request.url()));
    page.on('response', response => { if (response.status() >= 400) errors.push('HTTP ' + response.status() + ': ' + response.url()); });
    await page.route('**/*', route => {
      const url = route.request().url();
      requests.push(url);
      if (!url.startsWith(origin)) {
        errors.push('Outside origin: ' + url);
        return route.abort();
      }
      return route.continue();
    });
    const pass = label => console.log(`PASS ${name}: ${label}`);
    step = name + ': loading page';
    await page.goto(origin);
    await page.locator('.target').first().waitFor();
    await page.evaluate(() => { window.demoDocument = 'same-document'; });
    step = name + ': no horizontal overflow';
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    pass('no horizontal overflow');

    step = name + ': direction structure';
    assert.deepEqual(await page.locator('.direction h2').allTextContents(),
      ['More capable', 'More capable, no slower', 'Cheaper', 'Cheaper, no slower']);
    for (const card of await page.locator('.direction').all()) {
      assert.equal(await card.locator('.target, .empty').count(), 1);
      if (await card.locator('.empty').count()) assert.equal(await card.locator('.empty').textContent(), 'No candidate');
    }
    pass('four ordered directions, one target or explicit empty line each');

    step = name + ': layout alignment and reading order';
    if (name === 'desktop') {
      for (const selector of ['.target', '.deltas', 'summary']) {
        const positions = await page.locator('.direction ' + selector).evaluateAll(nodes =>
          nodes.map(node => node.getBoundingClientRect().top));
        assert.ok(Math.max(...positions) - Math.min(...positions) <= 1,
          selector + ' y positions: ' + positions.join(', '));
      }
      pass('targets, delta blocks and disclosures align across four columns');
    } else {
      const positions = await page.evaluate(() => [
        'h1', 'header > p:not(.notice)', '.notice', '.plate', '.strategy', '.hint', '#directions',
      ].map(selector => document.querySelector(selector).getBoundingClientRect().top));
      assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]),
        'Mobile reading order: ' + positions.join(', '));
      pass('mobile title, purpose, notice, current plate, strategy, hint and directions in order');
    }

    step = name + ': starting configuration';
    assert.equal(await page.locator('#current').getAttribute('data-current-id'), 'synthetic-b-medium');
    assert.match(await page.locator('.current-name').textContent(), /Synthetic Model B\s+medium effort/);
    assert.deepEqual(await page.locator('#current dd').allTextContents(), ['55.0', '0.45 USD', '25 s']);
    assert.ok(await page.locator('.notice').isVisible());
    pass('starting configuration, effort, measurements and synthetic notice');

    step = name + ': strategy changes recommendations';
    const before = await page.locator('.target').evaluateAll(nodes => nodes.map(node => node.dataset.target));
    await page.getByRole('button', { name: 'Best value', exact: true }).click();
    const after = await page.locator('.target').evaluateAll(nodes => nodes.map(node => node.dataset.target));
    assert.notDeepEqual(after, before);
    assert.equal(await page.getByRole('button', { name: 'Best value', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Conservative', exact: true }).getAttribute('aria-pressed'), 'false');
    pass('shared strategy changes targets and pressed state');

    step = name + ': details disclosure';
    const disclosure = page.locator('.direction details').first();
    await disclosure.locator('summary').click();
    assert.equal(await disclosure.getAttribute('open'), '');
    assert.ok(await disclosure.locator('.reasoning').isVisible());
    assert.ok((await disclosure.locator('.reasoning').textContent()).length > 0);
    await disclosure.locator('summary').click();
    pass('click disclosure reveals selection reasoning');

    step = name + ': keyboard order and focus';
    const controls = page.locator('button:visible, summary:visible');
    const controlCount = await controls.count();
    await page.evaluate(() => {
      document.activeElement?.blur();
      document.body.setAttribute('tabindex', '-1');
      document.body.focus();
      document.body.removeAttribute('tabindex');
    });
    for (let index = 0; index < controlCount; index++) {
      await page.keyboard.press('Tab');
      assert.ok(await controls.nth(index).evaluate(node => node === document.activeElement), 'Tab order at control ' + index);
      assert.ok(await controls.nth(index).evaluate(node => {
        const style = getComputedStyle(node);
        return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
      }), 'Visible focus at control ' + index);
      if (await controls.nth(index).evaluate(node => node.tagName === 'SUMMARY')) {
        await page.keyboard.press('Enter');
        assert.ok(await controls.nth(index).evaluate(node => node.parentElement.open));
        await page.keyboard.press('Enter');
      }
    }
    pass('all controls reachable in document order with visible focus; keyboard disclosures work');

    step = name + ': target activation';
    const targetId = await page.locator('.target').first().getAttribute('data-target');
    const previousMarkup = await page.locator('#directions').innerHTML();
    await page.locator('.target').first().click();
    assert.equal(await page.locator('#current').getAttribute('data-current-id'), targetId);
    const target = models.find(model => model.id === targetId);
    assert.deepEqual(await page.locator('#current dd').allTextContents(),
      [target.intelligence.toFixed(1), target.usdPerTask.toFixed(2) + ' USD', target.timeSeconds + ' s']);
    assert.notEqual(await page.locator('#directions').innerHTML(), previousMarkup);
    const expected = modelJumps(models, targetId, 'best-value').map(result => result.targetId);
    assert.deepEqual(await page.locator('.direction').evaluateAll(cards =>
      cards.map(card => card.querySelector('.target')?.dataset.target ?? null)), expected);
    assert.equal(await page.evaluate(() => window.demoDocument), 'same-document');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'current-heading');
    pass('target updates current plate and all directions without reload; focus restored');

    step = name + ': accessibility and scrolling';
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return [style.overflowX, style.overflowY].some(value => ['auto', 'scroll'].includes(value));
    }).map(node => node.tagName)), []);
    const contrastFailures = await page.evaluate(() => {
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = color => rgb(color).map(value => {
        value /= 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      return [...document.querySelectorAll('body *')].filter(node => node.getClientRects().length
        && [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()))
        .flatMap(node => {
          const style = getComputedStyle(node);
          let parent = node;
          while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
          const a = luminance(style.color);
          const b = luminance(getComputedStyle(parent || document.documentElement).backgroundColor);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          return ratio >= 4.5 && parseFloat(style.fontSize) >= 14 ? [] : [node.tagName + ': contrast ' + ratio + ', size ' + style.fontSize];
        });
    });
    assert.deepEqual(contrastFailures, []);
    pass('no nested scrolling; visible text contrast at least 4.5:1 and size at least 14px');

    step = name + ': apply own measurements';
    const ownPanel = page.locator('.own-data');
    assert.equal(await ownPanel.getAttribute('open'), null);
    await ownPanel.locator('summary').click();
    const requestCount = requests.length;
    await page.getByLabel('Your measurements', { exact: true }).fill(
      'Reader A, medium, 50, 10, 10\nReader B, high, 60, 12, 20\nReader C, low, 45, 5, 5\nbroken');
    await page.getByRole('button', { name: 'Apply measurements', exact: true }).click();
    assert.equal(await page.locator('#current').getAttribute('data-current-id'), 'user-1');
    assert.equal(await page.locator('#data-result').textContent(), '3 rows used, 1 skipped.');
    assert.doesNotMatch(await page.locator('.notice').textContent(), /synthetic/i);
    assert.match(await page.locator('.notice').textContent(), /Nothing leaves your browser/);
    assert.equal(await page.locator('.direction').count(), 4);
    assert.equal(await page.locator('#current-row option').count(), 3);
    assert.ok(await page.getByRole('combobox', { name: 'Current configuration', exact: true }).isEnabled());
    pass('own panel applies three valid rows, skips one broken row and updates notice');

    step = name + ': own panel keyboard and textarea sizing';
    const ownControls = ownPanel.locator('textarea, button, select');
    await ownControls.first().focus();
    for (let index = 0; index < await ownControls.count(); index++) {
      if (index > 0) await page.keyboard.press('Tab');
      assert.ok(await ownControls.nth(index).evaluate(node => node === document.activeElement));
      assert.ok(await ownControls.nth(index).evaluate(node => {
        const style = getComputedStyle(node);
        return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      }));
    }
    assert.ok(await page.locator('#measurements-input').evaluate(node => node.scrollHeight <= node.clientHeight + 1));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    assert.deepEqual(await ownPanel.locator('*').evaluateAll(nodes => nodes.filter(node => {
      const style = getComputedStyle(node);
      return [style.overflowX, style.overflowY].some(value => ['auto', 'scroll'].includes(value));
    }).map(node => node.tagName)), []);
    pass('own controls are keyboard reachable with focus; textarea expands without nested scrolling');

    step = name + ': change own current row';
    const ownTargets = await page.locator('.direction').evaluateAll(cards =>
      cards.map(card => card.querySelector('.target')?.dataset.target ?? null));
    await page.getByRole('combobox', { name: 'Current configuration', exact: true }).selectOption('user-2');
    assert.equal(await page.locator('#current').getAttribute('data-current-id'), 'user-2');
    assert.notDeepEqual(await page.locator('.direction').evaluateAll(cards =>
      cards.map(card => card.querySelector('.target')?.dataset.target ?? null)), ownTargets);
    assert.equal(await page.evaluate(() => window.demoDocument), 'same-document');
    pass('choosing another own current row recalculates without reload');

    step = name + ': insufficient usable rows';
    await page.getByLabel('Your measurements', { exact: true }).fill('Only one,1,0,1\nbroken');
    await page.getByRole('button', { name: 'Apply measurements', exact: true }).click();
    assert.equal(await page.locator('#current').getAttribute('data-current-id'), 'user-2');
    assert.match(await page.locator('#data-result').textContent(), /At least three usable rows/);
    pass('fewer than three usable rows preserves the active dataset');

    step = name + ': literal user labels and effort';
    const hostile = '<img src=x onerror=window.pwned=1>';
    await page.getByLabel('Your measurements', { exact: true }).fill(
      hostile + ', <b>high</b>, 50, 10, 10\nReader B, high, 60, 12, 20\nReader C, low, 45, 5, 5');
    await page.getByRole('button', { name: 'Apply measurements', exact: true }).click();
    assert.ok((await page.locator('.current-name').textContent()).includes(hostile));
    assert.ok((await page.locator('.current-name').textContent()).includes('<b>high</b>'));
    await page.getByRole('button', { name: 'Conservative', exact: true }).click();
    await page.getByRole('combobox', { name: 'Current configuration', exact: true }).selectOption('user-2');
    assert.ok((await page.locator('#directions').textContent()).includes(hostile));
    assert.ok(await page.locator('.target').filter({ hasText: hostile }).first().isVisible());
    assert.equal(await page.evaluate(() => window.pwned), undefined);
    assert.equal(await page.locator('#directions img, #current img, #directions b, #current b').count(), 0);
    assert.equal(requests.length, requestCount, 'Applying data must make no resource requests');
    assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]), [0, 0, '']);
    pass('hostile labels and effort render literally without elements, execution, requests or storage');

    step = name + ': honest small-value formatting';
    await page.getByLabel('Your measurements', { exact: true }).fill(
      'Small A, medium, 50, 0.0010, 10\nSmall B, medium, 55, 0.0040, 9\nSmall C, high, 60, 0.0060, 8');
    await page.getByRole('button', { name: 'Apply measurements', exact: true }).click();
    const smallPlate = await page.locator('#current dd').nth(1).textContent();
    const smallChange = await page.locator('[data-direction="more-capable"] .deltas dd').nth(1).textContent();
    assert.equal(smallPlate, '0.001 USD');
    assert.equal(smallChange, '+0.003 USD');
    assert.ok(!(await page.locator('body').innerText()).includes('+0.00 USD'));
    pass('small-cost plate=' + smallPlate + ', More capable cost change=' + smallChange + '; no +0.00 USD');

    step = name + ': precise intelligence, time and unsigned zero changes';
    await page.getByLabel('Your measurements', { exact: true }).fill(
      'Fine A, medium, 50, 0.004, 10\nFine B, medium, 50.04, 0.004, 9.6\nFine C, low, 49, 0.001, 10');
    await page.getByRole('button', { name: 'Apply measurements', exact: true }).click();
    assert.deepEqual(await page.locator('[data-direction="more-capable"] .deltas dd').allTextContents(),
      ['+0.04', '0.00 USD', '-0.4 s']);
    await page.getByRole('combobox', { name: 'Current configuration', exact: true }).selectOption('user-2');
    assert.deepEqual(await page.locator('#current dd').allTextContents(), ['50.04', '0.004 USD', '9.6 s']);
    assert.ok((await ownPanel.innerText()).includes('Rows are comparable only when they come from the same task or task mix, the same scoring scale, and the same measurement conditions.'));
    pass('small intelligence/time changes retain precision; exact zero has no sign; comparability note present');

    step = name + ': rounded-zero changes have no directional colour';
    await page.getByLabel('Your measurements', { exact: true }).fill(
      'Tiny A, medium, 50, 0.004, 10\nTiny B, medium, 50.04, 0.004, 9.96\nTiny C, low, 49.9985, 0.001, 10.04');
    await page.getByRole('button', { name: 'Apply measurements', exact: true }).click();
    const tinyUpgrade = page.locator('[data-direction="more-capable"] .deltas dd');
    const tinySaving = page.locator('[data-direction="cheaper"] .deltas dd');
    assert.deepEqual(await tinyUpgrade.allTextContents(), ['+0.04', '0.00 USD', '0 s']);
    assert.deepEqual(await tinySaving.allTextContents(), ['0.0', '-0.003 USD', '0 s']);
    for (const value of [tinyUpgrade.nth(1), tinyUpgrade.nth(2), tinySaving.nth(0), tinySaving.nth(2)]) {
      assert.doesNotMatch((await value.getAttribute('class')) ?? '', /\b(?:gain|loss)\b/);
    }
    assert.equal(await tinyUpgrade.nth(0).getAttribute('class'), 'gain');
    assert.equal(await tinySaving.nth(1).getAttribute('class'), 'gain');
    pass('rounded-zero changes carry no gain/loss class; nonzero gains retain colour');

    step = name + ': restore synthetic example';
    await page.getByRole('button', { name: 'Restore synthetic example', exact: true }).click();
    assert.equal(await page.locator('#current').getAttribute('data-current-id'), 'synthetic-b-medium');
    assert.match(await page.locator('.notice').textContent(), /Synthetic data/);
    assert.equal(await page.getByRole('button', { name: 'Conservative', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.ok(await page.getByRole('combobox', { name: 'Current configuration', exact: true }).isDisabled());
    assert.equal(await page.getByLabel('Your measurements', { exact: true }).inputValue(), '');
    await ownPanel.locator('summary').click();
    pass('restore returns to the original synthetic configuration and strategy');

    if (name === 'desktop') {
      step = 'desktop: one-screen layout at 1280 x 800';
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(origin);
      await page.locator('.target').first().waitFor();
      const dimensions = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert.ok(dimensions.scrollHeight <= dimensions.innerHeight + 1, JSON.stringify(dimensions));
      assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, JSON.stringify(dimensions));
      assert.ok(await page.locator('.methodology summary').isVisible());
      pass('1280 x 800: scrollHeight=' + dimensions.scrollHeight + ', innerHeight=' + dimensions.innerHeight + '; no page scrolling');
      await page.setViewportSize({ width, height });
    }

    step = name + ': screenshot';
    // Capture the initial view rather than leaving the screenshot at a different configuration.
    await page.goto(origin);
    await page.locator('.target').first().waitFor();
    await page.screenshot({ path: new URL('../screenshots/' + name + '.png', import.meta.url).pathname, fullPage: true });
    pass('screenshots/' + name + '.png captured');
    step = name + ': local requests and errors';
    assert.ok(requests.length > 0);
    assert.ok(requests.every(url => url.startsWith(origin)));
    assert.deepEqual(errors, []);
    pass('all requests local; no console errors or failed resources');
    await context.close();
  }
} catch (error) {
  console.error(`FAIL ${step}: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
