# Profile, authorization, and Lichess imports

## Implemented behavior

- The Tailwind profile page loads the current user's details through GET /user/me.
- PATCH /user/me saves username, email, and an optional new password. Password hashes are never returned.
- Username/email are normalized. Invalid, empty, null, overly long, or duplicate values receive validation errors.
- The page handles loading, retry, save feedback, and failed updates; unchanged/invalid forms cannot be submitted. Fields are disabled while saving.
- Desktop and mobile layouts were inspected using an isolated fixture API; no browser warnings/errors occurred.
- POST /auth/signin returns an HS256 accessToken and sets an HttpOnly, SameSite=Lax cookie. Tokens expire after one hour.
- Protected routes accept either Authorization: Bearer TOKEN or the access_token cookie. Missing, invalid, expired, or deleted-user tokens return 401.
- requireRole('ADMIN') returns 403 for USER. Roles are read from the database on each request.
- User administration endpoints are protected; public signup cannot set a role.
- POST /games/lichess/import accepts JSON { "limit": 100 }. Allowed range: integer 1–300. Default: 100.
- The importer requests the latest finished games, handles API errors/timeouts/malformed NDJSON and returns retry information for HTTP 429.
- Each imported game uses the authenticated userId; upserts preserve existing records/analyses and report imported/skipped counts.
- Concurrent imports for the same user on one server return 409. Database uniqueness also prevents concurrent duplicate inserts.

## Home navigation and private routes

- The public home page has a Log in button on desktop and mobile; signed-in users see Profile.
- Analyze, Games, Statistics, and Profile verify the current session before rendering private content.
- Signed-out visitors are redirected to /login?redirect=...; successful login returns them to the intended local page.
- The destination survives the signup flow. External redirect destinations are rejected.
- Authentication-check network/server failures show a retry screen rather than silently treating the user as signed out.

## Game uniqueness

The existing schema uses @@unique([userId, platform, externalId]). This deliberately preserves a separate game collection for each user. A global [platform, externalId] key would prevent two users from importing a game they played against each other. The existing Chess.com importer continues to use createMany with skipDuplicates against this database key.

## Database setup required before use

The connected remote database has not applied migration 20261020110400_user_scoped_game_uniqueness. Application schema/data were not migrated during this task.

From backend, when ready to apply the pending migration:

    npx prisma migrate deploy
    npx prisma generate

Restart the backend after deployment. Sign in again to receive the JWT cookie.

Set JWT_SECRET to a private, high-entropy value. The existing SESSION_SECRET is accepted as a compatibility fallback. FRONTEND_ORIGIN defaults to http://localhost:5173; PORT defaults to 3000.

## Verification

Backend: npm test -- --runInBand
Frontend: npm test
Database: npm run test:integration (backend)

The database integration suite creates its own uniquely named test schema, applies both existing migrations there, verifies real profile persistence and per-user import deduplication, then removes the test schema. It needs a configured DATABASE_URL and permission to create temporary schemas. It never migrates the application's public schema.

94 backend tests, 15 frontend tests, and 1 PostgreSQL integration test passed. Production builds, backend ESLint, frontend Oxlint, browser validation/save/reload behavior, and a one-game live Lichess export were checked.

No separate approved profile design file was provided; the existing charcoal/orange design and Tailwind components were retained. Stakeholder design approval remains a review step.

Lichess account linking continues to verify that a public username exists; it is not OAuth ownership verification.
