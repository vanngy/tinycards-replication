// Displayed between rounds.
// lastRoundResult = { phase, batchUnlocked, deckComplete, cleanStreak }
// bind(root, onContinue)
export function RoundSummary({ lastRoundResult }) {
  const { phase, batchUnlocked, deckComplete, cleanStreak } = lastRoundResult;

  let title, subtitle, btnLabel;

  if (deckComplete) {
    title = 'Deck complete!';
    subtitle = 'You have mastered every batch. Great work.';
    btnLabel = 'Back to Deck';
  } else if (batchUnlocked) {
    title = 'Next batch unlocked!';
    subtitle = 'Two clean rounds complete. Keep it up!';
    btnLabel = 'View Deck';
  } else if (phase === 'initial') {
    title = 'First pass done!';
    subtitle = 'Now complete 2 clean rounds (no rewrites) to unlock the next batch.';
    btnLabel = 'Start Mastery';
  } else if (cleanStreak === 0) {
    title = 'Round complete';
    subtitle = 'A card needed rewriting — streak reset. Try again!';
    btnLabel = 'Try Again';
  } else {
    title = 'Clean round!';
    subtitle = 'One more clean round to unlock the next batch.';
    btnLabel = 'Next Round';
  }

  const pip1 = cleanStreak >= 1 && phase !== 'initial' ? 'pip--filled' : '';
  const pip2 = cleanStreak >= 2 ? 'pip--filled' : '';

  const unlockHtml = batchUnlocked && !deckComplete
    ? `<p class="unlock-msg">Next batch unlocked!</p>`
    : '';

  return {
    html: `
      <div class="card round-summary fade-in">
        <h2>${title}</h2>
        <p class="round-summary__subtitle">${subtitle}</p>
        <div class="streak-pips">
          <div class="pip ${pip1}" title="Round 1"></div>
          <div class="pip ${pip2}" title="Round 2"></div>
        </div>
        ${unlockHtml}
        <button class="btn btn--primary btn--full continue-btn">${btnLabel}</button>
      </div>
    `,
    bind(root, onContinue) {
      root.querySelector('.continue-btn').addEventListener('click', onContinue);
    },
  };
}
