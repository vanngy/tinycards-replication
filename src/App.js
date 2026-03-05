import { makeDeck } from './logic/makeDeck.js';
import { loadFromStorage, saveToStorage, serializeState, onAfterSave, loadSyncConfig, saveSyncConfig } from './storage.js';
import { findExistingGist, fetchGist, pushGist, createGist } from './sync.js';
import { HomePage } from './pages/Home.js';
import { DeckView } from './pages/DeckView.js';
import { StudyView } from './pages/StudyView.js';
import { TopicEditor } from './pages/TopicEditor.js';
import { BatchEditor } from './pages/BatchEditor.js';
import { CardEditor } from './pages/CardEditor.js';

// ── Hardcoded starter deck (Phase 1) ─────────────────────────────────────────
const GLOBALIZATION_ID = 'deck_globalization';
const GLOBALIZATION_CARDS = [
  {
    front: 'Cultural Globalization',
    back: 'A phenomenon by which the experience of everyday life, as influenced by the diffusion of commodities and ideas, reflects a standardization of cultural expressions around the world. Propelled by the efficiency or appeal of wireless communications, electronic commerce, popular culture, and international travel, globalization has been seen as a trend toward homogeneity that will eventually make human experience everywhere essentially the same. This appears, however, to be an overstatement of the phenomenon. Although homogenizing influences do indeed exist, they are far from creating anything akin to a single world culture.',
    topic: 'Definitions',
    subtopic: 'Cultural Globalization',
  },
  {
    front: 'Economic Globalization (UNDESA)',
    back: 'Economic globalization refers to the increasing interdependence of world economies as a result of the growing scale of cross-border trade of commodities and services, flow of international capital and wide and rapid spread of technologies. It reflects the continuing expansion and mutual integration of market frontiers, and is an irreversible trend for the economic development in the whole world at the turn of the millennium.',
    topic: 'Definitions',
    subtopic: 'Economic Globalization',
  },
  {
    front: 'Economic Globalization (Britannica)',
    back: 'Social scientists have identified the central aspects of globalization as interconnection, intensification, time-space distanciation (conditions that allow time and space to be organized in a manner that connects presence and absence), supraterritoriality, time-space compression, action at a distance, and accelerating interdependence. Modern analysts also conceive of globalization as a long-term process of deterritorialization—that is, of social activities (economic, political, and cultural) occurring without regard for geographic location. Thus, globalization can be defined as the stretching of economic, political, and social relationships in space and time. A manufacturer assembling a product for a distant market, a country submitting to international law, and a language adopting a foreign loanword are all examples of globalization. Of course history is filled with such occurrences: Chinese artisans once wove silk bound for the Roman Empire; kingdoms in western Europe honoured dictates of the Roman Catholic Church; and English adopted many Norman French words in the centuries after the Battle of Hastings.',
    topic: 'Definitions',
    subtopic: 'Economic Globalization',
  },
];

// ── Global state ──────────────────────────────────────────────────────────────
const state = {
  currentView: 'home',
  routeParams: {},
  decks: [],
  session: null,
  sync: { status: 'idle', message: '' },
  syncActions: {},
};

// ── Sync helpers ──────────────────────────────────────────────────────────────
let pushTimer = null;

function schedulePush(data) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const cfg = loadSyncConfig();
    if (!cfg.token || !cfg.gistId) return;
    try {
      await pushGist(cfg.token, cfg.gistId, data);
      state.sync = { status: 'ok', message: '' };
    } catch (e) {
      state.sync = { status: 'error', message: e.message };
    }
  }, 3000);
}

function applyGistData(data) {
  if (!data || !Array.isArray(data.decks)) return;
  state.decks = data.decks.map(d => {
    if (d.id === GLOBALIZATION_ID && !d.cards[0]?.topic) {
      return makeDeck(d.id, d.title, GLOBALIZATION_CARDS, d.progress, d.topicProgress || {}, d.batchNames || []);
    }
    return makeDeck(d.id, d.title, d.cards, d.progress, d.topicProgress || {}, d.batchNames || []);
  });
  if (!state.decks.find(d => d.id === GLOBALIZATION_ID)) {
    state.decks.unshift(makeDeck(GLOBALIZATION_ID, 'Globalization', GLOBALIZATION_CARDS, null, {}, []));
  }
  saveToStorage(state, { triggerSync: false });
}

state.syncActions.connect = async function (token) {
  const cfg = loadSyncConfig();
  let gistId = cfg.gistId ?? await findExistingGist(token);
  if (gistId) {
    const data = await fetchGist(token, gistId);
    applyGistData(data);
  } else {
    gistId = await createGist(token, serializeState(state));
  }
  saveSyncConfig({ token, gistId });
  state.sync = { status: 'ok', message: '' };
};

state.syncActions.disconnect = function () {
  saveSyncConfig({ token: null, gistId: null });
  state.sync = { status: 'idle', message: '' };
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function initState() {
  const saved = loadFromStorage();
  if (saved && Array.isArray(saved.decks) && saved.decks.length > 0) {
    state.decks = saved.decks.map(d => {
      // Upgrade check: if stored globalization deck lacks topic fields, inject them
      if (d.id === GLOBALIZATION_ID && !d.cards[0]?.topic) {
        return makeDeck(d.id, d.title, GLOBALIZATION_CARDS, d.progress, d.topicProgress || {}, d.batchNames || []);
      }
      return makeDeck(d.id, d.title, d.cards, d.progress, d.topicProgress || {}, d.batchNames || []);
    });
  }

  // Always ensure the globalization starter deck is present
  if (!state.decks.find(d => d.id === GLOBALIZATION_ID)) {
    state.decks.unshift(makeDeck(GLOBALIZATION_ID, 'Globalization', GLOBALIZATION_CARDS, null, {}, []));
    saveToStorage(state);
  }

  onAfterSave(schedulePush);

  // Pull from gist on startup if already configured
  const cfg = loadSyncConfig();
  if (cfg.token && cfg.gistId) {
    try {
      const data = await fetchGist(cfg.token, cfg.gistId);
      applyGistData(data);
      state.sync = { status: 'ok', message: '' };
    } catch (e) {
      state.sync = { status: 'error', message: e.message };
    }
  }
}

// ── Routing ───────────────────────────────────────────────────────────────────
const PAGES = {
  home: HomePage,
  deck: DeckView,
  study: StudyView,
  topicEditor: TopicEditor,
  batchEditor: BatchEditor,
  cardEditor: CardEditor,
};

function navigate(view, params = {}) {
  state.currentView = view;
  state.routeParams = params;
  renderApp();
}

function renderApp() {
  const container = document.getElementById('app');
  const Page = PAGES[state.currentView] || PAGES.home;
  const { html, bind } = Page(state, navigate);
  container.innerHTML = html;
  bind(container, renderApp);

  // Toggle wide mode for deck view with topics
  const deck = state.decks.find(d => d.id === state.routeParams.deckId);
  container.classList.toggle(
    'app--wide',
    (state.currentView === 'deck' && !!deck?.hasTopics) ||
    state.currentView === 'topicEditor' ||
    state.currentView === 'batchEditor'
  );

  // Scroll to top on each navigation
  window.scrollTo(0, 0);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
initState().then(() => renderApp());
