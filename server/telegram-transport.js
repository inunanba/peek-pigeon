const DEFAULT_TIMEOUT_MS = 8000;
const BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

function codedError(code, message) {
  return Object.assign(new Error(message), { code });
}

function normalizeAllowedChatIds(values) {
  if (!Array.isArray(values) || values.length === 0) throw codedError("PRE_DISPATCH_FAILURE", "Allowed chat list is required");
  return new Set(values.map(value => String(value)));
}

function normalizeApiBase(apiBase) {
  try {
    const url = new URL(apiBase);
    if (url.username || url.password || url.search || url.hash) throw new Error("URL_COMPONENT_NOT_ALLOWED");
    const normalized = url.toString().replace(/\/$/, "");
    if (normalized === "https://api.telegram.org") return { apiBase: normalized, realApi: true };
    if (normalized === "https://telegram.invalid") return { apiBase: normalized, realApi: false };
    throw new Error("API_BASE_NOT_ALLOWED");
  } catch {
    throw codedError("PRE_DISPATCH_FAILURE", "Telegram API base is not allowlisted");
  }
}

export function createTelegramTransport({
  botToken,
  allowedChatIds,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  apiBase = "https://api.telegram.org",
  realSendGate
} = {}) {
  if (typeof botToken !== "string" || !BOT_TOKEN_PATTERN.test(botToken)) {
    throw codedError("PRE_DISPATCH_FAILURE", "Telegram credential format is invalid");
  }
  if (typeof fetchImpl !== "function") throw codedError("PRE_DISPATCH_FAILURE", "Fetch implementation is required");
  const normalizedApi = normalizeApiBase(apiBase);
  apiBase = normalizedApi.apiBase;
  const realApi = normalizedApi.realApi;
  if (realApi && !["durable-store", "supervised-single-process"].includes(realSendGate)) {
    throw codedError("PRE_DISPATCH_FAILURE", "REAL_TELEGRAM_SEND_BLOCKED_IDEMPOTENCY_STATE_NOT_DURABLE");
  }
  const allowlist = normalizeAllowedChatIds(allowedChatIds);
  const pending = new Map();
  const receipts = new Map();
  const bindings = new Map();
  const unknowns = new Set();

  return Object.freeze({
    async send(request) {
      const key = String(request?.key ?? "");
      const chatId = String(request?.chatId ?? "");
      const replyToMessageId = request?.replyToMessageId;
      const text = String(request?.text ?? "").trim();
      if (!key || !chatId || !Number.isSafeInteger(replyToMessageId) || !text || text.length > 120) {
        throw codedError("PRE_DISPATCH_FAILURE", "Invalid Telegram send request");
      }
      if (!allowlist.has(chatId)) throw codedError("PRE_DISPATCH_FAILURE", "Chat is not allowlisted");
      const fingerprint = JSON.stringify([chatId, replyToMessageId, text]);
      if (bindings.has(key) && bindings.get(key) !== fingerprint) {
        throw codedError("PRE_DISPATCH_FAILURE", "Idempotency key payload mismatch");
      }
      if (!bindings.has(key)) bindings.set(key, fingerprint);
      if (unknowns.has(key)) throw codedError("OUTCOME_UNKNOWN", "Previous Telegram outcome is unknown");
      if (receipts.has(key)) return Object.freeze({ receipt: receipts.get(key), duplicate: true });
      if (pending.has(key)) return pending.get(key);

      const operation = (async () => {
        let response;
        try {
          response = await fetchImpl(`${apiBase}/bot${botToken}/sendMessage`, {
            method: "POST",
            redirect: "error",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              reply_parameters: {
                message_id: replyToMessageId,
                allow_sending_without_reply: false
              }
            }),
            signal: AbortSignal.timeout(timeoutMs)
          });
        } catch {
          unknowns.add(key);
          throw codedError("DELIVERY_TIMEOUT", "Telegram outcome is unknown");
        }

        let payload;
        try {
          payload = await response.json();
        } catch {
          unknowns.add(key);
          throw codedError("OUTCOME_UNKNOWN", "Telegram returned an unreadable result");
        }
        if (!response.ok || payload?.ok !== true) {
          const code = response.status >= 400 && response.status < 500 && response.status !== 408
            ? "PRE_DISPATCH_FAILURE"
            : "OUTCOME_UNKNOWN";
          if (code === "OUTCOME_UNKNOWN") unknowns.add(key);
          throw codedError(code, "Telegram rejected or did not confirm the request");
        }
        const messageId = payload?.result?.message_id;
        if (!Number.isSafeInteger(messageId)) {
          unknowns.add(key);
          throw codedError("OUTCOME_UNKNOWN", "Telegram receipt is missing");
        }
        const receipt = `telegram:${chatId}:${messageId}`;
        receipts.set(key, receipt);
        return Object.freeze({ receipt, duplicate: false });
      })().finally(() => pending.delete(key));

      pending.set(key, operation);
      return operation;
    }
  });
}
