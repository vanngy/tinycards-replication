// Words must match exactly (case-sensitive, order-sensitive).
// Punctuation / symbols and extra whitespace (incl. newlines) are ignored.
export function checkAnswer(typed, expected) {
  return normalize(typed) === normalize(expected);
}

function normalize(s) {
  return s
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation / symbols
    .replace(/\s+/g, ' ')             // collapse all whitespace incl. newlines
    .trim();
}
