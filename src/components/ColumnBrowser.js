import { BatchProgress } from './BatchProgress.js';

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ColumnBrowser({ topicTree, selectedPath, onSelect, onStudy }) {
  // Walk selectedPath to resolve selectedNodes[0..2]
  const selectedNodes = [];
  let currentLevel = topicTree;
  for (const label of selectedPath) {
    const node = currentLevel.find(n => n.label === label);
    if (!node) break;
    selectedNodes.push(node);
    currentLevel = node.children;
  }

  const colData = [
    topicTree,
    selectedNodes[0]?.children ?? [],
    selectedNodes[1]?.children ?? [],
  ];

  function renderCol(items, colIndex) {
    if (items.length === 0) {
      return `<div class="col-browser__col col-browser__col--empty" data-col="${colIndex}"></div>`;
    }
    const itemsHtml = items.map(node => {
      const isSelected = selectedNodes[colIndex]?.label === node.label;
      const hasChildren = node.children.length > 0;
      const selClass = isSelected ? ' col-browser__item--selected' : '';
      const arrow = hasChildren ? `<span class="col-browser__arrow">›</span>` : '';
      return `<div class="col-browser__item${selClass}" data-label="${escHtml(node.label)}" data-col="${colIndex}">
        <span class="col-browser__item-label">${escHtml(node.label)}</span>
        ${arrow}
      </div>`;
    }).join('');
    return `<div class="col-browser__col" data-col="${colIndex}">${itemsHtml}</div>`;
  }

  const colsHtml = [0, 1, 2].map(i => renderCol(colData[i], i)).join('');

  // Deepest selected node is the active node
  const activeNode = selectedNodes[selectedNodes.length - 1] ?? null;

  let panelHtml = '';
  if (activeNode) {
    if (activeNode.batches.length > 0) {
      const bp = BatchProgress({
        batches: activeNode.batches,
        batchProgress: activeNode.progress.batches,
        highestUnlocked: activeNode.progress.highestUnlockedBatch,
        deckComplete: activeNode.progress.deckComplete || false,
      });
      const btnHtml = activeNode.progress.deckComplete
        ? `<p class="deck-complete-msg">All batches mastered!</p>`
        : `<button class="btn btn--primary btn--full study-btn">
            ${activeNode.progress.highestUnlockedBatch === 0
              ? 'Start Batch 1'
              : `Continue — Batch ${activeNode.progress.highestUnlockedBatch + 1}`}
           </button>`;
      panelHtml = `
        <div class="col-browser__panel">
          <div class="col-browser__panel-title">${escHtml(activeNode.label)}</div>
          <div class="col-browser__panel-meta">${activeNode.directCards.length} cards &middot; ${activeNode.batches.length} batch${activeNode.batches.length !== 1 ? 'es' : ''}</div>
          ${bp.html}
          ${btnHtml}
        </div>`;
    } else {
      panelHtml = `
        <div class="col-browser__panel col-browser__panel--hint">
          <span class="col-browser__panel-hint-msg">Select a subtopic to study</span>
        </div>`;
    }
  }

  return {
    html: `
      <div class="col-browser">
        <div class="col-browser__columns">${colsHtml}</div>
        ${panelHtml}
      </div>
    `,
    bind(root) {
      root.querySelectorAll('.col-browser__item').forEach(item => {
        item.addEventListener('click', () => {
          const label = item.dataset.label;
          const colIndex = parseInt(item.dataset.col, 10);
          const newPath = selectedPath.slice(0, colIndex).concat(label);
          onSelect(newPath);
        });
      });
      const studyBtn = root.querySelector('.study-btn');
      if (studyBtn) {
        studyBtn.addEventListener('click', () => onStudy(activeNode));
      }
    },
  };
}
