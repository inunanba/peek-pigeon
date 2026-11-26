# Peek Pigeon / ちらっと鳩

**Glance. Choose. Confirm. Reply.**

[Try the browser mock](https://inunanba.github.io/peek-pigeon/) · Even Realities Heads Up · Messaging & News (Telegram)

![Peek Pigeon](./art/pigeon-256.png)

Peek Pigeon is a hands-light Telegram reply flow for Even Realities G2. A wearer sees one sample message from a chosen bot-participating chat, chooses one of three preset replies, checks the chat and full reply text, then sends with one explicit tap.

Peek Pigeon was built during Heads Up (Nov 23–29, 2026). You can run the whole flow today: a sample Telegram message appears on the 576×288 single-green G2 screen, three preset replies are one ring-move apart, and a last screen shows the chat and the exact text before one tap sends it. It runs in the official Even Hub simulator 0.9.5, with a Telegram Bot API adapter that we exercised 100 times against a stand-in endpoint (`telegram.invalid`).

A token-free [browser mock](https://inunanba.github.io/peek-pigeon/) shows the same read → choose → confirm → send flow.

## Who it is for

People who wear Even G2 and follow a Telegram group that matters to them — a project crew, an event team, a study group — and want to answer without stopping what they are doing.

## Why it matters

Your crew asks, “Can you arrive in five minutes?” while your hands are full. Answering can mean taking out a phone, finding the group, reading back, typing, and double-checking who receives the reply. Peek Pigeon turns that interruption into a glance, a ring move, and one tap while keeping the two decisions that matter visible: **which chat receives the reply** and **what will be sent**.

## Demo flow

1. A sample message from the chosen chat appears.
2. The 576×288 single-green interface shows the message and three preset replies.
3. R1 ring or simulator input moves the selection.
4. The confirmation screen shows the chat and the full reply text; the send is tied to that one source message.
5. One explicit tap sends once through the injected stand-in transport.
6. A newer message waits its turn, double taps send once, and an unclear delivery answer becomes “Check Telegram” without another send.

The same confirmation step protects the final choice whether suggestions come from presets today or another suggestion source in the future.

## Run locally

Requirements: Node.js 24.x and npm.

```bash
npm install
npm run check
npm run validate:100
npm run dev
```

Open the Vite URL. **Previous** and **Next** simulate R1 selection; **Tap** advances the flow.

For the official simulator 0.9.5, serve the app, start the simulator with automation port 9898, then run:

```bash
npm run automation
```

For another port or evidence path:

```bash
EVEN_SIM_URL=http://127.0.0.1:9899 \
EVEN_SIM_CONFIRMING_SCREENSHOT=artifacts/simulator-confirming.png \
npm run automation
```

The harness drives click/down/click/click, requires READING → CHOOSING → CONFIRMING → SENDING → SENT, saves the 576×288 CONFIRMING frame, and rejects uncaught or input errors.

## Architecture

- `src/`: sample-message state machine and 576×288 Even Hub UI.
- `server/telegram-transport.js`: server-side Telegram transport with runtime-only token input.
- `scripts/simulator-automation.mjs`: official simulator automation and framebuffer evidence.
- `scripts/mock-100-run.mjs`: deterministic adapter repetition with injected stand-in fetch.
- `TELEGRAM_RUNBOOK.md`: checklist for a live Telegram test.

The server adapter accepts only the chosen chat, ties a one-time send ID to the exact chat, source message, and reply text, and collapses duplicate taps into one send. If Telegram’s answer is unclear, the send ID becomes “Check Telegram” and cannot send again. The adapter rejects redirects, unexpected addresses, and token path delimiters.

## Verified evidence

| What it shows | How to check | Scope |
|---|---|---|
| Read → choose → confirm → send | `npm test` and [session tests](./test/session.test.js) | Sample messages |
| The selected chat and message stay fixed | [model tests](./test/model.test.js) | Sample messages |
| Concurrent taps send once | [Telegram adapter tests](./test/telegram-transport.test.js) | Stand-in endpoint |
| An unclear answer does not send again | HTTP 408/timeout cases in [Telegram adapter tests](./test/telegram-transport.test.js) | Stand-in endpoint |
| Even Hub input and display adapter | [SDK adapter tests](./test/even-sdk-adapter.test.js) | SDK 0.0.16 |
| Official simulator flow | [576×288 confirmation frame](./evidence/simulator-confirming.png) and `npm run automation` | Official simulator 0.9.5 |
| Current code checks | `npm run check`: 21/21 tests and production build; `npm audit`: 0 vulnerabilities | Local build |
| Repeated sends | `npm run validate:100`: 100 sample messages, each tapped twice, 100 sends, 0 extra sends; each run stays well under 0.1 ms inside the adapter | Adapter test, `telegram.invalid` |

## Safety by design

- Nothing sends on its own: the chat and the full reply are on screen before the sending tap.
- Replies go out as the Telegram bot in groups the bot belongs to — never as the wearer’s personal account.
- The bot token stays on the server; it is not in the app, the fixtures, or the repository.
- Message text and audio are not written to logs.
- If Telegram’s answer is unclear, the app shows “Check Telegram” and does not send again.

See the [checklist for a live Telegram test](./TELEGRAM_RUNBOOK.md).

## What existed before Nov 23

Before the hackathon: only the project plan, design notes, a validation plan, and logo drafts. All app code (`src/`, `server/`, `scripts/`, `test/`) was written during the hackathon.

## Submission package

- [Video script and storyboard](./VIDEO_PLAN_DRAFT.md)
- [DoraHacks BUIDL description — English](./DORAHACKS_BUIDL_EN.md)
- [DoraHacks BUIDL description — Japanese](./DORAHACKS_BUIDL_JA.md)
- [API request candidates](./API_REQUESTS_DRAFT.md)
- [Validation details](./VALIDATION.md)
- [Design](./DESIGN.md)

## Credit and license

Made by **inunanba**.

This project is released under the [MIT License](./LICENSE).
