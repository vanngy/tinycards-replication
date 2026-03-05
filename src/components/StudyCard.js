import { escapeHtml } from '../utils.js';

// Renders the card front + batch/card metadata.
// summary = { batchIndex, cardIndex, totalCards, phase, cleanStreak }
export function StudyCard({ card, summary }) {
  const batchLabel = `Batch ${summary.batchIndex + 1}`;
  const cardLabel = `Card ${summary.cardIndex + 1} of ${summary.totalCards}`;
  const phaseLabel = summary.phase === 'mastery' ? ' · Mastery Round' : '';

  return {
    html: `
      <div class="card study-card fade-in">
        <div class="study-card__meta">${batchLabel} · ${cardLabel}${phaseLabel}</div>
        <div class="study-card__front">${escapeHtml(card.front)}</div>
      </div>
    `,
    bind() {},
  };
}
