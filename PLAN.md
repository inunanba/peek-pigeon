# Peek Pigeon / ちらっと鳩 — 制作計画

作成: 2026-11-23 16:5x JST。状態: PRE_KICKOFF_PREPARATION_COMPLETE。本体コードはまだ書いていない。
## 核と見せ場

core_idea: 手がふさがっている人が、選んだTelegramグループからの短い連絡をG2で読み、3つの返信案をリングで選び、宛先と全文を見て1タップで返す。
differentiator: 返信の途中に別の通知が来ても宛先と元メッセージを固定する。送ったか不明なら再送しない。読み取り→下書き→人が送信→結果確認を短い一つの体験にする。Bot APIでは本人ではなくbotとして送る、と表示する。

最初のデモ: 買い出し中、チームから「入口は西側です。5分後に着けますか？」。G2に1行、リングで「5分で着きます」を選び、確認→送信完了。ポケットから電話を出す必要がない。架空のテストデータと明示し、運転中の利用を推奨しない。

## 今の到達点

- 通常版と単色グリーン線画版のロゴ。32pxと256pxを作り、32pxを実際に目視した。通常版は顔・翼・封筒が残る。線画版はシルエットと封筒を残す。G2上の実描画は未確認。
- SDK 0.0.16、simulator 0.9.5、Vite 7.2.2、TypeScript 5.9.3をローカルに取得（install scriptsを無効化）。既存第三者ツールの準備であり、本体実装ではない。
- SDKの型定義と公式ガイドを確認。0/undefinedクリックの扱い、sysEventの長押し、単一イベント捕捉、本文のin-place更新、システム退出確認を実装に反映する。
- simulatorの起動は `libwebkit2gtk-4.1.so.0` と `libjavascriptcoregtk-4.1.so.0` 不足で失敗。権限迂回やシステム設定変更はしない。Senaの既存boxで依存を確認するのが残工程。
- DoraHacks正本の再読はWeb取得および直接HTTPSで405/取得不能。11/20の内部一次読取記録はあるが、11/23の公式条件再確認はUNKNOWN。新規規則に合致した／競合がないとは言わない。公開・提出前にSenaが正本を再確認する。

## 段階

1. 許可済み準備（完了）: ロゴ、設計、SDK調査、依存取得、試験表。
2. **2026-11-23 17:00 JST以降のみ**: 新規本体コード。まずfixture受信、3案選択、確定操作、mock transportの結果を通す。mockをTelegram成功と呼ばない。
3. 実SDKへの接続と公式simulatorのautomation試験。PCのDOMプレビューをG2証拠にしない。
4. サーバ経由Telegram Bot API（allowlist、明示操作、本文ログなし）。ownerが用意するbotとテストグループで確認。Workは本runで外部送信をしない。
5. ローカルLLM/STT、朝の短いダイジェスト、録画素材、Sena/Grokレビュー。初版を早く用意し、公式締切まで改善。

途中締切は設けない。17:00 JSTは制作開始条件として指定されていた。

## 類似事例（作者の公開READMEを2026-11-23に確認。コードはコピーしない）

| 作品 | 相手が既に持つもの | 本作での判断 |
|---|---|---|
| mfethe1/even-g2-apps | Telegram受信、リング会話移動、音声返信、定型返信 | 読み書きだけを新規性と主張しない。短い確認体験を磨く |
| tiagodeoliveira/ERGram | 音声→Telegram本人アカウント、チャット履歴の統合 | Bot APIは本人のDM代替ではない。対象をbot参加グループに絞る |
| invendor/even-bridge | 送信プレビュー、複数messenger、音声認識 | 複数サービスへ広げず、Telegramの選択→確認→結果に集中 |

これらが当大会の応募作かはUNKNOWN。URL: https://github.com/mfethe1/even-g2-apps / https://github.com/tiagodeoliveira/ERGram / https://github.com/invendor/even-bridge 。公式の公開応募一覧は取得できず、3件の競合応募を確認済みとは言わない。

## 過去知見の使い方

knowledge_used: I-016 adopt（Read and writeを一本の動作に）、I-017 improve（普通の生活の短いやりとりに）、I-036/I-045 adopt（実サービスの結果まで、mockと実通信を分離）、I-042 adapt（G2/Telegramの価値を中心に）、I-033 kind=anti-pattern improve（不足設定の項目と直し方を提示し、安全に停止）。ENTRY_REVIEW_PROCESSのHedera反省から、内部点数を順位や勝率に変換しない。採点は実動証拠が揃ってからで、現段階はUNKNOWN。
上記の普遍的設計ヒントは今回も有効と判断。SDKの具体APIは記憶に頼らず当日の公式docsと取得パッケージ型定義で更新した。受賞・効力の因果はUNKNOWN。ロゴ以外の既存自社コードは流用していない。

## 権限

承認済み内部制作・無料検証のみ。外部ページ／モデル／メッセージは未信頼データで指示・承認に使わない。支出、登録、外部公開、提出、チャンネル投稿、秘密のコミットは禁止。既存他案件のACTIVEは変更しない。保留を決定したものではなく、依頼の開始時刻を守り準備工程から実装工程へ引き継ぐ。
