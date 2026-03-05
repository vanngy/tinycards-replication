function escapeCsvField(value) {
  const s = String(value ?? '');
  return (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

export function exportDeckAsCsv(deck) {
  const hasTopics = deck.cards.some(c => c.topic);
  let csv;
  if (hasTopics) {
    csv = 'topic,subtopic,subsubtopic,front,back\n' +
      deck.cards.map(c => [c.topic, c.subtopic, c.subsubtopic, c.front, c.back]
        .map(escapeCsvField).join(',')).join('\n');
  } else {
    csv = 'front,back\n' +
      deck.cards.map(c => [c.front, c.back].map(escapeCsvField).join(',')).join('\n');
  }
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deck.title}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Split a single row's text into fields (no newline handling — used for row-unwrapping)
function splitFields(text) {
  const fields = [];
  let col = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (ch === '"') {
        if (next === '"') { col += '"'; i++; }
        else { inQuote = false; }
      } else {
        col += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(col); col = ''; }
      else { col += ch; }
    }
  }
  fields.push(col);
  return fields;
}

// Character-level CSV state machine — handles multi-line quoted fields and escaped quotes
export function parseCsv(text) {
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let col = '';
  let fields = [];
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"') {
        if (next === '"') {
          col += '"'; // escaped quote
          i++;
        } else {
          inQuote = false;
        }
      } else {
        col += ch; // newlines inside quotes are preserved
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        fields.push(col);
        col = '';
      } else if (ch === '\r' && next === '\n') {
        fields.push(col);
        col = '';
        rows.push(fields);
        fields = [];
        i++; // skip \n
      } else if (ch === '\n' || ch === '\r') {
        fields.push(col);
        col = '';
        rows.push(fields);
        fields = [];
      } else {
        col += ch;
      }
    }
  }

  // flush last field/row
  if (fields.length > 0 || col) {
    fields.push(col);
    if (fields.some(f => f.trim())) rows.push(fields);
  }

  if (rows.length === 0) return [];

  // Unwrap "row-wrapped" export bug: entire row quoted as a single field.
  // Example: "topic,subtopic,subsubtopic,front,""back"""
  // Re-split any single-field row using the field splitter.
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length === 1) rows[i] = splitFields(rows[i][0]);
  }

  // Detect 5-column topic format: topic,subtopic,subsubtopic,front,back
  const header = rows[0];
  const isFiveCol =
    header[0]?.toLowerCase() === 'topic' &&
    header[4]?.toLowerCase() === 'back';

  if (isFiveCol) {
    return rows
      .slice(1)
      .filter(r => r.length >= 5 && (r[3].trim() || r[4].trim()))
      .map(r => {
        const card = { front: r[3].trim(), back: r[4].trim() };
        if (r[0].trim()) card.topic = r[0].trim();
        if (r[1].trim()) card.subtopic = r[1].trim();
        if (r[2].trim()) card.subsubtopic = r[2].trim();
        return card;
      });
  }

  // 2-column format: front,back
  return rows
    .slice(1)
    .filter(r => r.length >= 2 && (r[0].trim() || r[1].trim()))
    .map(r => ({ front: r[0].trim(), back: r[1].trim() }));
}
