import { BatchProgress } from '../components/BatchProgress.js';
import { ColumnBrowser } from '../components/ColumnBrowser.js';
import { createSession } from '../logic/studySession.js';
import { exportDeckAsCsv } from '../logic/parseCsv.js';

export function DeckView(state, navigate) {
  const deck = state.decks.find(d => d.id === state.routeParams.deckId);
  if (!deck) {
    navigate('home', {});
    return { html: '', bind() {} };
  }

  // ── Topic path ────────────────────────────────────────────────────────────
  if (deck.hasTopics) {
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
