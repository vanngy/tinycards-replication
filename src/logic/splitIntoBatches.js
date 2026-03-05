// Split an array of cards into chunks of `size` in original order.
// Last batch may be smaller if cards.length is not a multiple of size.
export function splitIntoBatches(cards, size = 5) {
  const batches = [];
  for (let i = 0; i < cards.length; i += size) {
    batches.push(cards.slice(i, i + size));
  }
  return batches;
}
