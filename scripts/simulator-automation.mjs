import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const base = process.env.EVEN_SIM_URL ?? "http://127.0.0.1:9898";
const timeoutMs = Number(process.env.EVEN_SIM_TIMEOUT_MS ?? 15000);
const confirmingScreenshotPath = process.env.EVEN_SIM_CONFIRMING_SCREENSHOT
  ?? "artifacts/simulator-confirming.png";

async function request(path, init) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs), ...init });
  if (!response.ok) throw new Error(`${path} HTTP_${response.status}`);
  return response;
}
async function input(action) {
  await request("/api/input", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action })
  });
}
async function consoleText() {
  const response = await request("/api/console");
  return JSON.stringify(await response.json());
}
async function waitFor(pattern, previous) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await consoleText();
    if ((previous === undefined || value !== previous) && pattern.test(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`CONSOLE_TIMEOUT_${pattern.source}`);
}
async function captureGlasses(path) {
  const screenshot = new Uint8Array(await (await request("/api/screenshot/glasses")).arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => screenshot[index] === value)) throw new Error("INVALID_PNG");
  const view = new DataView(screenshot.buffer, screenshot.byteOffset, screenshot.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width !== 576 || height !== 288) throw new Error(`BAD_FRAME_${width}x${height}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, screenshot);
  return { width, height, bytes: screenshot.byteLength, path };
}

const ping = await (await request("/api/ping")).text();
if (ping.trim() !== "pong") throw new Error("SIMULATOR_NOT_READY");

// Startup emits READING before the harness connects. Keep the console intact and
// use each observed console snapshot as a cursor for the next state transition.
let logs = await waitFor(/PEEK_STATE state=READING/);
await input("click");
logs = await waitFor(/PEEK_STATE state=CHOOSING selected=0/, logs);
await input("down");
logs = await waitFor(/PEEK_STATE state=CHOOSING selected=1/, logs);
await input("click");
logs = await waitFor(/PEEK_STATE state=CONFIRMING selected=1/, logs);
const confirmingScreenshot = await captureGlasses(confirmingScreenshotPath);
await input("click");
logs = await waitFor(/PEEK_STATE state=SENT/, logs);

for (const state of ["READING", "CHOOSING", "CONFIRMING", "SENDING", "SENT"]) {
  if (!logs.includes(`state=${state}`)) throw new Error(`MISSING_STATE_${state}`);
}
if (/\[uncaught\]|\[unhandledrejection\]|PEEK_(SDK|INPUT)_ERROR/.test(logs)) {
  throw new Error("SIMULATOR_CONSOLE_ERROR");
}
process.stdout.write(`${JSON.stringify({
  ok: true,
  states: 5,
  selectedReplyIndex: 1,
  confirmingScreenshot,
  externalTelegram: false
})}\n`);
