import { performance } from "node:perf_hooks";
import { createReplyFlow, STATES } from "../src/model.js";
import { createTelegramTransport } from "../server/telegram-transport.js";

const samples = [];
let received = 0;
let confirmed = 0;
let receipts = 0;
let fetchCalls = 0;
let adapterDuplicateHits = 0;

const transport = createTelegramTransport({
  botToken: "123456:fixture_token",
  allowedChatIds: [7],
  apiBase: "https://telegram.invalid",
  fetchImpl: async (_url, init) => {
    fetchCalls += 1;
    const body = JSON.parse(init.body);
    if (body.chat_id !== "7" || !Number.isSafeInteger(body.reply_parameters?.message_id)) {
      throw new Error("INVALID_ADAPTER_BODY");
    }
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, result: { message_id: 5000 + fetchCalls } }; }
    };
  }
});

for (let index = 0; index < 100; index += 1) {
  const message = {
    chatId: 7,
    messageId: 1000 + index,
    revision: 0,
    chat: "Fixture group",
    sender: "Fixture sender",
    text: `Fixture message ${index}`
  };
  const replies = ["Five minutes.", "Ten minutes.", "Start without me."];
  const started = performance.now();
  const flow = createReplyFlow(message, replies);
  if (flow.view().state === STATES.READING) received += 1;
  flow.tap();
  flow.move(index % 3);
  flow.tap();
  const selectedText = flow.view().selectedText;
  if (flow.view().state === STATES.CONFIRMING) confirmed += 1;
  const [first, second] = await Promise.all([
    flow.confirmSend(transport),
    flow.confirmSend(transport)
  ]);
  samples.push(performance.now() - started);
  if (first.state !== STATES.SENT || second.state !== STATES.SENT) throw new Error(`FLOW_${index}_NOT_SENT`);
  receipts += first.outcome?.receipt ? 1 : 0;
  const duplicate = await transport.send({
    key: `7:${1000 + index}:0`,
    chatId: 7,
    replyToMessageId: 1000 + index,
    text: selectedText
  });
  if (duplicate.duplicate === true) adapterDuplicateHits += 1;
}

const ordered = [...samples].sort((a, b) => a - b);
const meanMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
const p95Ms = ordered[Math.ceil(ordered.length * 0.95) - 1];
const unexpectedDispatches = Math.max(0, fetchCalls - 100);
const result = {
  environment: `node ${process.version} fake fetch through Telegram adapter; not real Telegram or G2 latency`,
  runs: samples.length,
  received,
  confirmed,
  receipts,
  fetchCalls,
  adapterDuplicateHits,
  unexpectedDispatches,
  meanMs: Number(meanMs.toFixed(3)),
  p95Ms: Number(p95Ms.toFixed(3)),
  externalTelegram: false
};
if (received !== 100 || confirmed !== 100 || receipts !== 100 || fetchCalls !== 100 || adapterDuplicateHits !== 100 || unexpectedDispatches !== 0) {
  throw new Error(`COUNT_MISMATCH_${JSON.stringify(result)}`);
}
process.stdout.write(`${JSON.stringify(result)}\n`);
