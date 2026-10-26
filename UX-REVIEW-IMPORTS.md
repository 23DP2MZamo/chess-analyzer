# Readable UI, game review and sample imports

## Changes checked before implementation

The current base is `0db2137` (backend admin controls). It adds `User.isBlocked`, blocks authentication for blocked accounts, and adds admin user-management routes. The earlier Stockfish and game-filter commits have been merged. Their role/ownership checks remain in use.

The application database was behind the already committed user-scoped game uniqueness and admin-user migrations. Both were applied successfully before creating the separate demo account. These changes add no further schema migration.

## Readable, usable cards

Home feature cards are single semantic links with 16px body text, larger labels/headings, stronger contrast, pointer cursor, whole-card hover and visible keyboard focus. Content flows normally rather than being absolutely positioned, so larger text and narrow screens do not overlap. Home navigation and supporting copy, game controls, profile labels and stats labels are more readable. Passive information cards retain their normal semantics.

## Review an imported game

Open Your games and choose **Analyze game** in the game’s first table cell. The protected `/analyze/games/:gameId` page loads the stored PGN, shows a board and replay controls, and starts a quick Stockfish review if no saved review exists. No FEN input is required.

Progress is polled while every played move is evaluated. Results include move evaluations, suggested moves, and evaluation-loss labels. Saved moves are ordered by full-move number, then White before Black, using the database enum order. The complete result is saved atomically in the existing Analysis / MoveAnalysis tables for real imported games and can be reopened after refresh or service restart. A failed/cancelled job never saves a partial move list. Saved reviews are reused when reopening a game.

The quick review searches to depth 10 with a 250ms per-position search budget (actual depth can be lower). It sends the move history to Stockfish so repetition history is available. It supports standard-chess PGNs with at most 200 full moves, bounds PGN size, allows at most two active reviews per backend process and one per user, and cleans up work during shutdown. Progress for active jobs is in memory; after a server restart, unfinished jobs can be restarted from the UI. Completed reviews remain in PostgreSQL.

Move labels use centipawn loss from the moving player's perspective: 100 = inaccuracy, 200 = mistake, 300 = blunder; the engine best move and forced moves are identified separately. These are quick-review heuristics, and deeper searches can change them. No invented accuracy percentage is stored; existing accuracy values are preserved. Sample review results are kept only in memory and do not affect personal history or statistics.

Protected API:

- `GET /analysis/samples` — labeled practice games.
- `GET /analysis/games/:id` — owned game details and legal move history (or a whitelisted sample).
- `POST /analysis/games/:id` — start a review; duplicate active requests reuse the same job.
- `GET /analysis/games/:id/status` — progress, failure, cancellation or persisted result.
- `DELETE /analysis/games/:id` — stop the current user's active review.

Blocked/missing authentication is rejected by the existing JWT guard. Real games always use `{id, userId}` ownership checks; another user's game returns 404.

## Optional position analysis

The existing FEN analyzer remains available, with a board preview and three clickable presets: starting position, mate in one, and rook endgame. Client validation recognizes empty input, incomplete FEN, game links, accidentally pasted PGN, missing kings and illegal check/turn combinations. It displays actionable errors beside the input and disables submission until valid. Server validation remains authoritative.

The expandable help guide explains FEN versus PGN, how to copy a position or export a game record, where a profile username appears in a link, and how to use account import. It links to official Chess.com help and the Lichess analysis board. Whole-game review is the primary path for imported games.

Sources used for the help text:
- https://support.chess.com/en/articles/8598397-what-are-pgn-fen
- https://support.chess.com/en/articles/8705305-how-do-i-get-a-pgn-of-my-game
- https://support.chess.com/en/articles/14463498-how-do-i-share-a-game-link-pgn-gif-or-image
- https://lichess.org/analysis

## Sample data

When the user has no imported games, the library shows three explicitly labeled sample cards in a separate preview section. Sample cards open the same review flow without inserting fake games into the user's account. `totalOwned` in game-search responses distinguishes an empty library from filters that match zero games. An empty filtered result does not replace existing history with samples.

For database fixtures, run from backend:

```powershell
$env:DEMO_EMAIL = 'demo-preview@example.test'
$env:DEMO_PASSWORD = 'your-own-long-test-password'
npm run seed:games
```

This creates a separate USER account named `demo-preview`, a mock Chess.com linked identity, and three valid sample games (win, loss and draw across different formats). It only accepts an email at `example.test`; it does not inject data into real accounts. Re-running with the original password is idempotent, does not reset the password and does not duplicate games. Keep this identity for testing rather than syncing it from the real Chess.com API.

A demo account with three games has been seeded in the configured application database. Its generated login details are stored outside the repository in the local handoff output. No real user's credentials or game records were changed.

## Verification

Tests cover card navigation and semantics; FEN presets and helpful errors; imported-game links; empty-library sample fallbacks; review loading, progress, replay, saved results and retry; ownership/authentication; engine failures, cancellation, concurrency and atomic persistence; and idempotent demo seeding. The bundled Stockfish engine is exercised for both single positions and a complete sample game.

The existing PostgreSQL integration suites were updated to apply the newly committed admin migration when constructing their isolated schemas. New database tests use a separate randomly named schema that is removed after verification, without modifying application records.
