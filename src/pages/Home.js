import { DeckList } from '../components/DeckList.js';
import { DeckImporter } from '../components/DeckImporter.js';
import { makeDeck } from '../logic/makeDeck.js';
import { saveToStorage } from '../storage.js';

export function HomePage(state, navigate) {
  const dl = DeckList({ decks: state.decks });
  const di = DeckImporter();

  return {
    html: `
      <div class="page-home">
        <header class="home-header">
          <h1>Flashcard Trainer</h1>
          <p class="home-header__subtitle">Exact written recall — one batch at a time.</p>
        </header>
        ${di.html}
        <h2>Your Decks</h2>
        ${dl.html}
      </div>
    `,
    bind(root, renderApp) {
      di.bind(root, raw => {
        const deck = makeDeck(raw.id, raw.title, raw.cards);
        state.decks.push(deck);
        saveToStorage(state);
        renderApp();
      });
      dl.bind(
        root,
        deckId => navigate('deck', { deckId }),
        deckId => {
          state.decks = state.decks.filter(d => d.id !== deckId);
          saveToStorage(state);
          renderApp();
        },
      );
    },
  };
}
