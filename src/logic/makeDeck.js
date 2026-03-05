import { splitIntoBatches } from './splitIntoBatches.js';
import { buildTopicTree } from './buildTopicTree.js';
import { enforceMaxBatchSize } from './batchUtils.js';

export function makeDeck(id, title, cards, progress, topicProgress = {}, batchNames = []) {
  let batches;
  let processedCards = cards;
  const hasExplicit = cards.some(c => typeof c.batchIndex === 'number');
  if (hasExplicit) {
    processedCards = enforceMaxBatchSize(cards);
    const groups = {};
    for (const card of processedCards) {
      const idx = typeof card.batchIndex === 'number' ? card.batchIndex : 0;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push(card);
    }
    batches = Object.keys(groups).map(Number).sort((a, b) => a - b).map(k => groups[k]);
  } else {
    batches = splitIntoBatches(cards);
  }
  const batchStatuses = batches.map((_, i) => {
    const existing = progress?.batches?.[i];
    if (existing) return existing;
    const hob = progress?.highestUnlockedBatch ?? 0;
    if (!progress?.batches) {
      if (i < hob) return { status: 'mastered', lastStudied: null };
      if (i === hob && hob > 0) return { status: 'in-progress', lastStudied: null };
    }
    return { status: 'unseen', lastStudied: null };
  });

  const topicTree = buildTopicTree(processedCards, topicProgress);
  const hasTopics = topicTree.length > 0;
  const liveTopicProgress = {};
  if (hasTopics) collectProgress(topicTree, liveTopicProgress);

  return {
    id,
    title,
    cards: processedCards,
    batches,
    batchNames,
    progress: {
      highestUnlockedBatch: progress?.highestUnlockedBatch ?? 0,
      deckComplete: progress?.deckComplete ?? false,
      batches: batchStatuses,
    },
    topicTree,
    hasTopics,
    topicProgress: liveTopicProgress,
  };
}

function collectProgress(nodes, map) {
  for (const node of nodes) {
    if (node.directCards.length > 0 && node.progress) {
      map[node.pathKey] = node.progress;
    }
    if (node.children.length > 0) {
      collectProgress(node.children, map);
    }
  }
}
