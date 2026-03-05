import { slugify } from './buildTopicTree.js';
import { escapeHtml } from '../utils.js';

export function findNode(nodes, pathKey) {
  for (const node of nodes) {
    if (node.pathKey === pathKey) return node;
    const found = findNode(node.children, pathKey);
    if (found) return found;
  }
  return null;
}

export function cardPathKey(card) {
  if (!card.topic) return null;
  let key = slugify(card.topic);
  if (card.subtopic)    key += '/' + slugify(card.subtopic);
  if (card.subsubtopic) key += '/' + slugify(card.subsubtopic);
  return key;
}

// Returns which batch index a card currently sits in within its node (or deck for flat).
export function currentBatchOf(card, deckCardIndex, deck) {
  if (deck.hasTopics) {
    const key = cardPathKey(card);
    const node = key ? findNode(deck.topicTree, key) : null;
    if (node) {
      for (let bi = 0; bi < node.batches.length; bi++) {
        if (node.batches[bi].includes(card)) return bi;
      }
    }
    return 0;
  }
  return typeof card.batchIndex === 'number' ? card.batchIndex : Math.floor(deckCardIndex / 5);
}

// Returns how many batches exist for a card's node context (or deck for flat).
export function batchCountFor(card, deck) {
  if (deck.hasTopics) {
    const key = cardPathKey(card);
    const node = key ? findNode(deck.topicTree, key) : null;
    return node ? node.batches.length : 1;
  }
  return deck.batches.length;
}

// Returns the <option> HTML for a card's batch selector.
export function batchOptionsHtml(card, cardIndex, deck) {
  const count   = batchCountFor(card, deck);
  const current = currentBatchOf(card, cardIndex, deck);

  // Compute current batch sizes so full batches can be disabled
  let batchSizes;
  if (deck.hasTopics) {
    const key  = cardPathKey(card);
    const node = key ? findNode(deck.topicTree, key) : null;
    batchSizes = node ? node.batches.map(b => b.length) : [];
  } else {
    batchSizes = deck.batches ? deck.batches.map(b => b.length) : [];
  }

  return Array.from({ length: count + 1 }, (_, bi) => {
    const isNew     = bi === count;
    const isCurrent = bi === current;
    const full      = !isNew && !isCurrent && (batchSizes[bi] ?? 0) >= 5;
    const name  = !isNew && !deck.hasTopics && deck.batchNames?.[bi]
      ? ` — ${escapeHtml(deck.batchNames[bi])}` : '';
    const label = isNew ? `Batch ${bi + 1} (new)` : `Batch ${bi + 1}${name}`;
    return `<option value="${bi}"${isCurrent ? ' selected' : ''}${full ? ' disabled' : ''}>${label}</option>`;
  }).join('');
}

// Enforce max 5 cards per batch within each topic-node context (or flat deck).
// Any batch group that exceeds 5 is automatically split; indices are renumbered.
export function enforceMaxBatchSize(cards) {
  const byBatch = {}; // `${contextKey}||${bi}` → card[]
  for (const card of cards) {
    const ck  = cardPathKey(card) || '__flat__';
    const bi  = card.batchIndex ?? 0;
    const key = `${ck}||${bi}`;
    if (!byBatch[key]) byBatch[key] = [];
    byBatch[key].push(card);
  }

  // Group by context, sort each context by original batch index, renumber with max-5 chunks
  const byContext = {};
  for (const [key, group] of Object.entries(byBatch)) {
    const sep = key.lastIndexOf('||');
    const ck  = key.slice(0, sep);
    const bi  = Number(key.slice(sep + 2));
    if (!byContext[ck]) byContext[ck] = [];
    byContext[ck].push({ bi, group });
  }

  const newBiMap = new Map(); // card ref → new batchIndex
  for (const batches of Object.values(byContext)) {
    batches.sort((a, b) => a.bi - b.bi);
    let counter = 0;
    for (const { group } of batches) {
      for (let i = 0; i < group.length; i++) {
        newBiMap.set(group[i], counter + Math.floor(i / 5));
      }
      counter += Math.ceil(group.length / 5);
    }
  }

  return cards.map(card => {
    const newBi = newBiMap.get(card);
    return (newBi !== undefined && newBi !== card.batchIndex)
      ? { ...card, batchIndex: newBi }
      : card;
  });
}
