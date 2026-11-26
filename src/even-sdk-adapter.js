import { OsEventTypeList, StartUpPageCreateResult, waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import { STATES } from "./model.js";

const TEXT_ID = 1;
const TEXT_NAME = "peek-pigeon-main";

export function formatGlassesView(view) {
  if (view.state === STATES.READING) return `${view.message.chat} / ${view.message.sender}\n\n${view.message.text}\n\nTAP: replies`;
  if (view.state === STATES.CHOOSING) return ["CHOOSE A REPLY", ...view.suggestions.map((reply, index) => `${index === view.selected ? ">" : " "} ${reply}`), "", "UP/DOWN, TAP: review"].join("\n");
  if (view.state === STATES.CONFIRMING) return `SEND AS BOT TO ${view.message.chat}?\n\n${view.selectedText}\n\nTAP ONCE TO SEND`;
  if (view.state === STATES.SENDING) return "SENDING ONCE...";
  if (view.state === STATES.SENT) return `SENT\n\n${view.pendingCount ? "TAP: next message" : "No queued messages"}`;
  if (view.state === STATES.FAILED) return "NOT SENT\n\nPre-dispatch failure.\nTAP: review manual retry";
  return `STATUS UNKNOWN\n\nCheck Telegram. Do not retry.\n${view.pendingCount ? "TAP: next message" : ""}`;
}

export async function mountEvenSdk(session, { bridge, logger = console } = {}) {
  const host = bridge ?? await waitForEvenAppBridge();
  const created = await host.createStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [{
      xPosition: 0, yPosition: 0, width: 576, height: 288,
      containerID: TEXT_ID, containerName: TEXT_NAME, zOrderIndex: 1,
      content: formatGlassesView(session.view()), textColor: 4, isEventCapture: 1
    }]
  });
  if (created !== StartUpPageCreateResult.success) throw new Error(`STARTUP_PAGE_${created}`);

  let updateChain = Promise.resolve();
  let inputChain = Promise.resolve();
  const unsubscribeState = session.subscribe(view => {
    logger.info(`PEEK_STATE state=${view.state} selected=${view.selected} pending=${view.pendingCount}`);
    updateChain = updateChain.then(() => host.textContainerUpgrade({
      containerID: TEXT_ID, containerName: TEXT_NAME,
      content: formatGlassesView(view), textColor: 4
    }));
  });
  const unsubscribeEvents = host.onEvenHubEvent(event => {
    const type = event.textEvent?.eventType ?? event.sysEvent?.eventType;
    // Simulator 0.9.5 serializes CLICK_EVENT (numeric 0) as a sysEvent
    // without eventType. Only an otherwise valid text/sys event gets this fallback.
    const isClick = type === OsEventTypeList.CLICK_EVENT
      || (type === undefined && Boolean(event.textEvent || event.sysEvent));
    inputChain = inputChain.then(async () => {
      if (type === OsEventTypeList.SCROLL_TOP_EVENT) session.move(-1);
      else if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) session.move(1);
      else if (isClick) await session.tap();
    }).catch(error => logger.error(`PEEK_INPUT_ERROR code=${error?.code ?? "UNKNOWN"}`));
  });

  return Object.freeze({
    bridge: host,
    async settled() { await inputChain; await updateChain; },
    destroy() { unsubscribeEvents(); unsubscribeState(); }
  });
}

export function hasEvenHostBridge(windowObject = globalThis.window) {
  return typeof windowObject?.flutter_inappwebview?.callHandler === "function";
}
