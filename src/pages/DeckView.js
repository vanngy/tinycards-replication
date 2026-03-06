import { BatchProgress } from '../components/BatchProgress.js';
import { ColumnBrowser } from '../components/ColumnBrowser.js';
import { createSession } from '../logic/studySession.js';
import { deriveBatchState, findContinueBatch, computeEffectiveUnlocked } from '../logic/progressUtils.js';
import { exportDeckAsCsv } from '../logic/parseCsv.js';
import { makeDeck } from '../logic/makeDeck.js';
import { saveToStorage } from '../storage.js';

function collectLeafNodes(nodes, acc) {
  for (const node of nodes) {
    if (node.directCards.length > 0) acc.push(node);
    if (node.children.length > 0) collectLeafNodes(node.children, acc);
  }
}

function cardCountSummaryHtml(cards) {
  const total = cards.length;
  const learned  = cards.filter(c => c.learningState === 'learned' || c.learningState === 'mastered').length;
  const mastered = cards.filter(c => c.learningState === 'mastered').length;
  const learnedPct = total > 0 ? Math.round(learned / total * 100) : 0;
  const parts = [];
  if (learned  > 0) parts.push(`${learned} learned`);
  if (mastered > 0) parts.push(`${mastered} mastered`);
  const statsText = parts.length > 0 ? parts.join(' · ') : `${total} card${total !== 1 ? 's' : ''}`;
  return `
    <div class="progress-summary">
      <div class="progress-bar"><div class="progress-bar__fill" style="width:${learnedPct}%"></div></div>
      <p class="progress-summary__stats">${learnedPct}% learned &middot; ${statsText}</p>
    </div>
  `;
}

const LEARNING_STATE_FIELDS = ['learningState', 'consecutiveStrong', 'learnedAt', 'masteredAt'];

function resetDeckProgress(deck, state, navigate) {
  if (!confirm(`Reset all progress for "${deck.title}"? This cannot be undone.`)) return;
  const cleanCards = deck.cards.map(c => {
    const clean = { ...c };
    for (const f of LEARNING_STATE_FIELDS) delete clean[f];
    return clean;
  });
  const idx = state.decks.findIndex(d => d.id === deck.id);
  state.decks[idx] = makeDeck(deck.id, deck.title, cleanCards, null, {}, deck.batchNames || []);
  saveToStorage(state);
  navigate('deck', { deckId: deck.id });
}

const RESET_BTN = `<button class="btn btn--danger reset-btn">Reset progress</button>`;

export function DeckView(state, navigate) {
  const deck = state.decks.find(d => d.id === state.routeParams.deckId);
  if (!deck) {
    navigate('home', {});
    return { html: '', bind() {} };
  }

  // ── Topic path ────────────────────────────────────────────────────────────
  if (deck.hasTopics) {
    const summaryHtml = cardCountSummaryHtml(deck.cards);

    const selectedPath = state.routeParams.selectedPath || [];
    const cb = ColumnBrowser({
      topicTree: deck.topicTree,
      selectedPath,
      onSelect: newPath => navigate('deck', { deckId: deck.id, selectedPath: newPath }),
      onStudy: (node, batchIndex) => {
        state.session = createSession(node, batchIndex, deck.id);
        navigate('study', { deckId: deck.id });
      },
    });

    return {
      html: `
        <div class="page-deck page-deck--topics">
          <button class="back-btn">&#8592; Back</button>
          <div class="deck-header">
            <div class="deck-header__titles">
              <h1>${deck.title}</h1>
              <p class="deck-header__meta">${deck.cards.length} cards</p>
            </div>
            ${RESET_BTN}
          </div>
          <div class="deck-secondary-actions">
            <button class="btn btn--secondary te-open-btn">Edit cards</button>
            <button class="btn btn--secondary dl-csv-btn">Download CSV</button>
          </div>
          ${summaryHtml}
          ${cb.html}
        </div>
      `,
      bind(root) {
        root.querySelector('.back-btn').addEventListener('click', () => navigate('home', {}));
        root.querySelector('.reset-btn').addEventListener('click', () => resetDeckProgress(deck, state, navigate));
        root.querySelector('.te-open-btn').addEventListener('click', () =>
          navigate('topicEditor', { deckId: deck.id })
        );
        root.querySelector('.dl-csv-btn').addEventListener('click', () => exportDeckAsCsv(deck));
        cb.bind(root);
      },
    };
  }

  // ── Flat path ─────────────────────────────────────────────────────────────
  const batchStates = deck.batches.map(b => deriveBatchState(b));
  const highestUnlockedBatch = computeEffectiveUnlocked(batchStates);
  const summaryHtml = cardCountSummaryHtml(deck.cards);

  const bp = BatchProgress({
    batches: deck.batches,
    batchProgress: deck.progress.batches,
    batchStates,
    highestUnlocked: highestUnlockedBatch,
    batchNames: deck.batchNames || [],
  });

  const continueBatch = findContinueBatch(deck);
  let btnHtml;
  if (continueBatch !== null) {
    const isFirstStudy = continueBatch === 0 && batchStates[0] === 'unseen';
    const label = isFirstStudy ? 'Start Batch 1' : `Continue — Batch ${continueBatch + 1}`;
    btnHtml = `<button class="btn btn--primary btn--full start-btn">${label}</button>`;
  } else {
    btnHtml = `<p class="deck-complete-msg">All cards learned!</p>`;
  }

  return {
    html: `
      <div class="page-deck">
        <button class="back-btn">&#8592; Back</button>
        <div class="deck-header">
          <div class="deck-header__titles">
            <h1>${deck.title}</h1>
            <p class="deck-header__meta">${deck.cards.length} cards &middot; ${deck.batches.length} batch${deck.batches.length !== 1 ? 'es' : ''}</p>
          </div>
          ${RESET_BTN}
        </div>
        ${summaryHtml}
        <div id="bp-mount">${bp.html}</div>
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
      root.querySelector('.reset-btn').addEventListener('click', () => resetDeckProgress(deck, state, navigate));
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
          state.session = createSession(deck, continueBatch, deck.id);
          navigate('study', { deckId: deck.id });
        });
      }
      bp.bind(root.querySelector('#bp-mount'), batchIdx => {
        state.session = createSession(deck, batchIdx, deck.id);
        navigate('study', { deckId: deck.id });
      });
    },
  };
}
