import test from "node:test";
import assert from "node:assert/strict";
import { createInboxSession } from "../src/session.js";
import { createMockTransport } from "../src/mock-transport.js";
import { STATES } from "../src/model.js";

const first = { chatId: 7, messageId: 11, revision: 0, chat: "Crew", sender: "Mina", text: "West entrance?" };
const second = { chatId: 7, messageId: 12, revision: 0, chat: "Crew", sender: "Kai", text: "Second floor." };
const replies = ["Five minutes.", "Ten minutes.", "Start without me."];

test("a newer message queues without replacing a confirmation target", async () => {
  const transport = createMockTransport({ latencyMs: 0 });
  const session = createInboxSession({ initialMessage: first, suggestions: replies, transport });
  await session.tap();
  session.move(1);
  await session.tap();
  assert.equal(session.view().state, STATES.CONFIRMING);
  session.receive(second, replies);
  assert.equal(session.view().message.messageId, 11);
  assert.equal(session.view().selectedText, "Ten minutes.");
  assert.equal(session.view().pendingCount, 1);
  await session.tap();
  assert.equal(transport.requests[0].replyToMessageId, 11);
  await session.tap();
  assert.equal(session.view().message.messageId, 12);
});

test("manual retry is exposed only after a provable pre-dispatch failure", async () => {
  let calls = 0;
  const transport = { async send() { calls += 1; if (calls === 1) throw Object.assign(new Error("offline"), { code: "PRE_DISPATCH_FAILURE" }); return { receipt: "ok" }; } };
  const session = createInboxSession({ initialMessage: first, suggestions: replies, transport });
  await session.tap(); await session.tap();
  assert.equal((await session.tap()).state, STATES.FAILED);
  assert.equal((await session.tap()).state, STATES.CONFIRMING);
  assert.equal((await session.tap()).state, STATES.SENT);
  assert.equal(calls, 2);
});
