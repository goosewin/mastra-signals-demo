export const dashboardHtml = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Steering Console — Mastra Signals</title>
<style>
  :root {
    --bg: #0a0a0b; --panel: #131316; --panel2: #18181c; --line: #26262c;
    --text: #ececf1; --dim: #8b8b96; --green: #4ade80; --amber: #fbbf24;
    --red: #f87171; --blue: #7dd3fc; --violet: #c4b5fd;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font: 16px/1.55 -apple-system, "SF Pro Text", Inter, system-ui, sans-serif;
    display: flex; flex-direction: column; overflow: hidden;
  }
  header {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 22px; border-bottom: 1px solid var(--line); flex: none;
  }
  .sev { background: var(--red); color: #000; font-weight: 800; font-size: 13px;
    padding: 3px 10px; border-radius: 6px; letter-spacing: .06em; }
  header h1 { font-size: 18px; font-weight: 650; }
  .thread { margin-left: auto; color: var(--dim); font: 13px ui-monospace, "SF Mono", monospace; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--dim); display: inline-block; margin-right: 6px; }
  .dot.live { background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 1.4s infinite; }
  @keyframes pulse { 50% { opacity: .45; } }
  main { flex: 1; display: flex; min-height: 0; }
  #streamPane {
    flex: 1.9; overflow-y: auto; padding: 26px 34px 120px; min-width: 0;
    font-size: 19px; line-height: 1.6;
  }
  #streamPane .turn-label {
    color: var(--violet); font: 600 13px ui-monospace, monospace;
    text-transform: uppercase; letter-spacing: .1em; margin: 26px 0 8px;
  }
  #streamPane p { margin: 10px 0; white-space: pre-wrap; }
  .tool {
    display: block; margin: 12px 0; padding: 10px 14px;
    background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--blue);
    border-radius: 8px; font: 15px ui-monospace, "SF Mono", monospace; color: var(--blue);
  }
  .tool .args { color: var(--dim); }
  .tool.done { border-left-color: var(--green); }
  .tool.done::before { content: "✓ "; color: var(--green); }
  .tool.running::before { content: "⚙ "; }
  .divider { margin: 22px 0; border: 0; border-top: 1px dashed var(--line); position: relative; }
  .divider::after {
    content: attr(data-label); position: absolute; top: -11px; left: 0;
    background: var(--bg); padding-right: 10px; color: var(--dim);
    font: 12px ui-monospace, monospace; text-transform: uppercase; letter-spacing: .1em;
  }
  aside {
    flex: 1; max-width: 480px; border-left: 1px solid var(--line);
    display: flex; flex-direction: column; background: var(--panel); min-height: 0;
  }
  aside h2 {
    font: 700 13px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase;
    color: var(--dim); padding: 16px 20px 10px;
  }
  .controls { padding: 0 20px; display: flex; flex-direction: column; gap: 10px; }
  button {
    font: 600 15px/1.2 inherit; color: var(--text); background: var(--panel2);
    border: 1px solid var(--line); border-radius: 10px; padding: 13px 16px;
    cursor: pointer; text-align: left; transition: border-color .12s, transform .05s;
    display: flex; align-items: center; gap: 10px;
  }
  button:hover { border-color: var(--dim); }
  button:active { transform: scale(.985); }
  button .k { margin-left: auto; color: var(--dim); font: 12px ui-monospace, monospace;
    border: 1px solid var(--line); border-radius: 5px; padding: 1px 7px; }
  button.primary { background: var(--green); color: #04120a; border-color: var(--green); }
  button.danger { border-color: #7f1d1d; }
  button.danger:hover { border-color: var(--red); }
  button small { display: block; font-weight: 400; color: var(--dim); font-size: 12.5px; margin-top: 2px; }
  button.primary small { color: #04120aab; }
  .btn-body { display: flex; flex-direction: column; }
  .steer-row { display: flex; gap: 8px; }
  .steer-row input {
    flex: 1; background: var(--bg); color: var(--text); border: 1px solid var(--line);
    border-radius: 10px; padding: 12px 14px; font: 15px inherit;
  }
  .steer-row input:focus { outline: none; border-color: var(--green); }
  .steer-row button { flex: none; }
  #eventLog { flex: 1; overflow-y: auto; padding: 10px 20px 20px; min-height: 0; }
  .evt { font: 13.5px ui-monospace, "SF Mono", monospace; color: var(--dim);
    padding: 7px 0; border-bottom: 1px solid var(--line); }
  .evt b { color: var(--amber); font-weight: 600; }
  .evt .t { color: var(--dim); opacity: .7; margin-right: 8px; }
  footer {
    flex: none; border-top: 1px solid var(--line); padding: 10px 22px;
    color: var(--dim); font: 13px ui-monospace, monospace; display: flex; gap: 18px;
  }
  footer span b { color: var(--text); font-weight: 600; }
</style>
</head>
<body>
<header>
  <span class="sev">SEV-1</span>
  <h1>checkout-api · p99 latency spike</h1>
  <span class="thread"><span class="dot" id="dot"></span>thread <span id="threadLabel"></span></span>
</header>
<main>
  <div id="streamPane"></div>
  <aside>
    <h2>Steering console</h2>
    <div class="controls">
      <button class="primary" onclick="startRun()">
        <span>▶</span>
        <span class="btn-body">Page the agent
          <small>sendMessage() — wakes the thread, starts the run</small></span>
        <span class="k">1</span>
      </button>
      <button class="danger" onclick="fireAlert()">
        <span>🚨</span>
        <span class="btn-body">Second page: payment-gateway
          <small>sendNotificationSignal() — webhook lands mid-run</small></span>
        <span class="k">2</span>
      </button>
      <div class="steer-row">
        <input id="steerInput" placeholder="Steer the agent mid-run…"
          value="Customers only complaining in the EU — break latency down by region before anything else." />
        <button onclick="steer()"><span>🎯</span><span class="k">3</span></button>
      </div>
      <button onclick="queueFollowUp()">
        <span>⏭</span>
        <span class="btn-body">Queue: draft the postmortem
          <small>queueMessage() — runs after the current turn finishes</small></span>
        <span class="k">4</span>
      </button>
      <button onclick="toggleFreeze()">
        <span>🧊</span>
        <span class="btn-body">Flip deploy-freeze state lane <span id="freezeState"></span>
          <small>sendStateSignal() — durable thread-scoped context</small></span>
        <span class="k">5</span>
      </button>
      <button onclick="newIncident()">
        <span>♻️</span>
        <span class="btn-body">New incident <small>fresh threadId, clean run</small></span>
        <span class="k">0</span>
      </button>
    </div>
    <h2>Injected events</h2>
    <div id="eventLog"></div>
  </aside>
</main>
<footer>
  <span>agent: <b>incident-agent</b></span>
  <span>server: <b>mastra dev :4111</b></span>
  <span>open this URL in another tab → same thread, same live stream</span>
</footer>
<script>
  const qs = new URLSearchParams(location.search);
  let threadId = qs.get("thread") || localStorage.getItem("demo-thread") || newThreadId();
  let frozen = false;
  let es = null;

  function newThreadId() {
    return "inc-" + new Date().toISOString().slice(11, 19).replaceAll(":", "");
  }
  function setThread(id) {
    threadId = id;
    localStorage.setItem("demo-thread", id);
    document.getElementById("threadLabel").textContent = id;
  }
  function logEvent(html) {
    const el = document.createElement("div");
    el.className = "evt";
    el.innerHTML = '<span class="t">' + new Date().toTimeString().slice(0, 8) + "</span>" + html;
    const log = document.getElementById("eventLog");
    log.prepend(el);
  }
  async function post(path, body) {
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ threadId }, body)),
    });
  }

  // --- steering actions -----------------------------------------------------
  function startRun() {
    post("/demo/start");
    logEvent("<b>sendMessage</b> page: checkout latency spiking — investigate");
  }
  function fireAlert() {
    post("/demo/alert");
    logEvent("<b>sendNotificationSignal</b> pagerduty: payment-gateway errors 4.0%");
  }
  function steer() {
    const input = document.getElementById("steerInput");
    const text = input.value.trim();
    if (!text) return;
    post("/demo/steer", { text });
    logEvent("<b>sendMessage</b> steer: " + escapeHtml(text));
    input.value = "";
  }
  function queueFollowUp() {
    post("/demo/queue", {
      text: "Now draft a short postmortem for the incident channel: impact, timeline, root cause, fix, two follow-up actions.",
    });
    logEvent("<b>queueMessage</b> postmortem draft (runs after current turn)");
  }
  function toggleFreeze() {
    frozen = !frozen;
    post("/demo/state", { frozen });
    document.getElementById("freezeState").textContent = frozen ? "· ON" : "";
    logEvent("<b>sendStateSignal</b> deploy-policy: " + (frozen ? "FREEZE ACTIVE" : "open"));
  }
  function newIncident() {
    setThread(newThreadId());
    document.getElementById("streamPane").innerHTML = "";
    document.getElementById("eventLog").innerHTML = "";
    frozen = false;
    document.getElementById("freezeState").textContent = "";
    connect();
  }

  // --- stream rendering -----------------------------------------------------
  const pane = document.getElementById("streamPane");
  let currentP = null;
  const toolEls = {};

  function autoscroll() { pane.scrollTop = pane.scrollHeight; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }
  function mdLite(raw) {
    let s = escapeHtml(raw);
    s = s.replace(/^#{1,4}\\s+(.+)$/gm, "<strong>$1</strong>");
    s = s.replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
    s = s.replace(/\\u0060([^\\u0060]+)\\u0060/g, "<code>$1</code>");
    return s;
  }
  function appendText(text) {
    if (!currentP) {
      currentP = document.createElement("p");
      currentP.dataset.raw = "";
      pane.appendChild(currentP);
    }
    currentP.dataset.raw += text;
    currentP.innerHTML = mdLite(currentP.dataset.raw);
    autoscroll();
  }
  function breakParagraph() { currentP = null; }

  function renderChunk(chunk) {
    const p = chunk.payload || {};
    switch (chunk.type) {
      case "start": {
        breakParagraph();
        const hr = document.createElement("hr");
        hr.className = "divider";
        hr.setAttribute("data-label", "run started");
        pane.appendChild(hr);
        break;
      }
      case "text-delta":
        appendText(p.text ?? p.textDelta ?? "");
        break;
      case "text-end":
      case "step-start":
        breakParagraph();
        break;
      case "tool-call": {
        breakParagraph();
        const el = document.createElement("span");
        el.className = "tool running";
        const args = p.args ?? p.input ?? {};
        el.innerHTML = escapeHtml(p.toolName || "tool") +
          ' <span class="args">' + escapeHtml(JSON.stringify(args)) + "</span>";
        pane.appendChild(el);
        if (p.toolCallId) toolEls[p.toolCallId] = el;
        autoscroll();
        break;
      }
      case "tool-result": {
        const el = p.toolCallId && toolEls[p.toolCallId];
        if (el) { el.classList.remove("running"); el.classList.add("done"); }
        break;
      }
      case "finish": {
        breakParagraph();
        const hr = document.createElement("hr");
        hr.className = "divider";
        hr.setAttribute("data-label", "run finished");
        pane.appendChild(hr);
        autoscroll();
        break;
      }
      case "error":
        breakParagraph();
        appendText("⚠ " + JSON.stringify(p).slice(0, 400));
        breakParagraph();
        break;
      default:
        break; // ignore bookkeeping chunks
    }
  }

  function connect() {
    if (es) es.close();
    setThread(threadId);
    es = new EventSource("/demo/stream?threadId=" + encodeURIComponent(threadId));
    es.onopen = () => document.getElementById("dot").classList.add("live");
    es.onerror = () => {
      document.getElementById("dot").classList.remove("live");
      // EventSource auto-reconnects; the server route re-subscribes to the thread.
    };
    es.onmessage = (e) => {
      try { renderChunk(JSON.parse(e.data)); } catch {}
    };
  }

  // keyboard shortcuts for the live demo
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "1") startRun();
    if (e.key === "2") fireAlert();
    if (e.key === "3") document.getElementById("steerInput").focus();
    if (e.key === "4") queueFollowUp();
    if (e.key === "5") toggleFreeze();
    if (e.key === "0") newIncident();
  });

  connect();
</script>
</body>
</html>`;
