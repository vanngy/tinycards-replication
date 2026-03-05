import { DeckList } from '../components/DeckList.js';
import { DeckImporter } from '../components/DeckImporter.js';
import { makeDeck } from '../logic/makeDeck.js';
import { saveToStorage } from '../storage.js';
import { loadSyncConfig } from '../storage.js';

function syncBarHtml(syncState) {
  const cfg = loadSyncConfig();
  const hasToken = !!cfg.token;

  if (!hasToken) {
    return `<button class="sync-btn sync-btn--setup">&#9729; Set up sync</button>`;
  }
  if (syncState.status === 'error') {
    return `
      <span class="sync-indicator sync-indicator--error"></span>
      <span class="sync-label">Sync error</span>
      <button class="sync-btn sync-btn--manage">Manage</button>
    `;
  }
  return `
    <span class="sync-indicator sync-indicator--ok"></span>
    <span class="sync-label">Synced</span>
    <button class="sync-btn sync-btn--manage">Manage</button>
  `;
}

export function HomePage(state, navigate) {
  const dl = DeckList({ decks: state.decks });
  const di = DeckImporter();
  const cfg = loadSyncConfig();
  const hasToken = !!cfg.token;

  const panelHtml = `
    <div class="sync-panel" id="sync-panel" hidden>
      ${hasToken ? `
        <p class="sync-panel__info">Sync is active. Your data is stored in a private GitHub Gist.</p>
        ${state.sync.status === 'error' ? `<p class="sync-panel__error">${state.sync.message}</p>` : ''}
        <button class="btn btn--secondary sync-disconnect-btn">Disconnect sync</button>
      ` : `
        <p class="sync-panel__info">
          Create a GitHub token with <strong>gist</strong> scope, then paste it below.
          <a href="https://github.com/settings/tokens/new?scopes=gist&description=Flashcard+Trainer+Sync" target="_blank" rel="noopener" class="sync-panel__link">Create token &#8599;</a>
        </p>
        <div class="sync-panel__row">
          <input type="password" class="sync-token-input te-input" placeholder="ghp_..." autocomplete="off" spellcheck="false" />
          <button class="btn btn--primary sync-connect-btn">Connect</button>
        </div>
        <p class="sync-panel__error" id="sync-error" hidden></p>
      `}
    </div>
  `;

  return {
    html: `
      <div class="page-home">
        <header class="home-header">
          <div class="home-header__top">
            <div>
              <h1>Flashcard Trainer</h1>
              <p class="home-header__subtitle">Exact written recall — one batch at a time.</p>
            </div>
            <div class="sync-bar">
              ${syncBarHtml(state.sync)}
            </div>
          </div>
          ${panelHtml}
        </header>
        ${di.html}
        <h2>Your Decks</h2>
        ${dl.html}
      </div>
    `,
    bind(root, renderApp) {
      // Toggle sync panel
      const panel = root.querySelector('#sync-panel');
      const setupBtn = root.querySelector('.sync-btn--setup');
      const manageBtn = root.querySelector('.sync-btn--manage');
      if (setupBtn) setupBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; });
      if (manageBtn) manageBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; });

      // Connect flow
      const connectBtn = root.querySelector('.sync-connect-btn');
      if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
          const input = root.querySelector('.sync-token-input');
          const errorEl = root.querySelector('#sync-error');
          const token = input.value.trim();
          if (!token) return;

          connectBtn.disabled = true;
          connectBtn.textContent = 'Connecting…';
          errorEl.hidden = true;

          try {
            await state.syncActions.connect(token);
            renderApp();
          } catch (e) {
            errorEl.textContent = e.message;
            errorEl.hidden = false;
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
          }
        });
      }

      // Disconnect
      const disconnectBtn = root.querySelector('.sync-disconnect-btn');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
          state.syncActions.disconnect();
          renderApp();
        });
      }

      // Deck importer and list
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
