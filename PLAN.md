# Peek Pigeon / ちらっと鳩 — Build Notes

**Glance. Choose. Confirm. Reply.**

## Idea

A wearer of Even Realities G2 reads one short message from a chosen Telegram group, picks one of three preset replies with the ring, checks the chat and the full text, and sends with one explicit tap. The chat and original message stay pinned even if another notification arrives mid-reply, and a reply of unknown delivery status is never resent.

Demo scene: shopping with full hands, the crew asks "Can you arrive in five minutes?" — one ring move, one confirmation, sent. Sample data only; not intended for use while driving.

## What was built (Heads Up, Nov 23–29, 2026)

- Read → choose → confirm → send flow on the 576×288 single-green G2 screen, with five states.
- Runs in the official Even Hub simulator 0.9.5 (automation run passed); unit tests 21/21; build and dependency audit clean.
- Telegram Bot API adapter exercised 100 times against a stand-in endpoint (`telegram.invalid`); the reply goes out as the bot, and the app says so on screen.
- Token-free browser mock: https://inunanba.github.io/peek-pigeon/
- Normal and single-colour line-art logos.

## Where to look

- `README.md` — overview, how to run, who it is for.
- `src/`, `server/`, `test/` — the app, the Bot API adapter, and the tests.
- `art/` — logos.

## Design notes

- Related community projects (public READMEs, read 2026-11-23; no code copied): mfethe1/even-g2-apps, tiagodeoliveira/ERGram, invendor/even-bridge. Peek Pigeon focuses on one short, safe confirm-then-send moment.
- Credit: inunanba.
