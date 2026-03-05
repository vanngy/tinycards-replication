# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Technical overview

**No build step.** Pure vanilla JS ES modules. Open `index.html` directly in a browser, or run a local server:

```bash
npx serve .
# or
python3 -m http.server
```

**No framework.** Every page and component follows a single render contract:

```js
function MyComponent(props) {
  return {
    html: `<div>...</div>`,   // rendered by innerHTML
    bind(root, renderApp) {   // called after innerHTML; attach event listeners here
      root.querySelector('button').addEventListener('click', ...);
    },
  };
}
```

---

## Architecture

### Routing and state (`src/App.js`)
- Single global `state` object: `{ currentView, routeParams, decks, session }`
- `navigate(view, params)` sets `state.currentView` + `state.routeParams`, then calls `renderApp()`
- `renderApp()` calls the current page function and sets `container.innerHTML`
- Views: `home`, `deck`, `study`, `topicEditor`, `batchEditor`, `cardEditor`

### Persistence (`src/storage.js`)
- All state serialized to `localStorage` under key `'flashcard_trainer'`
- `saveToStorage(state)` / `loadFromStorage()` — called explicitly after mutations

### Deck data model
A deck is constructed by `makeDeck()` (`src/logic/makeDeck.js`) and has two modes:

| Mode | When | Batching |
|------|------|----------|
| **Flat** | Cards have no `topic` field | `splitIntoBatches` (chunks of 5 in order) |
| **Topic** | Cards have `topic` field | `buildTopicTree` groups cards by topic/subtopic/subsubtopic, then batches within each leaf node |

Card fields: `front`, `back`, `topic?`, `subtopic?`, `subsubtopic?`, `batchIndex?`

The `batchIndex` field (integer) allows manual batch assignment; `enforceMaxBatchSize` ensures no batch exceeds 5.

### Topic tree (`src/logic/buildTopicTree.js`)
Builds a tree of nodes from card `topic` / `subtopic` / `subsubtopic` fields. Each leaf node has its own `batches` and `progress`. The `ColumnBrowser` component renders this tree.

### Study session (`src/logic/studySession.js`)
In-memory state machine passed through `state.session`. Key functions:
- `createSession(studyTarget, batchIndex, deckId)` — `studyTarget` is either a deck or a topic-tree node (both have `.batches`)
- `submitAnswer(session, typed)` — returns `{ correct, rewriteTriggered, roundComplete, batchUnlocked }`
- `markCorrect(session)` — typo-forgiveness: advances card without dirtying the clean-round flag

### Answer checking (`src/logic/checkAnswer.js`)
Strips punctuation/symbols (`[^\p{L}\p{N}\s]`) and collapses whitespace before comparing. Case-sensitive.
> Note: this diverges from the spec's "exact match" — punctuation and extra whitespace are forgiven.

### CSV format (`src/logic/parseCsv.js`)
Two accepted formats:
- **2-column**: `front,back`
- **5-column topic**: `topic,subtopic,subsubtopic,front,back`

UTF-8 BOM is stripped automatically. Multi-line quoted fields are supported.

---

## Flashcard Writing Trainer — Project Outline

## Project definition
A browser-based personal flashcard trainer for practicing exact written recall with a single study mode.

The project is not an App Store app.
It is a small web project for GitHub that runs in the browser and works with the user's own flashcard decks.

---

## Project goal
Build one study flow only:

- import a flashcard deck
- split the deck into batches of 5 in original order
- show the front of a card
- require the user to type the back exactly and verbatim
- give 2 normal attempts
- after 2 wrong attempts, show the correct answer in low opacity and require the user to rewrite it
- after the first pass through a batch, require 2 clean consecutive rounds on that same batch to unlock the next batch

---

## Core product rule
The app trains exact written recall, not recognition.

A user progresses only by typing the back side correctly.

---

## User flow

### 1. Import deck
The user imports a deck file.

Each flashcard contains only:
- front
- back

### 2. Split deck into batches
The imported deck is split into groups of 5 in chronological order.

Example:
- batch 1 = cards 1–5
- batch 2 = cards 6–10
- batch 3 = cards 11–15

If the last batch has fewer than 5 cards, it remains smaller.

### 3. Study the current batch
For each card in the active batch:
- show the front
- user types the back
- system checks the answer

### 4. Answer logic
For each card:

#### First attempt
- if correct: move on
- if wrong: allow a second normal attempt

#### Second attempt
- if correct: move on
- if wrong: enter rewrite mode

#### Rewrite mode
- show the correct answer in low opacity
- user rewrites the answer exactly
- after completing the rewrite correctly, move on

### 5. Finish first pass of the batch
After all 5 cards are completed once, the batch is not yet unlocked.

The user must now complete mastery rounds for that same batch.

### 6. Mastery rule
To unlock the next batch, the user must complete the current batch correctly twice in a row.

A clean round means:
- every card in the batch was answered correctly
- no card needed rewrite mode

If a mastery round is not clean:
- the streak resets to 0

If a mastery round is clean:
- the streak increases by 1

When the streak reaches 2:
- unlock the next batch

---

## Exact correctness rule
An answer is correct only if the typed text matches the stored back text exactly after trimming spaces at the beginning and end.

This means the app does not ignore:
- capitalization differences
- punctuation differences
- spelling mistakes
- missing words
- extra words
- wrong word order

---

## What the app needs

### Screens

#### Home screen
- project title
- import deck button
- list of available decks

#### Deck screen
- deck title
- total card count
- batch list or batch progress view
- start or continue button

#### Study screen
- current batch number
- current card number
- front text
- text input
- submit button
- feedback message area
- rewrite mode with low-opacity answer
- clean-round streak display

#### Result / progress screen
- round result
- current streak out of 2
- continue button
- unlock message if next batch is opened

---

## Data needed
Keep the data model minimal.

### Card
- front
- back

### Deck
- title
- cards

### Progress
- current batch index
- current card index
- current attempt number
- whether rewrite mode is active
- whether the current round is still clean
- clean streak for the current batch
- highest unlocked batch

---

## Core logic modules

### 1. Deck import
- read CSV
- convert rows into cards with front and back

### 2. Batch splitting
- split cards into chunks of 5 in original order

### 3. Answer checking
- compare typed answer to stored back text
- trim leading and trailing spaces before comparison
- otherwise require exact equality

### 4. Attempt handling
- track first attempt
- track second attempt
- switch to rewrite mode after second wrong attempt

### 5. Round handling
- track whether the round stayed clean
- update streak after each full batch round
- reset streak on any non-clean mastery round

### 6. Unlock handling
- unlock the next batch only after 2 clean consecutive rounds

---

## UI principles
The UI should be inspired by Tinycards in mood, not copied literally.

Use:
- soft playful layout
- rounded cards
- large centered study card
- simple progress indicators
- clean spacing
- friendly but minimal feedback states

The main focus is clarity of the writing interaction.

---

## Recommended project structure

```text
src/
  components/
    DeckImporter
    DeckList
    BatchProgress
    StudyCard
    AnswerInput
    RewritePrompt
    RoundSummary
  logic/
    parseCsv
    splitIntoBatches
    checkAnswer
    studySession
  pages/
    Home
    DeckView
    StudyView
  types/
    card
    deck
    progress
  App
```

---

## Build order

### Phase 1
Build one hardcoded deck and one working study card.

### Phase 2
Add exact answer checking and the 2-attempt rule.

### Phase 3
Add rewrite mode with the low-opacity answer.

### Phase 4
Add batch splitting into groups of 5.

### Phase 5
Add clean-round streak logic and batch unlocking.

### Phase 6
Add CSV import.

### Phase 7
Polish the UI so the project looks coherent and presentable on GitHub.

---

## Definition of done
The project is ready when all of the following work:

- deck import works
- cards are split into ordered groups of 5
- the user answers by typing the back exactly
- the user gets 2 normal attempts
- rewrite mode appears after 2 wrong attempts
- the user must complete 2 clean consecutive rounds to unlock the next batch
- progress is visible and understandable
- the browser UI is polished enough to present on GitHub

---

## Current project next steps

