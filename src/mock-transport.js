export function createMockTransport({ latencyMs = 80, outcome = "sent" } = {}) {
  const keys = new Set();
  const requests = [];
  const attempts = [];
  return Object.freeze({
    requests,
    attempts,
    async send(request) {
      attempts.push(Object.freeze({ key: request.key, outcome }));
      if (outcome === "failed") throw Object.assign(new Error("Rejected before dispatch"), { code: "PRE_DISPATCH_FAILURE" });
      if (keys.has(request.key)) throw Object.assign(new Error("Duplicate request"), { code: "DUPLICATE_REQUEST" });
      keys.add(request.key);
      requests.push(Object.freeze({ ...request }));
      await new Promise(resolve => setTimeout(resolve, latencyMs));
      if (outcome === "unknown") throw Object.assign(new Error("Timeout after dispatch"), { code: "DELIVERY_TIMEOUT" });
      return { receipt: `mock-${request.key}` };
    }
  });
}
