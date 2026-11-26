import { createReplyFlow, snapshotMessage, STATES, validateSuggestions } from "./model.js";

const terminal = state => [STATES.SENT, STATES.FAILED, STATES.UNKNOWN].includes(state);

export function createInboxSession({ initialMessage, suggestions, transport }) {
  const defaultSuggestions = validateSuggestions(suggestions);
  const pending = [];
  const listeners = new Set();
  let flow;
  let unsubscribeFlow;

  const view = () => Object.freeze({ ...flow.view(), pendingCount: pending.length });
  const emit = () => listeners.forEach(listener => listener(view()));
  const bind = (message, replies = defaultSuggestions) => {
    unsubscribeFlow?.();
    flow = createReplyFlow(message, replies);
    unsubscribeFlow = flow.subscribe(() => emit());
  };
  bind(initialMessage);

  return Object.freeze({
    view,
    subscribe(listener) { listeners.add(listener); listener(view()); return () => listeners.delete(listener); },
    move(delta) { const result = flow.move(delta); emit(); return result; },
    async tap() {
      if (flow.view().state === STATES.CONFIRMING) return flow.confirmSend(transport);
      if (flow.view().state === STATES.FAILED) return flow.retryPreDispatch();
      if (terminal(flow.view().state) && pending.length) return this.openNext();
      return flow.tap();
    },
    receive(message, replies = defaultSuggestions) {
      const snapshot = snapshotMessage(message);
      const validated = validateSuggestions(replies);
      if (terminal(flow.view().state) && pending.length === 0) bind(snapshot, validated);
      else pending.push(Object.freeze({ message: snapshot, suggestions: validated }));
      emit();
      return view();
    },
    openNext() {
      if (!terminal(flow.view().state) || pending.length === 0) return view();
      const next = pending.shift();
      bind(next.message, next.suggestions);
      emit();
      return view();
    }
  });
}
