# The Round Market (Beta 0.7)

A classroom business simulation. Teams run rival firms selling the same product on one shared market. Each round they choose a supplier, a selling price and a marketing budget, and the market splits total demand between them by how attractive each offer is. Unsold stock carries over at a holding cost; running out sends customers to rivals. The team with the most cash at the end wins.

The instructor controls the story: before each round they pick a market event (a boom, a recession, a supply squeeze, a price war and others), which comes with a short news item to read to the class.

## Playing

Open `index.html` in a browser. There is nothing to install and no server: the whole game is this one file.

One person runs the instructor console on a laptop, ideally connected to a projector. Each team opens the same page on a phone or laptop. The in-app **How the game works** page explains the flow for both roles.

Because there is no server, information moves between devices as short codes:

| Code | Starts with | Direction | What it carries |
|------|-------------|-----------|-----------------|
| Round code | `B` | instructor → everyone | round number and market event; opens the round and its news |
| Decision code | `T` | team → instructor | supplier, units, price, marketing, offer response, round |
| Results code | `R` | instructor → one team | units sold, missed sales, stock left, market share, profit, cash |

Every code ends in a check character, so almost all typing mistakes are caught. Decision codes include the round, so an old code is rejected with a clear message.

Game state is saved in each browser automatically (`localStorage`), so refreshing the page loses nothing. Each device keeps its own copy.

### Hosting it for students

Turn on GitHub Pages for this repository (branch `main`, root folder) and share the resulting link. Students need no account.

## Developing

```bash
npm install     # installs esbuild
npm run build   # bundles src/ into index.html
npm test        # checks the codes, validation and market engine
```

| File | Contents |
|------|----------|
| `src/logic.js` | rules, suppliers, market events and news, code formats, validation, market engine |
| `src/ui.jsx` | all screens (home, guide, team terminal, instructor console, presentation view) |
| `src/styles.css` | the visual design |
| `src/main.jsx` | mounts the app |
| `build.mjs` | produces the single-file `index.html` |
| `tests/logic.test.mjs` | automated checks for `logic.js` |

React 18 is loaded at runtime from cdnjs, with jsDelivr as a fallback; if both fail the page says so instead of staying blank.

### Tuning the game

Most balance changes are one-line edits in `src/logic.js`:

- `SUPPLIERS`: unit cost and delivery reliability of each supplier
- `MARKET_EVENTS`: each event's effect, headline and story
- `NEGOTIATIONS`: the special offers in rounds 3 and 6
- `MAX_ROUNDS`, `HOLDING_COST`, `LIMITS`: game length, cost of unsold stock, input limits

Changing the code formats in `logic.js` makes codes from older versions invalid, so avoid it mid-game.
