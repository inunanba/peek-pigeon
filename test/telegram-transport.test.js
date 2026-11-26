import test from "node:test";
import assert from "node:assert/strict";
import { createTelegramTransport } from "../server/telegram-transport.js";

const request = { key: "-1007:11:0", chatId: -1007, replyToMessageId: 11, text: "Ten minutes." };
const fixtureApiBase = "https://telegram.invalid";
const fixtureToken = "123456:fixture_token";

test("Telegram token path delimiters are rejected before transport creation", () => {
  for (const botToken of ["fixture-token", "123:bad/token", "123:bad?token", "123:bad#token", "bot:token"]) {
    assert.throws(
      () => createTelegramTransport({ botToken, allowedChatIds: [-1007], apiBase: fixtureApiBase, fetchImpl: async () => {} }),
      error => error.code === "PRE_DISPATCH_FAILURE" && error.message.includes("format")
    );
  }
});

test("real Telegram host is blocked unless an idempotency gate is explicit", () => {
  assert.throws(
    () => createTelegramTransport({
      botToken: fixtureToken,
      allowedChatIds: [-1007],
      fetchImpl: async () => {}
    }),
    error => error.code === "PRE_DISPATCH_FAILURE" && error.message.includes("REAL_TELEGRAM_SEND_BLOCKED")
  );
});

test("an explicit supervised gate permits the real host only through the injected fetch", async () => {
  let calls = 0;
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1007],
    realSendGate: "supervised-single-process",
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, async json() { return { ok: true, result: { message_id: 90 } }; } };
    }
  });
  const result = await transport.send(request);
  assert.equal(calls, 1);
  assert.equal(result.receipt, "telegram:-1007:90");
});

test("Telegram API base rejects trailing-dot and proxy host bypasses", () => {
  for (const apiBase of ["https://api.telegram.org.", "https://telegram-proxy.invalid", "http://api.telegram.org"]) {
    assert.throws(
      () => createTelegramTransport({
        botToken: fixtureToken,
        allowedChatIds: [-1007],
        realSendGate: "supervised-single-process",
        apiBase,
        fetchImpl: async () => {}
      }),
      error => error.code === "PRE_DISPATCH_FAILURE" && error.message.includes("not allowlisted")
    );
  }
});

test("Telegram adapter sends only to an allowlisted chat and replies to the fixed message", async () => {
  const calls = [];
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1007],
    apiBase: fixtureApiBase,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, async json() { return { ok: true, result: { message_id: 91 } }; } };
    }
  });
  const result = await transport.send(request);
  assert.deepEqual(result, { receipt: "telegram:-1007:91", duplicate: false });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/sendMessage"), true);
  assert.equal(calls[0].init.redirect, "error");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    chat_id: "-1007",
    text: "Ten minutes.",
    reply_parameters: { message_id: 11, allow_sending_without_reply: false }
  });
});

test("Telegram adapter rejects a chat outside the allowlist before fetch", async () => {
  let calls = 0;
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1008],
    apiBase: fixtureApiBase,
    fetchImpl: async () => { calls += 1; }
  });
  await assert.rejects(transport.send(request), error => error.code === "PRE_DISPATCH_FAILURE");
  assert.equal(calls, 0);
});

test("Telegram adapter coalesces concurrent and completed duplicate keys", async () => {
  let calls = 0;
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1007],
    apiBase: fixtureApiBase,
    fetchImpl: async () => {
      calls += 1;
      await new Promise(resolve => setTimeout(resolve, 2));
      return { ok: true, status: 200, async json() { return { ok: true, result: { message_id: 92 } }; } };
    }
  });
  const [a, b] = await Promise.all([transport.send(request), transport.send(request)]);
  const c = await transport.send(request);
  assert.equal(calls, 1);
  assert.equal(a.receipt, b.receipt);
  assert.deepEqual(c, { receipt: "telegram:-1007:92", duplicate: true });
});

test("a network exception after fetch starts is an unknown delivery outcome", async () => {
  let calls = 0;
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1007],
    apiBase: fixtureApiBase,
    fetchImpl: async () => { calls += 1; throw new Error("socket closed"); }
  });
  await assert.rejects(transport.send(request), error => error.code === "DELIVERY_TIMEOUT");
  await assert.rejects(transport.send(request), error => error.code === "OUTCOME_UNKNOWN");
  assert.equal(calls, 1);
});

test("an idempotency key cannot be rebound to changed payload", async () => {
  let calls = 0;
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1007],
    apiBase: fixtureApiBase,
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, async json() { return { ok: true, result: { message_id: 93 } }; } };
    }
  });
  await transport.send(request);
  await assert.rejects(
    transport.send({ ...request, text: "Changed reply." }),
    error => error.code === "PRE_DISPATCH_FAILURE"
  );
  assert.equal(calls, 1);
});

test("HTTP 408 is an unknown outcome and locks the key before another fetch", async () => {
  let calls = 0;
  const transport = createTelegramTransport({
    botToken: fixtureToken,
    allowedChatIds: [-1007],
    apiBase: fixtureApiBase,
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 408, async json() { return { ok: false }; } };
    }
  });
  await assert.rejects(transport.send(request), error => error.code === "OUTCOME_UNKNOWN");
  await assert.rejects(transport.send(request), error => error.code === "OUTCOME_UNKNOWN");
  assert.equal(calls, 1);
});
