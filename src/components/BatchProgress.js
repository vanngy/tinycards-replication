// Row of pills showing batch status: unseen / in-progress / mastered / locked.
// batchProgress = progress.batches array  ({ status, lastStudied } per batch)
export function BatchProgress({ batches, batchProgress, highestUnlocked, deckComplete, batchNames = [] }) {
  const pills = batches.map((_, i) => {
    const bp = batchProgress?.[i] || { status: 'unseen', lastStudied: null };
    const isLocked = !deckComplete && i > highestUnlocked;

    let cls = 'batch-pill';
    if      (bp.status === 'mastered')    cls += ' batch-pill--mastered';
    else if (bp.status === 'in-progress') cls += ' batch-pill--in-progress';
    else if (!isLocked)                   cls += ' batch-pill--available';
    else                                  cls += ' batch-pill--locked';

    const dateHtml = bp.lastStudied
      ? `<span class="batch-pill__date">${formatDate(bp.lastStudied)}</span>`
      : '';

    const label = batchLabel(i, batchNames);
    return `<div class="${cls}"><span>${label}</span>${dateHtml}</div>`;
  }).join('');

  return {
    html: `<div class="batch-progress">${pills}</div>`,
    bind() {},
  };
}

function batchLabel(i, names) {
  const custom = names?.[i];
  return custom ? `Batch ${i + 1}: ${custom}` : `Batch ${i + 1}`;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
