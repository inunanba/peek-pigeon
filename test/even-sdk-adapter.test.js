import test from "node:test";
import assert from "node:assert/strict";
import { createInboxSession } from "../src/session.js";
import { createMockTransport } from "../src/mock-transport.js";
import { mountEvenSdk } from "../src/even-sdk-adapter.js";
import { OsEventTypeList, StartUpPageCreateResult } from "@evenrealities/even_hub_sdk";
import { STATES } from "../src/model.js";

const message = { chatId: 7, messageId: 11, revision: 0, chat: "Crew", sender: "Mina", text: "West entrance?" };
const replies = ["Five minutes.", "Ten minutes.", "Start without me."];

test("SDK adapter creates one captured 576x288 text container and follows ring input", async () => {
  let eventHandler;
  const creates = [];
  const upgrades = [];
  const bridge = {
    async createStartUpPageContainer(value) { creates.push(value); return StartUpPageCreateResult.success; },
    async textContainerUpgrade(value) { upgrades.push(value); return true; },
    onEvenHubEvent(handler) { eventHandler = handler; return () => {}; }
  };
  const transport = createMockTransport({ latencyMs: 0 });
  const session = createInboxSession({ initialMessage: message, suggestions: replies, transport });
  const adapter = await mountEvenSdk(session, { bridge, logger: { info() {}, error() {} } });
  assert.deepEqual(creates[0].textObject[0], {
    xPosition: 0, yPosition: 0, width: 576, height: 288,
    containerID: 1, containerName: "peek-pigeon-main", zOrderIndex: 1,
    content: "Crew / Mina\n\nWest entrance?\n\nTAP: replies", textColor: 4, isEventCapture: 1
  });
  // Simulator 0.9.5 omits eventType for CLICK_EVENT=0 during JSON serialization.
  eventHandler({ sysEvent: { eventSource: 1 } });
  eventHandler({ sysEvent: { eventType: OsEventTypeList.SCROLL_BOTTOM_EVENT, eventSource: 1 } });
  eventHandler({ sysEvent: { eventSource: 1 } });
  eventHandler({ sysEvent: { eventSource: 1 } });
  await adapter.settled();
  assert.equal(session.view().state, STATES.SENT);
  assert.equal(transport.requests[0].text, "Ten minutes.");
  assert.ok(upgrades.some(update => update.content.includes("SEND AS BOT TO Crew?")));
  adapter.destroy();
});
