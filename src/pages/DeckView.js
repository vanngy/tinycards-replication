import { BatchProgress } from '../components/BatchProgress.js';
import { ColumnBrowser } from '../components/ColumnBrowser.js';
import { createSession } from '../logic/studySession.js';
import { exportDeckAsCsv } from '../logic/parseCsv.js';

function collectLeafNodes(nodes, acc) {
  for (const node of nodes) {
    if (node.directCards.length > 0) acc.push(node);
    if (node.children.length > 0) collectLeafNodes(node.children, acc);
  }
}

function progressSummaryHtml(mastered, inProgress, total) {
  const locked = total - mastered - inProgress;
  const pct = total > 0 ? Math.round(mastered / total * 100) : 0;
  const parts = [];
  if (mastered > 0) parts.push(`${mastered} mastered`);
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  if (locked > 0) parts.push(`${locked} locked`);
  const statsText = parts.length > 0 ? parts.join(' · ') : `${total} batch${total !== 1 ? 'es' : ''}`;
  return `
    <div class="progress-summary">
      <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
      <p class="progress-summary__stats">${pct}% &middot; ${statsText}</p>
    </div>
  `;
}

export function DeckView(state, navigate) {
  const deck = state.decks.find(d => d.id === state.routeParams.deckId);
  if (!deck) {
    navigate('home', {});
    return { html: '', bind() {} };
  }

  // ── Topic path ────────────────────────────────────────────────────────────
  if (deck.hasTopics) {
    const leaves = [];
    collectLeafNodes(deck.topicTree, leaves);
    let tMastered = 0, tInProgress = 0, tTotal = 0;
    for (const node of leaves) {
      tTotal += node.batches.length;
      tMastered += (node.progress?.batches || []).filter(b => b.status === 'mastered').length;
      tInProgress += (node.progress?.batches || []).filter(b => b.status === 'in-progress').length;
    }
    const summaryHtml = progressSummaryHtml(tMastered, tInProgress, tTotal);

    const selectedPath = state.routeParams.selectedPath || [];
    const cb = ColumnBrowser({
      topicTree: deck.topicTree,
      selectedPath,
      onSelect: newPath => navigate('deck', { deckId: deck.id, selectedPath: newPath }),
      onStudy: node => {
        state.session = createSession(node, node.progress.highestUnlockedBatch, deck.id);
        navigate('study', { deckId: deck.id });
      },
    });

    return {
      html: `
        <div class="page-deck page-deck--topics">
          <button class="back-btn">&#8592; Back</button>
          <div class="deck-header">
            <h1>${deck.title}</h1>
            <p class="deck-header__meta">${deck.cards.length} cards</p>
            <div class="deck-secondary-actions">
            <button class="btn btn--secondary te-open-btn">Edit cards</button>
            <button class="btn btn--secondary dl-csv-btn">Download CSV</button>
          </div>
          </div>
          ${summaryHtml}
          ${cb.html}
        </div>
      `,
      bind(root) {
        root.querySelector('.back-btn').addEventListener('click', () => navigate('home', {}));
        root.querySelector('.te-open-btn').addEventListener('click', () =>
          navigate('topicEditor', { deckId: deck.id })
        );
        root.querySelector('.dl-csv-btn').addEventListener('click', () => exportDeckAsCsv(deck));
        cb.bind(root);
      },
    };
  }

  // ── Flat path ─────────────────────────────────────────────────────────────
  const { highestUnlockedBatch, deckComplete } = deck.progress;
  const flatBatches = deck.progress.batches;
  const flatMastered = flatBatches.filter(b => b.status === 'mastered').length;
  const flatInProgress = flatBatches.filter(b => b.status === 'in-progress').length;
  const summaryHtml = progressSummaryHtml(flatMastered, flatInProgress, flatBatches.length);

  const bp = BatchProgress({
    batches: deck.batches,
    batchProgress: deck.progress.batches,
    highestUnlocked: highestUnlockedBatch,
    deckComplete: deckComplete || false,
    batchNames: deck.batchNames || [],
  });

  const btnHtml = deckComplete
    ? `<p class="deck-complete-msg">All batches mastered!</p>`
    : `<button class="btn btn--primary btn--full start-btn">
        ${highestUnlockedBatch === 0 ? 'Start Batch 1' : `Continue — Batch ${highestUnlockedBatch + 1}`}
       </button>`;

  return {
    html: `
      <div class="page-deck">
        <button class="back-btn">&#8592; Back</button>
        <div class="deck-header">
          <h1>${deck.title}</h1>
          <p class="deck-header__meta">${deck.cards.length} cards &middot; ${deck.batches.length} batch${deck.batches.length !== 1 ? 'es' : ''}</p>
        </div>
        ${summaryHtml}
        ${bp.html}
        ${btnHtml}
        <div class="deck-secondary-actions">
          <button class="btn btn--secondary btn--full be-open-btn">Edit batches</button>
          <button class="btn btn--secondary btn--full te-open-btn">Edit cards</button>
          <button class="btn btn--secondary btn--full dl-csv-btn">Download CSV</button>
        </div>
      </div>
    `,
    bind(root) {
      root.querySelector('.back-btn').addEventListener('click', () => navigate('home', {}));
      root.querySelector('.be-open-btn').addEventListener('click', () =>
        navigate('batchEditor', { deckId: deck.id })
      );
      root.querySelector('.te-open-btn').addEventListener('click', () =>
        navigate('topicEditor', { deckId: deck.id })
      );
      root.querySelector('.dl-csv-btn').addEventListener('click', () => exportDeckAsCsv(deck));
      const startBtn = root.querySelector('.start-btn');
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          state.session = createSession(deck, highestUnlockedBatch, deck.id);
          navigate('study', { deckId: deck.id });
        });
      }
    },
  };
}
