export const DIRECTIONS = [
  'more-capable',
  'more-capable-no-slower',
  'cheaper',
  'cheaper-no-slower',
];

const labels = [
  'More capable',
  'More capable, no slower',
  'Cheaper',
  'Cheaper, no slower',
];

function eligible(model) {
  return Number.isFinite(model.intelligence)
    && Number.isFinite(model.usdPerTask)
    && Number.isFinite(model.timeSeconds)
    && model.timeSeconds > 0;
}

function tie(a, b) {
  return a.timeSeconds - b.timeSeconds
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function modelJumps(models, currentId, strategy) {
  const current = models.find(model => model.id === currentId);
  const invalidReason = !current
    ? 'The current configuration is unknown.'
    : !eligible(current)
      ? 'The current configuration has a missing or invalid required measurement.'
      : null;
  const available = models.filter(model => model.id !== currentId && eligible(model));

  return DIRECTIONS.map((direction, index) => {
    const empty = reasoning => ({
      direction, label: labels[index], targetId: null, reasoning, direct: false,
    });
    if (invalidReason) return empty(invalidReason);

    const upgrade = index < 2;
    const candidates = available.filter(model =>
      (upgrade ? model.intelligence > current.intelligence : model.usdPerTask < current.usdPerTask)
      && (!direction.endsWith('no-slower') || model.timeSeconds <= current.timeSeconds));
    if (!candidates.length) return empty('No eligible candidate satisfies this direction.');

    const directCandidates = candidates.filter(model => upgrade
      ? model.usdPerTask <= current.usdPerTask
      : model.intelligence >= current.intelligence);
    const direct = directCandidates.length > 0;
    const pool = direct ? directCandidates : candidates;
    let compare;
    let rule;

    if (direct) {
      compare = upgrade
        ? (a, b) => b.intelligence - a.intelligence || a.usdPerTask - b.usdPerTask
        : (a, b) => a.usdPerTask - b.usdPerTask || b.intelligence - a.intelligence;
      rule = upgrade
        ? 'Direct upgrade: highest intelligence, then lowest cost'
        : 'Direct saving: lowest cost, then highest intelligence';
    } else if (strategy === 'best-value') {
      const ratio = model => {
        const points = upgrade
          ? model.intelligence - current.intelligence
          : current.intelligence - model.intelligence;
        // Equal scores belong to direct savings, never to ratio comparisons.
        if (points <= 0) return 0;
        return (upgrade
          ? model.usdPerTask - current.usdPerTask
          : current.usdPerTask - model.usdPerTask) / points;
      };
      compare = upgrade
        ? (a, b) => ratio(a) - ratio(b)
        : (a, b) => ratio(b) - ratio(a);
      rule = upgrade
        ? 'Best value: minimum additional cost per intelligence point gained'
        : 'Best value: maximum cost saved per intelligence point lost';
    } else {
      compare = upgrade
        ? (a, b) => a.usdPerTask - b.usdPerTask || b.intelligence - a.intelligence
        : (a, b) => b.intelligence - a.intelligence || a.usdPerTask - b.usdPerTask;
      rule = upgrade
        ? 'Conservative upgrade: lowest cost, then highest intelligence'
        : 'Conservative saving: highest intelligence, then lowest cost';
    }

    const target = [...pool].sort((a, b) => compare(a, b) || tie(a, b))[0];
    return {
      direction,
      label: labels[index],
      targetId: target.id,
      reasoning: rule + '; ties use shorter measured time, then ascending model ID.',
      direct,
    };
  });
}

export function delta(current, target) {
  return {
    intelligence: target.intelligence - current.intelligence,
    usdPerTask: target.usdPerTask - current.usdPerTask,
    timeSeconds: target.timeSeconds - current.timeSeconds,
  };
}
