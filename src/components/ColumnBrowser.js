import { BatchProgress } from './BatchProgress.js';

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectLeafNodes(nodes, acc) {
  for (const node of nodes) {
    if (node.directCards.length > 0) acc.push(node);
    if (node.children.length > 0) collectLeafNodes(node.children, acc);
  }
}

function childProgressHtml(children) {
  const rows = children.map(child => {
    const leaves = [];
    collectLeafNodes([child], leaves);
    let mastered = 0, total = 0;
    for (const leaf of leaves) {
      total += leaf.batches.length;
      mastered += (leaf.progress?.batches || []).filter(b => b.status === 'mastered').length;
    }
    const pct = total > 0 ? Math.round(mastered / total * 100) : 0;
    return `
      <div class="topic-progress__row">
        <span class="topic-progress__label">${escHtml(child.label)}</span>
        <div class="topic-progress__bar"><div class="topic-progress__fill" style="width:${pct}%"></div></div>
        <span class="topic-progress__pct">${pct}%</span>
      </div>`;
  }).join('');
  return `<div class="topic-progress">${rows}</div>`;
}

function isNodeMastered(node) {
  if (node.directCards.length > 0) {
    return node.progress?.deckComplete === true;
  }
  if (node.children.length === 0) return false;
  return node.children.every(child => isNodeMastered(child));
}

function computeLockedSet(items) {
  const locked = new Set();
  for (let i = 1; i < items.length; i++) {
    if (!isNodeMastered(items[i - 1])) {
      locked.add(items[i].label);
    }
  }
  return locked;
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

  const lockedSets = colData.map(items => computeLockedSet(items));

  function renderCol(items, colIndex) {
    if (items.length === 0) {
      return `<div class="col-browser__col col-browser__col--empty" data-col="${colIndex}"></div>`;
    }
    const lockedSet = lockedSets[colIndex];
    const itemsHtml = items.map(node => {
      const isSelected = selectedNodes[colIndex]?.label === node.label;
      const isLocked = lockedSet.has(node.label);
      const hasChildren = node.children.length > 0;
      const selClass = isSelected ? ' col-browser__item--selected' : '';
      const lockClass = isLocked ? ' col-browser__item--locked' : '';
      const arrow = hasChildren ? `<span class="col-browser__arrow">›</span>` : '';
      const lockIcon = isLocked ? `<span class="col-browser__lock">🔒</span>` : '';
      return `<div class="col-browser__item${selClass}${lockClass}" data-label="${escHtml(node.label)}" data-col="${colIndex}">
        <span class="col-browser__item-label">${escHtml(node.label)}</span>
        ${lockIcon}${arrow}
      </div>`;
    }).join('');
    return `<div class="col-browser__col" data-col="${colIndex}">${itemsHtml}</div>`;
  }

  const colsHtml = [0, 1, 2].map(i => renderCol(colData[i], i)).join('');

  // Deepest selected node is the active node
  const activeNode = selectedNodes[selectedNodes.length - 1] ?? null;
  const activeColIndex = selectedNodes.length - 1;
  const isActiveLocked = activeNode
    ? (lockedSets[activeColIndex] ?? new Set()).has(activeNode.label)
    : false;

  let panelHtml = '';
  if (activeNode) {
    if (activeNode.batches.length > 0) {
      const bp = BatchProgress({
        batches: activeNode.batches,
        batchProgress: activeNode.progress.batches,
        highestUnlocked: activeNode.progress.highestUnlockedBatch,
        deckComplete: activeNode.progress.deckComplete || false,
      });
      let btnHtml;
      if (activeNode.progress.deckComplete) {
        btnHtml = `<p class="deck-complete-msg">All batches mastered!</p>`;
      } else if (isActiveLocked) {
        btnHtml = `<button class="btn btn--primary btn--full study-btn" disabled>🔒 Locked</button>`;
      } else {
        btnHtml = `<button class="btn btn--primary btn--full study-btn">
            ${activeNode.progress.highestUnlockedBatch === 0
              ? 'Start Batch 1'
              : `Continue — Batch ${activeNode.progress.highestUnlockedBatch + 1}`}
           </button>`;
      }
      panelHtml = `
        <div class="col-browser__panel">
          <div class="col-browser__panel-title">${escHtml(activeNode.label)}</div>
          <div class="col-browser__panel-meta">${activeNode.directCards.length} cards &middot; ${activeNode.batches.length} batch${activeNode.batches.length !== 1 ? 'es' : ''}</div>
          ${bp.html}
          ${btnHtml}
        </div>`;
    } else if (activeNode.children.length > 0) {
      panelHtml = `
        <div class="col-browser__panel">
          <div class="col-browser__panel-title">${escHtml(activeNode.label)}</div>
          <div class="col-browser__panel-meta">${activeNode.children.length} subtopic${activeNode.children.length !== 1 ? 's' : ''}</div>
          ${childProgressHtml(activeNode.children)}
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
          if (lockedSets[colIndex].has(label)) return;
          const newPath = selectedPath.slice(0, colIndex).concat(label);
          onSelect(newPath);
        });
      });
      const studyBtn = root.querySelector('.study-btn');
      if (studyBtn) {
        studyBtn.addEventListener('click', () => {
          if (!isActiveLocked) onStudy(activeNode);
        });
      }
    },
  };
}
