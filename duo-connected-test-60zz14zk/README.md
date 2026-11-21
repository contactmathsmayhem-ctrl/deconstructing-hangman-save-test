# Deconstructing Hangman — connected duo test 60ZZ14ZK

Prepared and tested locally. Nothing has been deployed, enabled or changed on Netlify. The existing site address, privacy and plan remain unchanged.

## What changed

The illustrated duo screen now has a server adapter. Welcome → Play with a friend opens Create match / Join match / Return to connected match / One-tablet test. Each connected player selects their own character. The screen reads shared rounds from the server and sends only that player's actions. Names, hidden balances, item losses, slime, correct/incorrect results, the winner bonus and independent rematch choices use server state. Rebuilds clear slime first and restore the figure in 1.2-second steps. Character frames must finish loading before rebuilding starts.

All changes to the passed 60ZZ14ZI HTML are confined to the duo script and added connection styles. Solo and its saving/loading code are unchanged. The original one-tablet simulation remains under ONE-TABLET TEST. A downloaded standalone HTML can use this simulation; online create/join requires the server version.

This is a connected test build, not a release-ready online service. Real ads, real purchases, messaging, account-backed balances and production abuse protection remain separate work. Connected test rooms start each player at 90 Slime Bucks; they do not import or change solo balances.

## Local checks

Run `npm ci`, then `npm test` with Node 22 or later. The suite contains 11 server tests and two DOM integration tests. The DOM tests simulate two independent clients running the actual duo script against the same in-memory service, through wagers, answer concealment, deductions, a six-loss match, the winner bonus, rebuilds and the next round. They also check the one-tablet fallback. They do not provide a visual browser check or execute the character artwork's internal iframe scripts.

Run `npm run dev:connection`, then open http://127.0.0.1:8787/index.html in two tabs. Select Play with a friend; create in the first tab and join its code in the second. Each tab keeps its own private token in sessionStorage. A separate basic diagnostic page is at http://127.0.0.1:8787/connection-test.html. Temporary rooms disappear when this local server restarts. No Netlify account or database is used locally.

Both players share a 12-second window beginning when the second wager locks. Switching tabs does not pause the clock. Expired answers are rejected and timeouts settled by the server. Closing a normal result waits for both players before the next round. End-of-match choices belong independently to each player.

## Hosted preparation — not deployed

The pinned dependencies and lockfile include `pg` and `@netlify/database`. The SQL migration follows Netlify's documented `netlify/database/migrations/<number>_<slug>/migration.sql` layout. The function uses `getConnectionString()` with a Postgres pool and row locks to serialize player actions.

A build-capable deployment must target the EXISTING glittering-churros-0b8e55 project. A static HTML drop cannot install the endpoint or database. Do not create another site, change its address or change privacy. Deploying the database integration may provision services and consume credits. No deployment or activation has been performed by this package. Access for an actual friend remains a separate hosting decision.

Endpoint: POST `/.netlify/functions/hangman` with JSON. Operations: `create` (nickname), `join` (code, nickname), `state` (code, token), `action` (code, token, action). Tokens are hashed in stored rooms, never exposed to opponents, and should not be logged or put in invite URLs. Each action includes a unique id and current round. An uncertain action is retried once with the SAME id. The recent-action deduplication window is 128 successful actions per room; real payments and rewards require durable receipt records beyond this window.

Hosted test credits default to DISABLED. For an explicitly authorized private test, `HANGMAN_ALLOW_TEST_CREDITS=true` permits the illustrated test shop/ad to request diagnostic credits. Without that flag the server rejects credits and the screen does not fake a balance increase. Never use this endpoint as a real shop or rewarded ad mechanism.

Rooms expire after six hours. Automated removal of expired rows, rate limiting, invitation brute-force protection, operational monitoring and secure real-reward verification remain deployment work. Question banks are the small current duo test banks.

## Verification limits

The live Postgres connection, Netlify function build, hosted migration execution, site access controls and actual devices have not been tested. A browser launch was blocked in this execution environment; the DOM integration tests validate control/state behavior, not appearance. The character artwork and its original visibility/rebuild bridges are retained and need a visual check on the tablet.

References checked November 21, 2026:
- https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
- https://docs.netlify.com/build/data-and-storage/netlify-database/tooling/

## Repository build

This isolated folder preserves the existing repository root Save Detective page. Set the EXISTING Netlify project base directory to `duo-connected-test-60zz14zk`. Build command: `node scripts/assemble-game.mjs`; publish directory: `public`. Eleven compressed payload parts rebuild the exact tested HTML, verified by SHA-256. This avoids changes to embedded artwork or solo code. Do not publish this source folder as static files: run its build first.
