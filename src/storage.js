const KEY = 'flashcard_trainer';
const SYNC_KEY = 'flashcard_sync';

let _afterSave = null;
export function onAfterSave(fn) { _afterSave = fn; }

export function serializeState(state) {
  return {
    decks: state.decks.map(d => ({
      id: d.id,
      title: d.title,
      cards: d.cards,
      progress: d.progress,
      topicProgress: d.topicProgress || {},
      batchNames: d.batchNames || [],
    })),
  };
}

export function saveToStorage(state, { triggerSync = true } = {}) {
  try {
    const data = serializeState(state);
    localStorage.setItem(KEY, JSON.stringify(data));
    if (triggerSync && _afterSave) _afterSave(data);
  } catch (e) {
    console.warn('saveToStorage failed:', e);
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('loadFromStorage failed:', e);
    return null;
  }
}

export function loadSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? JSON.parse(raw) : { token: null, gistId: null };
  } catch (e) {
    return { token: null, gistId: null };
  }
}

export function saveSyncConfig(config) {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('saveSyncConfig failed:', e);
  }
}
