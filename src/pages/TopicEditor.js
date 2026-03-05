import { escapeHtml as escHtml } from '../utils.js';
import { makeDeck } from '../logic/makeDeck.js';
import { saveToStorage } from '../storage.js';
import { currentBatchOf, batchOptionsHtml, enforceMaxBatchSize } from '../logic/batchUtils.js';

export function TopicEditor(state, navigate) {
  const deck = state.decks.find(d => d.id === state.routeParams.deckId);
  if (!deck) { navigate('home', {}); return { html: '', bind() {} }; }

  const topicSet = new Set(), subtopicSet = new Set(), subsubtopicSet = new Set();
  for (const c of deck.cards) {
    if (c.topic)       topicSet.add(c.topic);
    if (c.subtopic)    subtopicSet.add(c.subtopic);
    if (c.subsubtopic) subsubtopicSet.add(c.subsubtopic);
  }
  const opts = set => [...set].map(v => `<option value="${escHtml(v)}">`).join('');

  const rowsHtml = deck.cards.map((card, i) => `
    <div class="te-card-row" data-topic="${escHtml(card.topic || '')}" data-subtopic="${escHtml(card.subtopic || '')}">
      <div class="te-card-row__header">
        <span>Card ${i + 1}${card.topic ? ` · ${escHtml(card.topic)}` : ''}</span>
        <button type="button" class="btn te-delete-btn" data-index="${i}" title="Delete card">&#x2715;</button>
      </div>
      <div class="te-card-row__sides">
        <label class="te-input-label">Front
          <textarea class="te-input te-textarea te-textarea--large te-front" data-index="${i}" rows="4">${escHtml(card.front)}</textarea>
        </label>
        <label class="te-input-label">Back
          <textarea class="te-input te-textarea te-textarea--large te-back" data-index="${i}" rows="5">${escHtml(card.back)}</textarea>
        </label>
      </div>
      <div class="te-card-row__topics">
        <label class="te-input-label">Topic
          <input class="te-input te-topic" type="text" list="te-topics"
                 data-index="${i}" value="${escHtml(card.topic || '')}" placeholder="Topic">
        </label>
        <label class="te-input-label">Subtopic
          <input class="te-input te-subtopic" type="text" list="te-subtopics"
                 data-index="${i}" value="${escHtml(card.subtopic || '')}" placeholder="Subtopic">
        </label>
        <label class="te-input-label">Sub-subtopic
          <input class="te-input te-subsubtopic" type="text" list="te-subsubtopics"
                 data-index="${i}" value="${escHtml(card.subsubtopic || '')}" placeholder="Sub-subtopic">
        </label>
        <label class="te-input-label">Batch
          <select class="te-input te-batch" data-index="${i}">
            ${batchOptionsHtml(card, i, deck)}
          </select>
        </label>
      </div>
    </div>`).join('');

  // Build topic → subtopics map for cascading filter
  const topicSubtopicMap = {};
  for (const c of deck.cards) {
    if (c.topic && c.subtopic) {
      if (!topicSubtopicMap[c.topic]) topicSubtopicMap[c.topic] = new Set();
      topicSubtopicMap[c.topic].add(c.subtopic);
    }
  }
  const allSubtopicOptions = [...subtopicSet].map(s => {
    const parentTopics = Object.entries(topicSubtopicMap)
      .filter(([, subs]) => subs.has(s))
      .map(([t]) => escHtml(t))
      .join(',');
    return `<option value="${escHtml(s)}" data-topics="${parentTopics}">${escHtml(s)}</option>`;
  }).join('');

  const filterHtml = topicSet.size > 0 ? `
    <div class="te-filter-bar">
      <select class="te-filter-topic">
        <option value="">All topics</option>
        ${[...topicSet].map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('')}
      </select>
      <select class="te-filter-subtopic">
        <option value="">All subtopics</option>
        ${allSubtopicOptions}
      </select>
    </div>` : '';

  return {
    html: `
      <div class="page-topic-editor">
        <button class="back-btn">&#8592; Back</button>
        <div class="deck-header">
          <h1>${escHtml(deck.title)}</h1>
          <p class="deck-header__meta">Editing ${deck.cards.length} card${deck.cards.length !== 1 ? 's' : ''}</p>
        </div>
        <datalist id="te-topics">${opts(topicSet)}</datalist>
        <datalist id="te-subtopics">${opts(subtopicSet)}</datalist>
        <datalist id="te-subsubtopics">${opts(subsubtopicSet)}</datalist>
        ${filterHtml}
        <form class="te-form" novalidate>
          <div class="te-actions">
            <button type="button" class="btn btn--secondary te-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn--primary">Save changes</button>
          </div>
          <div class="te-cards-list">
            ${rowsHtml}
          </div>
        </form>
      </div>`,
    bind(root) {
      const goBack = () => navigate('deck', { deckId: deck.id });
      root.querySelector('.back-btn').addEventListener('click', goBack);
      root.querySelector('.te-cancel-btn').addEventListener('click', goBack);

      const deletedIndices = new Set();
      root.querySelectorAll('.te-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.index);
          deletedIndices.add(idx);
          btn.closest('.te-card-row').hidden = true;
        });
      });

      const topicSel    = root.querySelector('.te-filter-topic');
      const subtopicSel = root.querySelector('.te-filter-subtopic');
      if (topicSel) {
        const applyFilters = () => {
          const t  = topicSel.value;
          const st = subtopicSel.value;
          root.querySelectorAll('.te-card-row').forEach(row => {
            if (deletedIndices.has(Number(row.querySelector('.te-delete-btn')?.dataset.index))) return;
            const topicMatch    = t  === '' || row.dataset.topic    === t;
            const subtopicMatch = st === '' || row.dataset.subtopic === st;
            row.hidden = !(topicMatch && subtopicMatch);
          });
        };
        topicSel.addEventListener('change', () => {
          const t = topicSel.value;
          subtopicSel.value = '';
          [...subtopicSel.options].forEach(opt => {
            if (!opt.value) return;
            opt.hidden = t !== '' && !opt.dataset.topics.split(',').includes(t);
          });
          applyFilters();
        });
        subtopicSel.addEventListener('change', applyFilters);
      }

      root.querySelector('.te-form').addEventListener('submit', e => {
        e.preventDefault();
        let batchChanged = deletedIndices.size > 0;
        const rawCards = deck.cards.map((card, i) => {
          if (deletedIndices.has(i)) return null;
          const front       = root.querySelector(`.te-front[data-index="${i}"]`).value.trim();
          const back        = root.querySelector(`.te-back[data-index="${i}"]`).value.trim();
          const topic       = root.querySelector(`.te-topic[data-index="${i}"]`).value.trim();
          const subtopic    = root.querySelector(`.te-subtopic[data-index="${i}"]`).value.trim();
          const subsubtopic = root.querySelector(`.te-subsubtopic[data-index="${i}"]`).value.trim();
          const batchIndex  = Number(root.querySelector(`.te-batch[data-index="${i}"]`).value);
          if (batchIndex !== currentBatchOf(card, i, deck)) batchChanged = true;
          const updated = { ...card, front: front || card.front, back: back || card.back, batchIndex };
          if (topic)       updated.topic       = topic;       else delete updated.topic;
          if (subtopic)    updated.subtopic     = subtopic;    else delete updated.subtopic;
          if (subsubtopic) updated.subsubtopic  = subsubtopic; else delete updated.subsubtopic;
          return updated;
        }).filter(Boolean);

        // Auto-split any batch that exceeds 5 cards
        const updatedCards = enforceMaxBatchSize(rawCards);
        if (!batchChanged) {
          batchChanged = updatedCards.some((c, i) => c.batchIndex !== rawCards[i].batchIndex);
        }

        const newProgress      = batchChanged ? { highestUnlockedBatch: 0, deckComplete: false, batches: [] } : deck.progress;
        const newTopicProgress = batchChanged ? {} : (deck.topicProgress || {});
        const rebuilt = makeDeck(deck.id, deck.title, updatedCards, newProgress, newTopicProgress, deck.batchNames || []);
        state.decks[state.decks.findIndex(d => d.id === deck.id)] = rebuilt;
        saveToStorage(state);
        navigate('deck', { deckId: deck.id });
      });
    },
  };
}
