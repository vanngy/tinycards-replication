import { parseCsv } from '../logic/parseCsv.js';

// File-input button that reads a .csv and calls onImport(rawDeck).
export function DeckImporter() {
  return {
    html: `
      <div class="importer">
        <label class="importer__label">
          + Import CSV deck
          <input type="file" accept=".csv" class="importer__input">
        </label>
      </div>
    `,
    bind(root, onImport) {
      root.querySelector('.importer__input').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const cards = parseCsv(text);
        if (cards.length === 0) return;
        const title = file.name.replace(/\.csv$/i, '');
        const deck = { id: `deck_${Date.now()}`, title, cards };
        onImport(deck);
        // reset so the same file can be re-imported
        e.target.value = '';
      });
    },
  };
}
