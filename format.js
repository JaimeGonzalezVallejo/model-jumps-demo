const formats = {
  intelligence: new Intl.NumberFormat('en-US', {
    useGrouping: false, minimumFractionDigits: 1, maximumFractionDigits: 2,
  }),
  cost: new Intl.NumberFormat('en-US', {
    useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 4,
  }),
  time: new Intl.NumberFormat('en-US', {
    useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 1,
  }),
};

export function formatNumber(value, kind) {
  const formatted = formats[kind].format(value);
  // Normalise both exact negative zero and negative values rounded to zero.
  return Number(formatted) === 0 ? formats[kind].format(0) : formatted;
}
