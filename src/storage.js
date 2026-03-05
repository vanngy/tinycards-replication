const KEY = 'flashcard_trainer';

export function saveToStorage(state) {
  try {
    const data = {
      decks: state.decks.map(d => ({
        id: d.id,
        title: d.title,
        cards: d.cards,
        progress: d.progress,
        topicProgress: d.topicProgress || {},
        batchNames: d.batchNames || [],
      })),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
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
