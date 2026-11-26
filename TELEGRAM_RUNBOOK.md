# Telegram実送信前Runbook

Peek Pigeonの現在のserver adapterは資格情報なしの内部実装段階で、実Telegram送信にはまだ使用しない。BotFather、許可済みtest group、server-only token、既存owner gateが揃っても、以下のidempotency条件を満たすまで送信は禁止する。

## 現在の境界

- `bindings`、`unknowns`、`receipts` はプロセス内メモリであり、再起動すると失われる。
- 同じプロセス内では、keyを検証済みchat/返信先/textへ固定し、UNKNOWN後の同keyをfetch前に拒否する。
- network exception、読めない応答、HTTP 408、5xx、receipt欠落はUNKNOWN。自動再送しない。
- HTTP 429を含む408以外の4xxはPRE_DISPATCH_FAILURE。別payloadで同keyを使うことは安全側で拒否する。

## 実送信の追加合格条件

最初の実Telegram最小試験前に、次のどちらかを選び、独立レビューでPASSにする。

1. **永続store**: keyとpayload fingerprint、PENDING、UNKNOWN、receiptを再起動後も復元できるstoreへ保存する。key予約はdispatch前にatomicに行い、同keyの同時dispatchを防ぐ。
2. **監督付き単一process gate**: 一意keyと対象messageを外部のdurable operation logへdispatch前に記録する。dispatch開始後はreceipt照合までprocessを再起動しない。UNKNOWNまたはprocess停止が起きた場合は全送信を停止し、Telegram上の結果とlogを人が照合するまで同key・同messageを再送しない。

どちらも満たさない場合は `REAL_TELEGRAM_SEND_BLOCKED_IDEMPOTENCY_STATE_NOT_DURABLE` として停止する。adapterはAPI baseを `https://api.telegram.org` と `https://telegram.invalid` の完全一致allowlistに限定する。末尾ドット、HTTP、proxy/alias host、credential/query/hash付きURLは生成時に拒否する。実hostではさらに `realSendGate: "durable-store"` または `realSendGate: "supervised-single-process"` が無ければ生成時に拒否する。flagは上記運用条件を満たしたという宣言であり、それ自体を証拠にしない。fake fetch検証は `https://telegram.invalid` を使い、このflagを付けない。

再起動、deploy、process入替、timeoutを「未送信」と推定して再試行しない。

## 最小試験の証拠

- tokenや本文をログ・GitHub・browser bundleへ出さない。adapterは `digits:letters_or_digits_-` 形式以外のtokenを生成時に拒否し、HTTP redirectを許可しない。
- allowlist済みtest groupと固定reply targetを送信直前に再確認する。
- 1件だけ人が確認して送信し、request key、開始時刻、HTTP分類、Telegram receipt、実画面の受領を別々に記録する。
- receiptが無い結果は成功件数へ加えずUNKNOWNのまま停止する。
- 支出、公開、提出、追加account、権限拡大は別の既存gateに従う。
