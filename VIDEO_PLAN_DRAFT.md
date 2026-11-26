# Peek Pigeon demo script and storyboard

Status: **ready for exact-build review after this commit; not yet recorded or approved for external use.**

Target length: 105 seconds, hard cap 3 minutes. Use large captions, the pigeon character, and simulator capture only; no face or voice. Mark illustrations and sample runs on screen.

| Time | Picture / action | English caption | Production note |
|---|---|---|---|
| 0–10s | 鳩のガイドが荷物を抱えた人のイラスト横で吹き出し「Can you arrive in five minutes?」。 | **A two-line message shouldn't cost you two minutes.** → **So we built Peek Pigeon: a reply in a glance, a ring move and one tap.** | 「Illustration」と明示。実在人物・実チャットは映さない。 |
| 10–20s | 公式simulatorのREADING画面（Launch crew / Mina / “West entrance. Can you arrive in five minutes?”）。 | **One message, from the chat you picked, on the G2 display.** | 画面隅に「sample chat」。 |
| 20–34s | CHOOSING。3案を順にハイライトし “I need ten minutes.” で止める。 | **Three short replies. The ring chooses. Nothing sends yet.** | automationと同じ入力順。 |
| 34–50s | CONFIRMING（`SEND AS BOT TO Launch crew?` / `I need ten minutes.` / `TAP ONCE TO SEND`）を保持。 | **Before anything is sent, you see which chat and the exact words.** | chat名と返信全文を拡大して読めるようにする。 |
| 50–60s | 1回tap → SENDING → SENT。“Mock transport confirmed the request.” もそのまま見せる。 | **One tap. One reply.** | 画面隅に「sample run」。 |
| 60–74s | browser previewで「Receive another message」→ “1 newer message queued”、SENDING中の “Further taps are ignored.”。続けて `npm test` のHTTP 408 test出力を「unit test」と明示して表示。 | **New messages wait their turn. Double taps send once. If the answer is unclear, it says “Check Telegram” — never sends twice.** | UNKNOWN画面を捏造しない。実画面とunit testを区別。 |
| 74–88s | 証拠カード：「21 / 21 tests」「Official simulator 0.9.5: read → choose → confirm → send, 0 console errors」「100 sample messages · each tapped twice · 100 sends · 0 extra」。 | **Tested as a flow, in the official simulator, and 100 times through the Telegram adapter.** | 「adapter test」を併記。時間値は出さない。 |
| 88–96s | 構成カード：G2 screen → confirm → your server → Telegram。tokenはserver側に鍵icon。 | **The bot token stays on the server. Every send is confirmed on the glasses first.** | 安全の価値を前向きに見せる。 |
| 96–105s | 最終の確認画面→logo。 | **Solved: a reply in a glance, a ring move and one tap — sent once, to the right chat.** → **Peek Pigeon — Glance. Choose. Confirm. Reply.** | 解決したことを言い切って閉じる。 |

## Capture checklist

1. Checkout the exact reviewed commit and record its SHA in the video notes.
2. Run `npm ci`, `npm run check`, and `npm run validate:100`; save the full output.
3. Start that exact build in official simulator 0.9.5 with automation port enabled.
4. Run `npm run automation`; preserve console output and the CONFIRMING framebuffer from the same run.
5. CONFIRMING screen: chat name and full reply are readable.
6. Record at readable scale; label illustrations, sample chat, sample run, and unit-test evidence.
7. Keep the pigeon character visible as a small guide without covering simulator evidence.
8. Check captions around a 390px-wide preview and enlarge small G2 text when quoting it.
9. Verify the final file is under 180 seconds and record its SHA-256, duration, resolution, codecs, and size before upload.

## Acceptance gate for recording

The recording pass uses this exact commit, reruns the official simulator on the same build, and records only claims visible in the captured evidence. Receipt of this document is separate from recording, upload, and submission success.
