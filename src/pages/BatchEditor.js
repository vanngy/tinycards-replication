import { makeDeck } from '../logic/makeDeck.js';
import { saveToStorage } from '../storage.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveOriginalAssignments(deck) {
  return deck.cards.map((c, i) =>
    typeof c.batchIndex === 'number' ? c.batchIndex : Math.floor(i / 5)
  );
}

function assignmentsChanged(original, current) {
  return original.some((v, i) => v !== current[i]);
}

function compactAssignments(assignments, names) {
  // Find which batch indices are actually used
  const usedSet = new Set(assignments);
  const sortedUsed = [...usedSet].sort((a, b) => a - b);
  // Build remapping: old index → new index
  const remap = {};
  sortedUsed.forEach((old, newIdx) => { remap[old] = newIdx; });
  const newAssignments = assignments.map(a => remap[a]);
  const newNames = sortedUsed.map(old => names[old] ?? '');
  return { assignments: newAssignments, names: newNames };
}

function batchSizesFrom(assignments, batchCount) {
  const sizes = Array(batchCount).fill(0);
  for (const a of assignments) {
    if (a >= 0 && a < batchCount) sizes[a]++;
  }
  return sizes;
}

function optionsHtml(cardIdx, editorState, batchSizes) {
  const current = editorState.assignments[cardIdx];
  return Array.from({ length: editorState.batchCount }, (_, bi) => {
    const isCurrent = bi === current;
    const full = !isCurrent && batchSizes[bi] >= 5;
    const name = editorState.names[bi] ? ` — ${editorState.names[bi]}` : '';
    return `<option value="${bi}" ${isCurrent ? 'selected' : ''} ${full ? 'disabled' : ''}>Batch ${bi + 1}${name}</option>`;
  }).join('');
}

// ── Render ─────────────────────────────────────────────────────────────────────

function renderForm(container, editorState, deck, originalAssignments, state, navigate) {
  const batchSizes = batchSizesFrom(editorState.assignments, editorState.batchCount);
  const changed = assignmentsChanged(originalAssignments, editorState.assignments);

  const warningHtml = changed
    ? `<div class="be-reset-warning">Moving cards will reset study progress.</div>`
    : '';

  // Group cards by batch
  const groups = Array.from({ length: editorState.batchCount }, () => []);
  editorState.assignments.forEach((bi, cardIdx) => {
    if (bi >= 0 && bi < editorState.batchCount) groups[bi].push(cardIdx);
  });

  const batchesHtml = groups.map((cardIndices, bi) => {
    const count = cardIndices.length;
    const full = count >= 5;
    const countCls = `be-batch__count${full ? ' be-batch__count--full' : ''}`;
    const nameVal = editorState.names[bi] ?? '';

    const cardsHtml = cardIndices.length === 0
      ? `<div class="be-card-list be-card-list--empty"><em>No cards — move cards here</em></div>`
      : `<div class="be-card-list">${cardIndices.map(cardIdx => {
          const front = deck.cards[cardIdx].front;
          const truncated = front.length > 60 ? front.slice(0, 57) + '…' : front;
          return `
            <div class="be-card-row">
              <span class="be-card__front" title="${escapeAttr(front)}">${escapeHtml(truncated)}</span>
              <label class="be-card__move-label">Move to
                <select class="be-select" data-card="${cardIdx}">
                  ${optionsHtml(cardIdx, editorState, batchSizes)}
                </select>
              </label>
            </div>`;
        }).join('')}</div>`;

    return `
      <div class="be-batch">
        <div class="be-batch__header">
          <div class="be-batch__title-row">
            <span class="be-batch__num">Batch ${bi + 1}</span>
            <span class="${countCls}">${count} / 5 cards</span>
          </div>
          <input class="te-input be-batch__name-input" data-batch="${bi}"
                 placeholder="Custom name (optional)" value="${escapeAttr(nameVal)}">
        </div>
        ${cardsHtml}
      </div>`;
  }).join('');

  container.innerHTML = `
    <form class="be-form" novalidate>
      ${warningHtml}
      ${batchesHtml}
      <button type="button" class="btn btn--secondary be-add-btn">+ Add batch</button>
      <div class="te-actions">
        <button type="button" class="btn btn--secondary te-cancel-btn">Cancel</button>
        <button type="submit" class="btn btn--primary">Save batches</button>
      </div>
    </form>`;

  // Name inputs
  container.querySelectorAll('.be-batch__name-input').forEach(input => {
    input.addEventListener('blur', () => {
      const bi = Number(input.dataset.batch);
      editorState.names[bi] = input.value;
      renderForm(container, editorState, deck, originalAssignments, state, navigate);
    });
  });

  // Card selects
  container.querySelectorAll('.be-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const cardIdx = Number(sel.dataset.card);
      editorState.assignments[cardIdx] = Number(sel.value);
      renderForm(container, editorState, deck, originalAssignments, state, navigate);
    });
  });

  // Add batch
  container.querySelector('.be-add-btn').addEventListener('click', () => {
    editorState.batchCount++;
    editorState.names.push('');
    renderForm(container, editorState, deck, originalAssignments, state, navigate);
  });

  // Cancel
  container.querySelector('.te-cancel-btn').addEventListener('click', () =>
    navigate('deck', { deckId: deck.id })
  );

  // Save
  container.querySelector('.be-form').addEventListener('submit', e => {
    e.preventDefault();
    handleSave(editorState, deck, originalAssignments, state, navigate);
  });
}

function handleSave(editorState, deck, originalAssignments, state, navigate) {
  const compact = compactAssignments(editorState.assignments, editorState.names);

  // Write batchIndex onto each card
  const newCards = deck.cards.map((c, i) => ({ ...c, batchIndex: compact.assignments[i] }));

  // Determine new progress
  let newProgress;
  if (assignmentsChanged(originalAssignments, compact.assignments)) {
    newProgress = {
      highestUnlockedBatch: 0,
      deckComplete: false,
      batches: [],
    };
  } else {
    newProgress = deck.progress;
  }

  const newDeck = makeDeck(deck.id, deck.title, newCards, newProgress, deck.topicProgress || {}, compact.names);
  const deckIdx = state.decks.findIndex(d => d.id === deck.id);
  state.decks[deckIdx] = newDeck;
  saveToStorage(state);
  navigate('deck', { deckId: deck.id });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BatchEditor(state, navigate) {
  const deck = state.decks.find(d => d.id === state.routeParams.deckId);
  if (!deck) {
    navigate('home', {});
    return { html: '', bind() {} };
  }

  const originalAssignments = deriveOriginalAssignments(deck);
  const initialCount = deck.cards.length === 0
    ? 1
    : Math.max(...originalAssignments) + 1;

  const editorState = {
    assignments: [...originalAssignments],
    names: Array.from({ length: initialCount }, (_, i) => deck.batchNames?.[i] ?? ''),
    batchCount: initialCount,
  };

  return {
    html: `
      <div class="page-batch-editor">
        <button class="back-btn">&#8592; Back</button>
        <div class="deck-header">
          <h1>Edit Batches</h1>
          <p class="deck-header__meta">${deck.title} &middot; ${deck.cards.length} cards</p>
        </div>
        <div class="be-form-container"></div>
      </div>`,
    bind(root) {
      root.querySelector('.back-btn').addEventListener('click', () =>
        navigate('deck', { deckId: deck.id })
      );
      const container = root.querySelector('.be-form-container');
      renderForm(container, editorState, deck, originalAssignments, state, navigate);
    },
  };
}

// ── Escape helpers ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
