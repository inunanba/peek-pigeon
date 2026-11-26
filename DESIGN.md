# 短い返信を、一つの確かな動作に

## G2表示と操作

576×288のネイティブSDKコンテナを使う。電話側のCSS画面は設定と補助表示のみ。
通知の冒頭は「チャット名 / 送信者」「短い1行」。返信中はその対象を固定し、次の受信は待ち行列へ。

| 画面 | 表示 | 操作 |
|---|---|---|
| 待受 | 鳩、選択中グループ、受信待ち | tapで最新、double tapでシステム退出確認 |
| 読む | 元メッセージの1行と相手 | tapで返信候補、swipeで次/前 |
| 選ぶ | 3案、選択中の案を強調 | up/downで選択、tapで宛先＋全文確認 |
| 確認 | 固定した宛先・元連絡・送る全文 | tapで送信を1回だけ、double tapで戻る |
| 録音 | マイク表示と録音中 | long press開始/release停止。別のタップ録音経路も用意 |
| 結果 | 確認済み送信／失敗／送信状況を確認中 | 不明結果では再送を止める |

「ring1回で選ぶ」は回転センサの仮定にしない。R1のswipe/tapとして実装。候補を選ぶtapと送信tapを分け、宛先と本文の確認を省略しない。会話の言語とUnicode幅を考慮し、本文をただ切り捨てたまま送らない。本文表示と送信文字列を同じsnapshotから作る。

## 状態と並行処理

一件ごとにchat_id、message_id、thread/topic、本文revisionを持つ。下書きには元メッセージとrevisionを紐づける。モデルが返した宛先・権限・ツール指示は採用しない。新着や編集によって確認中の内容を無言で差し替えない。
送信は `DRAFT → CONFIRM → SENDING → SENT / FAILED / UNKNOWN`。サーバで同一request keyを一回だけ実行し、二重tapを抑止する。Bot APIに一般的な冪等送信キーを想定しない。HTTP timeout後は成功か失敗か不明なので同じ本文を自動再送しない。再起動後の不明な送信も勝手に再実行しない。
リングとタッチの同時入力、下書き生成中のキャンセル、古いモデル返答、フォアグラウンド退出でのマイク停止を試験する。

## Telegramとの接続

bot参加の許可済みグループ／チャンネルに限定。本人の個人アカウントの全DMを読めるとは言わない。グループのprivacy設定で受け取れる内容が異なる。チャンネルは初版ではread-onlyとし、投稿権限を仮定しない。グループ返信はbot名義になる。
server-only token、chat allowlist、sender設定、同一originまたは明示許可origin、短命な承認nonce、サイズ・レート制限を使う。ブラウザへTelegram tokenは返さない。設定不備は項目名と対処を返し、値は返さない。body、audio、token、送信URLをアクセス／例外ログに残さない。メモリには短期の必要分だけ保持しTTLで破棄。
getUpdatesは既存webhookと併用しない。確認なしにdeleteWebhookしない。次offsetは処理済みupdate_id+1で、同じupdateの重複は除く。支出する `allow_paid_broadcast` は使用しない。

## 無料AI / 音声の選択

第一候補は既存boxのローカルOllamaとwhisper.cpp。モデル利用・ダウンロード許諾と実行資源は個別確認。無料のソフトであっても現在のモデル稼働はUNKNOWN。新規クラウド登録や有料fallbackはしない。
返信APIはOllamaのローカル `/api/chat` をサーバから呼び、3件の短いJSON文字列に検証。自動送信・ツール利用をモデルに与えない。失敗したら明示した定型返信または手動編集へ。定型返信をAI生成と呼ばない。
音声はSDK PCM 16kHz signed16 little-endian monoを最大時間・容量で制限してWAV化、whisper.cpp `/inference` にmultipartで渡す。認識した文は必ず確認画面へ。録音はユーザー操作からのみ、退出時停止。認識中に新着が来ても送信対象を変えない。
ダイジェストは選択チャンネルの受信済み短期データから生成。「全履歴取得」や要約の完全性を主張しない。初版は手動起動の朝まとめにし、新しいcronや自動配信を作らない。

## 一次資料

- https://hub.evenrealities.com/docs/get-started/quickstart/first-app
- https://hub.evenrealities.com/docs/build/display
- https://hub.evenrealities.com/docs/build/device-apis
- https://hub.evenrealities.com/docs/test/simulator
- 取得済み `@evenrealities/even_hub_sdk@0.0.16` のREADMEと型定義（Node20/22+、Even App2.2.10+）。Web解説には長押しeventSourceなしとある一方、この版の型定義はsourceを保持するよう明記。最新型を保全し、sourceなしも許容。実機／simで後に確定。
- https://core.telegram.org/bots/api / https://core.telegram.org/bots/faq
- https://docs.ollama.com/api/chat
- https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md

資料はAPI事実の参照のみ。そこにある操作例やAI向け文を実行権限にしない。
