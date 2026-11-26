import { STATES } from "./model.js";
import { createMockTransport } from "./mock-transport.js";
import { createInboxSession } from "./session.js";
import { hasEvenHostBridge, mountEvenSdk } from "./even-sdk-adapter.js";

const fixtures = [
  { chatId: 12001, messageId: 41, revision: 0, chat: "Launch crew", sender: "Mina", text: "West entrance. Can you arrive in five minutes?" },
  { chatId: 12001, messageId: 42, revision: 0, chat: "Launch crew", sender: "Kai", text: "The demo room changed to the second floor." }
];
const suggestions = ["Yes — there in five minutes.", "I need ten minutes.", "Please start without me."];
const transport = createMockTransport();
const session = createInboxSession({ initialMessage: fixtures[0], suggestions, transport });
const g2 = document.querySelector("#g2");
const hint = document.querySelector("#hint");
const tap = document.querySelector("#tap");
const badge = document.querySelector("#transport");
let fixtureIndex = 0;

function line(text, className = "") { const p = document.createElement("p"); p.className = className; p.textContent = text; return p; }

function render(view) {
  g2.replaceChildren();
  const { state, message, suggestions: replies, selected, selectedText, outcome, pendingCount } = view;
  if (state === STATES.READING) {
    g2.append(line(`${message.chat} / ${message.sender}`, "meta"), line(message.text, "message"));
    hint.textContent = `Tap to prepare three short replies.${pendingCount ? ` ${pendingCount} queued.` : ""}`;
  } else if (state === STATES.CHOOSING) {
    g2.append(line("CHOOSE A REPLY", "meta"));
    replies.forEach((reply, index) => g2.append(line(`${index === selected ? "›" : " "} ${reply}`, index === selected ? "selected" : "")));
    hint.textContent = `Swipe with Previous / Next, then tap.${pendingCount ? ` ${pendingCount} queued without replacing this target.` : ""}`;
  } else if (state === STATES.CONFIRMING) {
    g2.append(line(`SEND AS BOT TO ${message.chat}?`, "meta"), line(selectedText, "message"), line("Tap once to send", "warning"));
    hint.textContent = `Recipient and full text are fixed from one snapshot.${pendingCount ? ` ${pendingCount} newer message queued.` : ""}`;
  } else if (state === STATES.SENDING) {
    g2.append(line("SENDING ONCE…", "message")); hint.textContent = "Further taps are ignored.";
  } else {
    g2.append(line(state, "message"), line(outcome?.reason ?? "Mock transport confirmed the request.", "meta"));
    hint.textContent = state === STATES.UNKNOWN ? "Do not retry automatically. Check Telegram first." : pendingCount ? "Tap to open the queued message." : "Fixture flow complete.";
  }
  tap.disabled = state === STATES.SENDING || ([STATES.SENT, STATES.UNKNOWN].includes(state) && pendingCount === 0);
  tap.textContent = state === STATES.FAILED ? "Review retry" : pendingCount && [STATES.SENT, STATES.UNKNOWN].includes(state) ? "Next message" : "Tap";
}

session.subscribe(render);
document.querySelector("#previous").addEventListener("click", () => session.move(-1));
document.querySelector("#next").addEventListener("click", () => session.move(1));
tap.addEventListener("click", () => session.tap());
document.querySelector("#new-message").addEventListener("click", () => {
  fixtureIndex = (fixtureIndex + 1) % fixtures.length;
  session.receive(fixtures[fixtureIndex], suggestions);
});

if (hasEvenHostBridge()) {
  mountEvenSdk(session).then(() => { badge.textContent = "EVEN SDK"; }).catch(error => {
    badge.textContent = "SDK ERROR";
    console.error(`PEEK_SDK_ERROR code=${error?.message ?? "UNKNOWN"}`);
  });
}
