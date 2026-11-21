# Deconstructing Hangman — Solo Focus 01

Created 22 November 2026. This is the separate Solo development copy for a Solo-first release.

## Home screen

- PLAY SOLO is the primary action and opens the existing eight-character selector.
- CHALLENGE A FRIEND remains visible with a diagonal COMING SOON ribbon.
- Tapping that teaser opens a short explanation, with no promised release date.
- The connected Duo controller and its server calls are absent from this Solo build.

Solo questions, difficulty, wagers, character loss/rebuild, milestone rewards and save/restore retain their existing code. This is a working development copy; advertising and payment controls still use the existing test/preview behaviour.

## Build and test

From this repository root: `node solo-release/build.mjs`.
The generated static site is in `solo-release/dist/`.

To run the Solo tests, install this folder's development dependencies and run `npm test` here after building. Three integration checks cover the teaser and all eight selections, a question with loss/deduction and restored progress, and image paths plus parsing of all embedded character scripts. They simulate browser behaviour; mobile visual testing remains necessary.

For local use, extract the complete ZIP and open `index.html` in a browser, keeping `game-assets` beside it. If a device's file viewer restricts webpage files, serve the extracted folder as a static website. Stay with the same opening address/path for save/restore; browser saves do not transfer automatically from the Netlify site to a local copy.

For future static hosting, publish the contents of `dist`. No Duo functions or database are required. Do not change the existing Duo site's deployment settings while testing this separate copy.

## Preserved Duo checkpoints

- Preserved branch: `duo-preserved-2026-11-22`.
- Last deployed/tested Duo: `f955b3536001288122c6f8ccf95b2a67c637ad74`. Visible count badges and the “Mark messages as read and close” label work; this version still counts retained messages on both bubbles.
- Latest saved Duo source: `ac238ff181a723350e15a732a55d295d61c1bcd9`. Changes the visible badge to unread incoming messages only and removes the outgoing count. All 19 tests passed, but Netlify did not publish it because deployment credits were exhausted.
- The preserved branch pins that latest source and includes the older deployed checkpoint in its history.
- Both-player connection, shared rounds/results, balance deductions, refresh/resume, rebuild/rematch, separate carts, test top-ups and message exchange were exercised in two tabs. Separate-device and longer disconnection checks remain; real ads and payments are not connected.

Duo can be resumed later as an optional update. Its code and checkpoint history remain preserved independently of this Solo copy.
