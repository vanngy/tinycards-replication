import { checkAnswer } from './checkAnswer.js';

// createSession — initialise a fresh in-memory session for one batch
export function createSession(studyTarget, batchIndex, deckId) {
  return {
    deck: studyTarget,
    deckId: deckId ?? studyTarget.id,
    batchIndex,
    batch: studyTarget.batches[batchIndex],
    cardIndex: 0,
    attemptCount: 0,    // wrong attempts on current card (0, 1)
    rewriteMode: false,
    phase: 'initial',   // 'initial' | 'mastery'
    isRoundClean: true, // no rewrite triggered this round
    cleanStreak: 0,     // clean mastery rounds in a row
    showRoundSummary: false,
    lastRoundResult: null,
    feedback: null,     // null | { type, msg }
  };
}

// getCurrentCard — returns the active card, or null if session is done
export function getCurrentCard(session) {
  if (session.cardIndex >= session.batch.length) return null;
  return session.batch[session.cardIndex];
}

// submitAnswer — core answer-handling state machine
// Returns { correct, rewriteTriggered, roundComplete, batchUnlocked }
export function submitAnswer(session, typed) {
  const card = session.batch[session.cardIndex];
  const correct = checkAnswer(typed, card.back);
  const result = { correct, rewriteTriggered: false, roundComplete: false, batchUnlocked: false };

  if (session.rewriteMode) {
    if (correct) {
      session.rewriteMode = false;
      session.attemptCount = 0;
      session.feedback = null;
      advanceCard(session, result);
    } else {
      session.feedback = { type: 'incorrect', msg: 'Not quite — try rewriting again.' };
    }
  } else {
    if (correct) {
      session.feedback = null;
      session.attemptCount = 0;
      advanceCard(session, result);
    } else {
      session.attemptCount++;
      if (session.attemptCount >= 2) {
        session.isRoundClean = false;
        session.rewriteMode = true;
        session.feedback = null;
        result.rewriteTriggered = true;
      } else {
        session.feedback = { type: 'incorrect', msg: 'Incorrect. Try again.' };
      }
    }
  }

  return result;
}

function advanceCard(session, result) {
  session.cardIndex++;
  if (session.cardIndex >= session.batch.length) {
    result.roundComplete = true;
    completeRound(session, result);
  }
}

function completeRound(session, result) {
  if (session.phase === 'initial') {
    // Initial pass done — enter mastery phase fresh
    session.phase = 'mastery';
    session.cardIndex = 0;
    session.attemptCount = 0;
    session.isRoundClean = true;
    session.feedback = null;
    session.showRoundSummary = true;
    session.lastRoundResult = { phase: 'initial', batchUnlocked: false, deckComplete: false, cleanStreak: 0 };
  } else {
    // Mastery round finished
    if (session.isRoundClean) {
      session.cleanStreak++;
    } else {
      session.cleanStreak = 0;
    }

    if (session.cleanStreak >= 2) {
      result.batchUnlocked = true;
      const hasNext = session.batchIndex + 1 < session.deck.batches.length;
      session.showRoundSummary = true;
      session.lastRoundResult = {
        phase: 'mastery',
        batchUnlocked: true,
        deckComplete: !hasNext,
        cleanStreak: session.cleanStreak,
      };
    } else {
      // Keep going — reset for next mastery round
      session.cardIndex = 0;
      session.attemptCount = 0;
      session.isRoundClean = true;
      session.feedback = null;
      session.showRoundSummary = true;
      session.lastRoundResult = {
        phase: 'mastery',
        batchUnlocked: false,
        deckComplete: false,
        cleanStreak: session.cleanStreak,
      };
    }
  }
}

// markCorrect — typo forgiveness: count current card as correct without penalty.
// The round stays clean (no rewrite flag set).
export function markCorrect(session) {
  session.rewriteMode = false;
  session.attemptCount = 0;
  session.feedback = null;
  const result = { correct: true, rewriteTriggered: false, roundComplete: false, batchUnlocked: false };
  advanceCard(session, result);
  return result;
}

export function getSessionSummary(session) {
  return {
    batchIndex: session.batchIndex,
    cardIndex: session.cardIndex,
    totalCards: session.batch.length,
    phase: session.phase,
    cleanStreak: session.cleanStreak,
  };
}
