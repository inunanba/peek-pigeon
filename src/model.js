export const STATES = Object.freeze({
  READING: "READING",
  CHOOSING: "CHOOSING",
  CONFIRMING: "CONFIRMING",
  SENDING: "SENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN"
});

const MAX_REPLY = 120;

export function snapshotMessage(input) {
  if (!input || !Number.isSafeInteger(input.chatId) || !Number.isSafeInteger(input.messageId)) throw new Error("INVALID_MESSAGE_ID");
  const text = String(input.text ?? "").trim();
  if (!text) throw new Error("EMPTY_MESSAGE");
  return Object.freeze({
    chatId: input.chatId,
    messageId: input.messageId,
    revision: Number.isSafeInteger(input.revision) ? input.revision : 0,
    chat: String(input.chat ?? "Allowed group").slice(0, 48),
    sender: String(input.sender ?? "Member").slice(0, 48),
    text: text.slice(0, 512)
  });
}

export function validateSuggestions(values) {
  if (!Array.isArray(values) || values.length !== 3) throw new Error("THREE_REPLIES_REQUIRED");
  const replies = values.map(value => String(value ?? "").trim());
  if (replies.some(value => !value || value.length > MAX_REPLY)) throw new Error("INVALID_REPLY");
  return Object.freeze(replies);
}

export function createReplyFlow(message, suggestions) {
  const original = snapshotMessage(message);
  const replies = validateSuggestions(suggestions);
  let state = STATES.READING;
  let selected = 0;
  let sendPromise = null;
  let outcome = null;
  const listeners = new Set();

  const view = () => Object.freeze({ state, selected, message: original, suggestions: replies, selectedText: replies[selected], outcome });
  const emit = () => listeners.forEach(listener => listener(view()));
  const transition = next => { state = next; emit(); return view(); };

  return Object.freeze({
    view,
    subscribe(listener) { listeners.add(listener); listener(view()); return () => listeners.delete(listener); },
    tap() {
      if (state === STATES.READING) return transition(STATES.CHOOSING);
      if (state === STATES.CHOOSING) return transition(STATES.CONFIRMING);
      if ([STATES.SENDING, STATES.SENT, STATES.FAILED, STATES.UNKNOWN].includes(state)) return view();
      return view();
    },
    move(delta) {
      if (state !== STATES.CHOOSING) return view();
      selected = (selected + Math.sign(delta || 1) + replies.length) % replies.length;
      emit();
      return view();
    },
    async confirmSend(transport) {
      if (state !== STATES.CONFIRMING) return sendPromise ?? view();
      state = STATES.SENDING;
      emit();
      const request = Object.freeze({
        key: `${original.chatId}:${original.messageId}:${original.revision}`,
        chatId: original.chatId,
        replyToMessageId: original.messageId,
        text: replies[selected]
      });
      sendPromise = Promise.resolve()
        .then(() => transport.send(request))
        .then(result => {
          outcome = Object.freeze({ status: "SENT", receipt: String(result?.receipt ?? "mock-receipt") });
          state = STATES.SENT;
          emit();
          return view();
        })
        .catch(error => {
          const reasonCode = String(error?.code ?? "OUTCOME_UNKNOWN");
          const unknown = ["OUTCOME_UNKNOWN", "DELIVERY_TIMEOUT", "DUPLICATE_REQUEST"].includes(reasonCode);
          outcome = Object.freeze({
            status: unknown ? "UNKNOWN" : "FAILED",
            reasonCode,
            reason: unknown ? "Check Telegram before retrying" : "Request failed before dispatch"
          });
          state = unknown ? STATES.UNKNOWN : STATES.FAILED;
          emit();
          return view();
        });
      return sendPromise;
    },
    retryPreDispatch() {
      if (state !== STATES.FAILED || outcome?.reasonCode !== "PRE_DISPATCH_FAILURE") return view();
      outcome = null;
      sendPromise = null;
      return transition(STATES.CONFIRMING);
    }
  });
}
