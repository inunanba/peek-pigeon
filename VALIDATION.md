# 検証と証拠の計画

現段階: **fixture本体、SDK adapter、公式simulator automation、資格情報なしTelegram server adapterを実装済み**。実Telegram、G2実機、LLM/STTは未接続でUNKNOWN。内部試験やsimulator成功を外部Telegram成功に換算しない。

| 条件 | 合格の証拠 |
|---|---|
| 受信→表示→選択→確認→結果 | 公式simulator framebufferとautomation入力、サーバの本文なし件数 |
| 100回繰り返し | `npm run validate:100`。各回に一意ID、受信数・確認数・receipt数・fetch数・完了key再利用数・余分なdispatch数を分離。2026-11-23のTelegram adapter＋fake fetchは100/100/100、fetch 100、各回2回tap時の重複抑止100、余分なdispatch 0 |
| 反応速度 | receive→render要求、render完了、tap→server受付、server→Telegram receiptを別計測。平均とp95・環境・サンプル数 |
| 送信しない条件 | 二重tap、宛先変更、古いrevision、allowlist外、不正nonce、モデルの宛先指示、本文過大 |
| 不明結果 | request timeout後UNKNOWN保持、再送なし。失敗と成功を混同しない |
| 音声 | 開始/停止/退出、容量上限、遅延STT、キャンセル後の応答無視、確認前送信0 |
| G2で読める | 576×288 RGBA screenshot、32pxアイコン、長文/日本語/絵文字、選択中の判別、root退出確認 |
| 秘密と費用 | buildにtoken0、本文/audioログ0、有料API0、外部送信はowner準備後の許可済みテストのみ |

公式automation port: GET `/api/ping`、GET `/api/console`、GET `/api/screenshot/glasses`、POST `/api/input` のup/down/click/double_click/long_press/long_press_release。framebufferはalphaを保持。ready確認前の入力は数えない。試験のために実Telegramへ100件送ることはしない。100回はTelegram adapterへ注入したfake fetchで行い、実Telegramは明示許可後の最小件数として区別。

## この環境で実際に確かめたこと

2026-11-23 16:48 JST: SDK0.0.16/simulator0.9.5取得。`evenhub-simulator --help` はexit127。
`libwebkit2gtk-4.1.so.0` および `libjavascriptcoregtk-4.1.so.0` が見つからない（lddで確認）。モデルruntimeとXvfbも未導入。システム設定変更・sandbox無効化・権限迂回はしない。Senaの既存boxで公式simulatorの起動可否と必要ライブラリを確認する。アプリ本体の問題という証拠はまだない。

## 開始条件

本体実装は2026-11-23 17:00 JST以降。公開・提出の前に公式ページを再確認する。


## CHECKPOINT-04/05 実測

- Independent re-run of official simulator 0.9.5: READING→CHOOSING→CONFIRMING→SENDING→SENT、eventTypeなしsysEvent click、selected=1、576×288 CONFIRMING frame、console error 0を独立確認。実Telegramは未接続。
- Work local Node v24.22.3、Telegram adapterへ注入したfake fetch 100回: received 100、confirmed 100、receipts 100、fetch 100、各回2回tap時の重複抑止100、unexpected dispatches 0、各runともadapter内0.1 ms未満。この時間はTelegram/G2/人の反応時間ではない。
- Telegram server adapter unit test: allowlist外はfetch前拒否、chatIdは検証済み文字列をpayloadへ使用、同じkeyをchat/target/textへ固定、同時・完了後重複を1 dispatchへ集約、UNKNOWNになったkeyは以後fetchしない。HTTP 408もUNKNOWNとして同keyをlock。API baseは実hostと予約fixture hostの完全一致allowlist。末尾ドット・proxy・HTTPを拒否し、実hostは明示 `realSendGate` なしに生成できない。fixtureは `telegram.invalid` へ分離。token形式を生成時に検査し、fetch redirectを拒否。21/21 tests、Vite build、npm audit 0 vulnerabilities。tokenはfixtureのみで、実API呼出し0。
- idempotency stateは現在process memory。実Telegram最小試験は `TELEGRAM_RUNBOOK.md` の永続storeまたは監督付き単一process gateが独立PASSするまでBLOCKED。再起動を未送信証拠にしない。
