# Stockfish and game history

## Stockfish dzinēja integrācija backend pusē

Install backend dependencies with `npm ci`. The pinned `stockfish` 19.0.1 package includes the engine JavaScript and WASM assets; no separate executable or Docker image is needed. The backend launches its `lite-single` engine using the current Node runtime. Keep the package's `Copying.txt` and assets when distributing the engine. Source and license: https://github.com/nmrugg/stockfish.js.

Optional: set `STOCKFISH_PATH` in the backend environment to an absolute path to a native Stockfish executable instead. It must support standard UCI. Never set this value from a request. No shell is involved.

`POST /analysis/position` requires the normal login cookie or a Bearer JWT:

```json
{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","depth":12}
```

The response includes `engine`, normalized `fen`, `sideToMove`, `bestMove` (UCI coordinates, or null if no legal move), completed `depth`, `score`, `pv` (UCI coordinates), and `elapsedMs`. Scores always use White's perspective: positive favors White, negative favors Black. `score.type` distinguishes centipawns (`cp`, 100 = 1.00) and mate distance (`mate`). For mate zero, `sideToMove` is the checkmated side.

Depth defaults to 12 and must be an integer from 1 through 18. Each search has one thread, 16 MB hash, a two-second search limit and a 15-second total timeout. At most two engines run per backend process; further requests receive 429 and can retry. Invalid FEN/depth returns 400, missing authentication 401, engine failures 503 and timeouts 504. Processes are cleaned up after every request and on shutdown.

Open `/analyze` while signed in to test a position in the UI. This is position analysis: it does not yet perform whole-PGN analysis, persist move evaluations, calculate accuracy or reconstruct repetition history. Existing accuracy values can be used by game-history sorting; new imports are shown as not analyzed until game analysis is implemented.

Verification: `npm test -- --runInBand` includes the actual bundled engine (starting position, checkmate, stalemate and Black mating), validation, process lifecycle, timeout/concurrency and protected HTTP-boundary tests.

## Filtrēšana, kārtošana un grupēšana

`GET /games/search` requires authentication. It returns only the current user's games; callers cannot supply a different `userId`. The previous `GET /games` endpoint remains available for existing consumers.

All filters combine with AND:

| Query | Values / meaning |
| --- | --- |
| `format` | `BULLET`, `BLITZ`, `RAPID`, `CLASSICAL`, `CORRESPONDENCE` |
| `mode` | `RATED`, `CASUAL` |
| `result` | `WIN`, `LOSS`, `DRAW`, from the linked account's perspective |
| `dateFrom`, `dateTo` | Calendar dates `YYYY-MM-DD`, inclusive UTC days |
| `opening` | Case-insensitive literal substring of ECO or opening name |
| `sortBy` | `date` (default), `elo`, `accuracy` |
| `order` | `desc` (default), `asc` |
| `groupBy` | `none` (default), `opening` |
| `page` | Positive integer, default 1, maximum 1,000,000 |
| `pageSize` | Integer 1–100, default 25 |

The response is `{items, total, page, pageSize, groups}`. Items include `playerResult`, `playerElo`, `playerAccuracy`, `opening`, and `groupKey`. Player identity uses case-insensitive matching against the linked account for the game's platform. Unmatched players have `UNKNOWN` result and null own Elo/accuracy. Unknown games do not match win/loss/draw filters. Missing sort values always appear last; date and ID break ties deterministically.

Filters, ordering, group counts and pagination run in PostgreSQL, in one statement/snapshot, over all matching games. Opening grouping sorts groups by ECO/name, then applies the selected sort within each group. Group counts cover all matches, even when a group spans pages. Unrecognized openings share an Unknown opening group. Opening metadata comes from the linked opening row or PGN ECO/Opening headers. Lichess imports now request opening tags; reimporting the latest games refreshes their PGN without creating duplicates or replacing analyses. Older games without metadata remain Unknown until reimported with opening information.

The game-history UI uses Tailwind and supports filters, grouping, ordering, pagination, loading, empty and error/retry states. Filter state is stored in the URL so refresh/back/bookmarks retain it. Changing a filter resets the page.

Run `npm run test:integration` in backend for PostgreSQL tests. They create and remove isolated randomly named test schemas, never change the application schema/data, and require the existing `DATABASE_URL` plus permission to create schemas. Tests cover ownership, both player colors, combined filters, inclusive dates, literal search, opening fallback, full group counts, pagination, null sorting and invalid ranges. Run `npm test` in frontend for form and history interaction tests.
