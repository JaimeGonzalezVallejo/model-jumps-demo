import { models } from './models.js';
import { modelJumps, delta } from './selection.js';
import { parseRows } from './own-data.js';
import { formatNumber } from './format.js';

let workingModels = models;
let ownData = false;
let currentId = 'synthetic-b-medium';
let strategy = 'conservative';
const currentBlock = document.querySelector('#current');
const directions = document.querySelector('#directions');
const heading = document.querySelector('#current-heading');
const input = document.querySelector('#measurements-input');
const currentRow = document.querySelector('#current-row');
const resultLine = document.querySelector('#data-result');
const identity = model => model.label + (model.effort ? ' (' + model.effort + ' effort)' : '');

// All text, including user names and effort, enters the DOM as text, never HTML.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function modelName(node, model) {
  node.append(document.createTextNode(model.label));
  if (model.effort) node.append(document.createTextNode(' '), element('span', 'effort', model.effort + ' effort'));
  return node;
}

function measurements(model) {
  const list = element('dl', 'measurements');
  for (const [label, value] of [
    ['Intelligence', formatNumber(model.intelligence, 'intelligence')],
    ['API cost per task', formatNumber(model.usdPerTask, 'cost') + ' USD'],
    ['Measured time', formatNumber(model.timeSeconds, 'time') + ' s'],
  ]) {
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', value));
    list.append(row);
  }
  return list;
}

const signed = (value, kind) => {
  const formatted = formatNumber(value, kind);
  return Number(formatted) > 0 ? '+' + formatted : formatted;
};
function change(label, value, unit, kind, higherIsBetter) {
  const displayed = Number(formatNumber(value, kind));
  const tone = displayed === 0 ? '' : (displayed > 0) === higherIsBetter ? 'gain' : 'loss';
  const row = element('div');
  row.append(element('dt', '', label),
    element('dd', tone, signed(value, kind) + (unit ? ' ' + unit : '')));
  return row;
}

function render() {
  const current = workingModels.find(model => model.id === currentId);
  currentBlock.dataset.currentId = currentId;
  currentBlock.replaceChildren(modelName(element('p', 'current-name'), current), measurements(current));
  currentRow.value = ownData ? currentId : '';
  const cards = modelJumps(workingModels, currentId, strategy).map(result => {
    const target = workingModels.find(model => model.id === result.targetId);
    const card = element('article', 'direction');
    card.dataset.direction = result.direction;
    card.append(element('h2', '', result.label));
    if (!target) {
      card.append(element('p', 'empty', 'No candidate'), element('p', 'reasoning', result.reasoning));
      return card;
    }
    const button = modelName(element('button', 'target'), target);
    button.type = 'button';
    button.dataset.target = target.id;
    button.setAttribute('aria-label', 'Explore ' + identity(target));
    const differences = delta(current, target);
    const changes = element('dl', 'deltas');
    changes.append(
      change('Intelligence', differences.intelligence, '', 'intelligence', true),
      change('API cost per task', differences.usdPerTask, 'USD', 'cost', false),
      change('Measured time', differences.timeSeconds, 's', 'time', false),
    );
    const details = element('details');
    details.append(element('summary', '', 'Measurements and reasoning'), measurements(target),
      element('p', 'reasoning', result.reasoning));
    card.append(button, changes, details);
    return card;
  });
  directions.replaceChildren(...cards);
  const notice = document.querySelector('.notice');
  if (ownData) {
    notice.replaceChildren(element('strong', '', 'Your measurements.'),
      document.createTextNode(' Nothing leaves your browser. No storage, cookies or uploads.'));
  } else {
    notice.replaceChildren(element('strong', '', 'Synthetic data.'),
      document.createTextNode(' All numbers are invented. These model names are not real.'));
  }
  document.querySelector('.closing').textContent = ownData
    ? 'Your measurements stay in this browser tab. No API calls; selecting a model only explores the demo.'
    : 'Synthetic data only. No API calls; selecting a model only explores the demo.';
}

document.querySelectorAll('[data-strategy]').forEach(button => {
  button.addEventListener('click', () => {
    strategy = button.dataset.strategy;
    document.querySelectorAll('[data-strategy]').forEach(control =>
      control.setAttribute('aria-pressed', String(control === button)));
    render();
  });
});

directions.addEventListener('click', event => {
  const button = event.target.closest('[data-target]');
  if (!button) return;
  currentId = button.dataset.target;
  render();
  heading.focus();
});

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = input.scrollHeight + 2 + 'px';
}
input.addEventListener('input', resizeInput);
document.querySelector('.own-data').addEventListener('toggle', event => {
  if (event.currentTarget.open) resizeInput();
});

document.querySelector('#apply-data').addEventListener('click', () => {
  const parsed = parseRows(input.value);
  const counts = parsed.models.length + ' rows used, ' + parsed.skipped + ' skipped.';
  if (parsed.models.length < 3) {
    resultLine.textContent = 'At least three usable rows are required; the current dataset is unchanged. '
      + parsed.models.length + ' usable rows, ' + parsed.skipped + ' skipped.';
    return;
  }
  workingModels = parsed.models;
  ownData = true;
  currentId = workingModels[0].id;
  currentRow.replaceChildren(...workingModels.map(model => {
    const option = element('option', '', identity(model));
    option.value = model.id;
    return option;
  }));
  currentRow.disabled = false;
  resultLine.textContent = counts;
  render();
});

currentRow.addEventListener('change', () => {
  currentId = currentRow.value;
  render();
});

document.querySelector('#restore-example').addEventListener('click', () => {
  workingModels = models;
  ownData = false;
  currentId = 'synthetic-b-medium';
  strategy = 'conservative';
  document.querySelectorAll('[data-strategy]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.strategy === strategy)));
  currentRow.replaceChildren(element('option', '', 'Apply at least three usable rows first'));
  currentRow.disabled = true;
  input.value = '';
  resizeInput();
  resultLine.textContent = 'Synthetic example restored.';
  render();
});
render();
