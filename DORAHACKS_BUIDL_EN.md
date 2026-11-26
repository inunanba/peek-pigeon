# Peek Pigeon — Glance. Choose. Confirm. Reply.

**Track:** 01 Messaging & News (Telegram). Also a fit for Best Telegram integration.

## The problem
Your crew asks, "Can you arrive in five minutes?" while your hands are full. Answering means taking out your phone, finding the group, reading back, typing, and double-checking who you are replying to. A two-line message becomes a two-minute interruption.

## Who it is for
People who wear Even G2 and follow a Telegram group that matters to them — a project crew, an event team, a study group — and want to answer without stopping what they are doing.

## What it does
Peek Pigeon shows one message from the chat you picked on the G2 display. Ring input moves between three short replies. A last screen shows which chat will receive the reply and the exact words, and one tap sends it — once.

- A message that arrives meanwhile waits its turn; it never swaps the one you are answering.
- Tapping twice still sends one reply.
- If Telegram's answer is unclear, the app says "Check Telegram" instead of sending again.

## How it works
An Even Hub WebView app (Even Hub SDK 0.0.16) runs a simple flow: read, choose, confirm, send, then sent or "check Telegram". A small server adapter talks to the Telegram Bot API, so the bot token never enters the app. It accepts only the chat you chose, gives each reply a one-time send ID tied to its exact text, and refuses redirects and unexpected addresses.

## What we ran
- Official Even Hub simulator 0.9.5: the whole flow from reading to sent, with the selected reply checked, a 576×288 confirmation screen captured, and 0 console errors.
- 21 of 21 automated tests pass; the production build passes; npm audit reports 0 vulnerabilities.
- 100 sample messages through the Telegram adapter (stand-in endpoint `telegram.invalid`): 100 replies sent, each tapped twice, 0 extra sends. Each run takes well under 0.1 ms inside the adapter.

## Safety by design
Nothing sends on its own. The chat and the full reply are on screen before the sending tap. Replies go out as the Telegram bot in groups the bot belongs to. Tokens stay on the server and message text is kept out of logs.

## Why it fits the track
It turns Telegram read-and-write into a glance, a ring move and a tap, designed for the 576×288 green display and R1 input instead of shrinking a phone screen.

## Try it
`npm install`, `npm run check`, `npm run validate:100`, `npm run dev`; the official simulator flow runs with `npm run automation`. Setup and evidence links are in the README.
