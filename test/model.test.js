import test from "node:test";
import assert from "node:assert/strict";
import { createReplyFlow, snapshotMessage, STATES, validateSuggestions } from "../src/model.js";
import { createMockTransport } from "../src/mock-transport.js";

const message = { chatId: 7, messageId: 11, revision: 2, chat: "Crew", sender: "Mina", text: "West entrance?" };
const replies = ["Yes, five minutes.", "Ten minutes.", "Start without me."];

test("requires a valid immutable message snapshot", () => {
  assert.throws(() => snapshotMessage({ text: "x" }), /INVALID_MESSAGE_ID/);
  const snap = snapshotMessage(message);
  assert.equal(Object.isFrozen(snap), true);
  assert.equal(snap.messageId, 11);
});

test("requires exactly three bounded replies", () => {
  assert.throws(() => validateSuggestions(["one"]), /THREE_REPLIES_REQUIRED/);
  assert.throws(() => validateSuggestions(["ok", "", "later"]), /INVALID_REPLY/);
  assert.equal(validateSuggestions(replies).length, 3);
});

test("reading, choosing and confirming preserve the original target", () => {
  const flow = createReplyFlow(message, replies);
  assert.equal(flow.tap().state, STATES.CHOOSING);
  assert.equal(flow.move(1).selectedText, replies[1]);
  const confirm = flow.tap();
  assert.equal(confirm.state, STATES.CONFIRMING);
  assert.equal(confirm.message.chatId, 7);
  assert.equal(confirm.message.messageId, 11);
});

test("wraps reply selection in both directions", () => {
  const flow = createReplyFlow(message, replies);
  flow.tap();
  assert.equal(flow.move(-1).selected, 2);
  assert.equal(flow.move(1).selected, 0);
});

test("concurrent confirmation taps dispatch exactly once", async () => {
  const transport = createMockTransport({ latencyMs: 5 });
  const flow = createReplyFlow(message, replies);
  flow.tap(); flow.tap();
  const [a, b] = await Promise.all([flow.confirmSend(transport), flow.confirmSend(transport)]);
  assert.equal(a.state, STATES.SENT);
  assert.equal(b.state, STATES.SENT);
  assert.equal(transport.requests.length, 1);
  assert.deepEqual(transport.requests[0], { key: "7:11:2", chatId: 7, replyToMessageId: 11, text: replies[0] });
});

test("unknown outcome blocks automatic retry", async () => {
  const transport = createMockTransport({ latencyMs: 0, outcome: "unknown" });
  const flow = createReplyFlow(message, replies);
  flow.tap(); flow.tap();
  assert.equal((await flow.confirmSend(transport)).state, STATES.UNKNOWN);
  assert.equal(flow.view().outcome.reasonCode, "DELIVERY_TIMEOUT");
  await flow.confirmSend(transport);
  assert.equal(transport.requests.length, 1);
});

test("only an explicit pre-dispatch failure can be manually retried", async () => {
  const transport = createMockTransport({ latencyMs: 0, outcome: "failed" });
  const flow = createReplyFlow(message, replies);
  flow.tap(); flow.tap();
  assert.equal((await flow.confirmSend(transport)).state, STATES.FAILED);
  assert.equal(flow.tap().state, STATES.FAILED);
  assert.equal(flow.retryPreDispatch().state, STATES.CONFIRMING);
  assert.equal(transport.requests.length, 0);
});

test("duplicate key and delivery timeout remain distinguishable", async () => {
  const transport = createMockTransport({ latencyMs: 0 });
  const first = createReplyFlow(message, replies);
  first.tap(); first.tap();
  assert.equal((await first.confirmSend(transport)).state, STATES.SENT);
  const second = createReplyFlow(message, replies);
  second.tap(); second.tap();
  assert.equal((await second.confirmSend(transport)).outcome.reasonCode, "DUPLICATE_REQUEST");
});
