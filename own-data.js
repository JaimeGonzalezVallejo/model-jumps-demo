// Plain decimal notation only; no coercion of blanks, hexadecimal or nonfinite values.
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseRows(text) {
  const models = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const tabSeparated = line.includes('\t');
    // Preserve leading empty fields instead of trimming away a missing tab-separated name.
    const fields = raw.split(tabSeparated ? '\t' : ',').map(field => field.trim());
    if (fields.length !== 4 && fields.length !== 5) {
      skipped++;
      continue;
    }
    const label = fields[0];
    const effort = fields.length === 5 ? fields[1] : '';
    const numbers = fields.slice(fields.length - 3).map(field => {
      const value = tabSeparated ? field.replace(',', '.') : field;
      return decimal.test(value) ? Number(value) : NaN;
    });
    if (!label || /[,\t]/.test(label) || !numbers.every(Number.isFinite) || numbers[2] <= 0) {
      skipped++;
      continue;
    }
    models.push({
      id: 'user-' + (models.length + 1), label, effort,
      intelligence: numbers[0], usdPerTask: numbers[1], timeSeconds: numbers[2],
    });
  }
  return { models, skipped };
}
