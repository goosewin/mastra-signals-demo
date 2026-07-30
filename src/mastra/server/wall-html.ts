export const wallHtml = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Agent (After) Hour — the room is steering</title>
<style>
  :root {
    --bg:#08080a; --panel:#111116; --panel2:#17171d; --line:#25252e;
    --text:#f0f0f4; --dim:#8b8b9c; --accent:#8b7cf6; --good:#4ade80;
    --amber:#fbbf24; --bad:#f87171; --blue:#7dd3fc; --mongo:#00ed64;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { height:100%; overflow:hidden; }
  body {
    background:var(--bg); color:var(--text);
    font:16px/1.5 -apple-system,"SF Pro Text",Inter,system-ui,sans-serif;
    display:flex; flex-direction:column;
  }
  header {
    display:flex; align-items:center; gap:16px; padding:14px 26px;
    border-bottom:1px solid var(--line); flex:none;
  }
  header h1 { font-size:19px; font-weight:650; letter-spacing:-.01em; }
  .dot { width:10px; height:10px; border-radius:50%; background:var(--dim); display:inline-block; }
  .dot.live { background:var(--good); box-shadow:0 0 10px var(--good); animation:pulse 1.4s infinite; }
  @keyframes pulse { 50% { opacity:.4; } }
  .stat { display:flex; flex-direction:column; align-items:flex-end; line-height:1.15; }
  .stat b { font-size:23px; font-weight:700; font-variant-numeric:tabular-nums; }
  .stat span { font-size:10.5px; text-transform:uppercase; letter-spacing:.1em; color:var(--dim); }
  .stat.mongo b { color:var(--mongo); }
  .stats { margin-left:auto; display:flex; gap:26px; align-items:center; }

  main { flex:1; display:flex; min-height:0; }

  /* ---- agent stream ---- */
  #stream {
    flex:1.55; overflow-y:auto; padding:26px 34px 90px; min-width:0;
    font-size:25px; line-height:1.5; scroll-behavior:smooth;
  }
  #stream::-webkit-scrollbar { width:0; }
  #stream p { margin:14px 0; white-space:pre-wrap; }
  .tool {
    display:block; margin:16px 0; padding:12px 16px; background:var(--panel);
    border:1px solid var(--line); border-left:3px solid var(--blue); border-radius:9px;
    font:19px ui-monospace,"SF Mono",monospace; color:var(--blue);
  }
  .tool.done { border-left-color:var(--good); color:var(--good); }
  .tool.done::before { content:"✓ "; }
  .tool.running::before { content:"⚙ "; }
  .tool pre { font-size:15px; color:var(--dim); margin-top:6px; white-space:pre-wrap; max-height:150px; overflow:hidden; }
  .interject {
    margin:18px 0; padding:14px 18px; border-radius:10px;
    background:linear-gradient(90deg,#8b7cf622,transparent);
    border-left:3px solid var(--accent); font-size:23px;
    animation:slam .35s cubic-bezier(.2,.9,.3,1.4);
  }
  .interject b { color:var(--accent); }
  @keyframes slam { from { transform:translateX(-16px); opacity:0; } }
  .sysnote {
    margin:16px 0; padding:11px 16px; border-radius:9px; background:#1a1508;
    border-left:3px solid var(--amber); color:var(--amber); font-size:19px;
  }

  /* ---- right rail ---- */
  aside {
    flex:1; max-width:520px; border-left:1px solid var(--line);
    display:flex; flex-direction:column; background:var(--panel); min-height:0;
  }
  .join { padding:20px 22px; border-bottom:1px solid var(--line); text-align:center; flex:none; }
  .join img { width:190px; height:190px; border-radius:12px; background:#fff; padding:9px; }
  .join .url { font:600 18px ui-monospace,monospace; color:var(--accent); margin-top:11px; word-break:break-all; }
  .join .cta { font-size:13px; color:var(--dim); margin-top:5px; text-transform:uppercase; letter-spacing:.1em; }
  aside.compact .join img { width:104px; height:104px; }
  aside.compact .join { padding:13px 22px; }
  aside.compact .join .url { font-size:14px; margin-top:7px; }

  .rail { flex:1; display:flex; flex-direction:column; min-height:0; }
  .railhead {
    font:700 11.5px ui-monospace,monospace; letter-spacing:.13em; text-transform:uppercase;
    color:var(--dim); padding:15px 22px 9px; display:flex; align-items:center; gap:9px; flex:none;
  }
  .railhead .badge {
    margin-left:auto; background:var(--panel2); border:1px solid var(--line);
    border-radius:20px; padding:2px 9px; font-size:11px; color:var(--dim);
  }
  #feed { flex:1; overflow:hidden; padding:0 22px 14px; display:flex; flex-direction:column; gap:9px; }
  .msg {
    background:var(--panel2); border:1px solid var(--line); border-radius:10px;
    padding:11px 14px; font-size:17.5px; line-height:1.4; flex:none;
    animation:pop .3s cubic-bezier(.2,.9,.3,1.3);
  }
  .msg b { color:var(--accent); font-weight:650; }
  .msg.report b { color:var(--mongo); }
  @keyframes pop { from { transform:translateY(-8px) scale(.97); opacity:0; } }
  .gate {
    margin:0 22px 16px; padding:10px 14px; border-radius:9px; text-align:center;
    font-size:13.5px; border:1px dashed var(--line); color:var(--dim); flex:none;
  }
  .gate.open { border-color:var(--good); color:var(--good); border-style:solid; }

  /* ---- pending approval banner ---- */
  #approval {
    position:fixed; left:34px; right:34px; bottom:30px; display:none;
    align-items:center; gap:18px; z-index:14;
    background:#1a1508; border:1px solid var(--amber); border-radius:14px;
    padding:18px 24px; box-shadow:0 18px 50px #000a;
  }
  #approval.on { display:flex; animation:slam .35s cubic-bezier(.2,.9,.3,1.4); }
  #approval .pulse {
    width:13px; height:13px; border-radius:50%; background:var(--amber);
    animation:pulse 1.2s infinite; flex:none;
  }
  #approval b { font-size:22px; font-weight:650; display:block; }
  #approval small { color:var(--dim); font:15px ui-monospace,monospace; display:block; margin-top:4px; }
  #approval kbd {
    border:1px solid var(--line); border-radius:5px; padding:0 7px; color:var(--amber);
  }

  /* ---- toast + pull request banner ---- */
  #toast {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(16px);
    background:var(--panel2); border:1px solid var(--line); border-radius:11px;
    padding:12px 22px; font:600 17px ui-monospace,monospace; color:var(--accent);
    opacity:0; transition:.25s; pointer-events:none; z-index:20;
  }
  #toast.on { opacity:1; transform:translateX(-50%) translateY(0); }
  #pr {
    position:fixed; left:34px; right:34px; bottom:30px; display:none;
    align-items:center; gap:28px; z-index:15;
    background:linear-gradient(90deg,#0d2a18,#111116); border:1px solid var(--good);
    border-radius:16px; padding:22px 26px; box-shadow:0 18px 50px #000a;
  }
  #pr.on { display:flex; animation:slam .4s cubic-bezier(.2,.9,.3,1.4); }
  #pr img { width:118px; height:118px; background:#fff; border-radius:10px; padding:7px; flex:none; }
  #pr .prtext { flex:1; min-width:0; }
  #pr .kicker {
    font:700 12px ui-monospace,monospace; letter-spacing:.14em;
    text-transform:uppercase; color:var(--good);
  }
  #pr .prUrl { font:650 30px ui-monospace,monospace; margin:7px 0 5px; word-break:break-all; }
  #pr .prsub { color:var(--dim); font-size:16px; }
</style>
</head>
<body>
<header>
  <span class="dot" id="dot"></span>
  <h1>Field Triage — the room is steering</h1>
  <div class="stats">
    <div class="stat"><b id="sParticipants">0</b><span>in the room</span></div>
    <div class="stat mongo"><b id="sReports">0</b><span>reports in mongo</span></div>
    <div class="stat"><b id="sSteers">0</b><span>messages sent</span></div>
  </div>
</header>

<main>
  <div id="stream"></div>
  <aside id="rail">
    <div class="join">
      <img id="qr" alt="join QR" hidden />
      <div class="url" id="joinUrl">starting…</div>
      <div class="cta">scan to steer the agent</div>
    </div>
    <div class="rail">
      <div class="railhead">from the room <span class="badge" id="queueBadge"></span></div>
      <div id="feed"></div>
      <div class="gate" id="gate">audience steering is closed</div>
    </div>
  </aside>
</main>

<div id="toast"></div>

<div id="pr">
  <div class="prtext">
    <div class="kicker">the room shipped it</div>
    <div class="prUrl" id="prUrl"></div>
    <div class="prsub">open it on your phone — your handle is in the commit message</div>
  </div>
  <img id="prQr" alt="pull request QR" />
</div>

<div id="approval">
  <span class="pulse"></span>
  <div class="atext">
    <b>Run suspended — <span id="approvalSummary"></span></b>
    <small>sendToolApproval() · <kbd>5</kbd> ship it · <kbd>T</kbd> decline</small>
  </div>
</div>

<script type="module">
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
let threadId = params.get("threadId") ?? localStorage.getItem("threadId") ?? ("live" + Date.now());
localStorage.setItem("threadId", threadId);

/* ---------------- agent stream ---------------- */
const streamEl = $("stream");
let textEl = null;
const toolEls = new Map();
const atBottom = () => streamEl.scrollHeight - streamEl.scrollTop - streamEl.clientHeight < 220;
function stick() { if (atBottom()) streamEl.scrollTop = streamEl.scrollHeight; }

function appendText(delta) {
  if (!textEl) {
    textEl = document.createElement("p");
    streamEl.appendChild(textEl);
  }
  textEl.textContent += delta;
  stick();
}
function breakText() { textEl = null; }

function toolChip(id, name) {
  let el = toolEls.get(id);
  if (!el) {
    el = document.createElement("div");
    el.className = "tool running";
    el.innerHTML = \`<span class="name"></span>\`;
    el.querySelector(".name").textContent = name;
    streamEl.appendChild(el);
    toolEls.set(id, el);
    breakText();
    stick();
  }
  return el;
}

function finishTool(id, result) {
  const el = toolEls.get(id);
  if (!el) return;
  el.className = "tool done";
  const pre = document.createElement("pre");
  const text = typeof result === "string" ? result : JSON.stringify(result, null, 1);
  pre.textContent = (text ?? "").slice(0, 420);
  el.appendChild(pre);
  breakText();
  stick();
}

function interject(handle, text) {
  const el = document.createElement("div");
  el.className = "interject";
  el.innerHTML = "<b></b><span></span>";
  el.querySelector("b").textContent = handle + " → ";
  el.querySelector("span").textContent = text;
  streamEl.appendChild(el);
  breakText();
  streamEl.scrollTop = streamEl.scrollHeight;
}

function sysnote(text) {
  const el = document.createElement("div");
  el.className = "sysnote";
  el.textContent = text;
  streamEl.appendChild(el);
  breakText();
  stick();
}

let es;
function connect() {
  if (es) es.close();
  es = new EventSource(\`/demo/stream?threadId=\${encodeURIComponent(threadId)}\`);
  es.onopen = () => $("dot").className = "dot live";
  es.onerror = () => $("dot").className = "dot";
  es.onmessage = (e) => {
    let c;
    try { c = JSON.parse(e.data); } catch { return; }
    const p = c.payload ?? {};
    switch (c.type) {
      case "text-delta":
        appendText(p.text ?? p.textDelta ?? "");
        break;
      case "tool-call":
      case "tool-call-input-streaming-start":
        toolChip(p.toolCallId, p.toolName ?? "tool");
        break;
      case "tool-result": {
        const r = p.result ?? p.output;
        finishTool(p.toolCallId, r);
        if (r && r.url && String(r.url).includes("/pull/")) showPr(String(r.url));
        break;
      }
      case "tool-call-approval":
        sysnote("Waiting on the room to approve: " + (p.toolName ?? "a tool call"));
        break;
      case "step-finish":
      case "finish":
        breakText();
        break;
    }
  };
}
connect();

/* ---------------- room state ---------------- */
const seen = new Set();
const feed = $("feed");

function pushFeed(key, handle, text, kind) {
  if (seen.has(key)) return;
  seen.add(key);
  const el = document.createElement("div");
  el.className = "msg " + (kind ?? "");
  el.innerHTML = "<b></b><span></span>";
  el.querySelector("b").textContent = handle + " ";
  el.querySelector("span").textContent = text;
  feed.prepend(el);
  while (feed.children.length > 7) feed.lastChild.remove();
}

let lastReports = 0;
let qrSet = "";
let epoch = null;

function clearBoard() {
  streamEl.innerHTML = "";
  feed.innerHTML = "";
  toolEls.clear(); seen.clear(); interjected.clear();
  textEl = null; prShown = ""; lastReports = 0;
  $("pr").className = "";
  connect();
}

async function poll() {
  let s;
  try { s = await (await fetch("/room/state")).json(); } catch { return; }

  // Server was reset (by key 0 here, or from anywhere else) — drop all local state.
  if (epoch === null) epoch = s.epoch;
  else if (s.epoch !== epoch) { epoch = s.epoch; clearBoard(); }

  $("sParticipants").textContent = s.participants;
  $("sReports").textContent = s.reports;
  $("sSteers").textContent = s.received;
  $("queueBadge").textContent = s.queued ? s.queued + " waiting" : "";

  $("gate").textContent = s.floodgatesOpen
    ? \`live — one message reaches the agent every \${Math.round(s.steerIntervalMs / 1000)}s\`
    : "audience steering is closed";
  $("gate").className = "gate" + (s.floodgatesOpen ? " open" : "");

  if (s.publicUrl && s.publicUrl !== qrSet) {
    qrSet = s.publicUrl;
    const join = s.publicUrl.replace(/\\/$/, "") + "/phone";
    $("qr").src = "/qr?text=" + encodeURIComponent(join);
    $("qr").hidden = false;
    $("joinUrl").textContent = join.replace(/^https?:\\/\\//, "");
  }
  if (s.participants > 0) $("rail").classList.add("compact");

  for (const d of s.delivered) {
    pushFeed(d.handle + "|" + d.text, d.handle, d.text);
    interjectOnce("i:" + d.at + d.handle, d.handle, d.text);
  }

  if (s.reports !== lastReports) {
    lastReports = s.reports;
    try {
      const r = await (await fetch("/room/reports")).json();
      for (const rep of r.reports.slice(0, 5)) {
        pushFeed(rep.handle + "|" + rep.text, rep.handle, rep.text, "report");
      }
    } catch {}
  }

  $("approval").className = s.approval.pending && !prShown ? "on" : "";
  if (s.approval.pending) $("approvalSummary").textContent = s.approval.summary;
}

const interjected = new Set();
function interjectOnce(key, handle, text) {
  if (interjected.has(key)) return;
  interjected.add(key);
  interject(handle, text);
}

/* ---------------- pull request banner ---------------- */
let prShown = "";
function showPr(url) {
  if (prShown === url) return;
  prShown = url;
  $("prUrl").textContent = url.replace(/^https?:\\/\\//, "");
  $("prQr").src = "/qr?text=" + encodeURIComponent(url);
  $("pr").className = "on";
}

/* ---------------- speaker controls ---------------- */
const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json()).catch(() => ({}));

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "on";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ""; }, 2200);
}

let floodgates = false;

document.addEventListener("keydown", async (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  switch (e.key) {
    case "1":
      await post("/demo/start", { threadId });
      toast("paged the agent — sendMessage()");
      break;
    case "2":
      floodgates = !floodgates;
      await post("/demo/floodgates", { open: floodgates });
      toast(floodgates ? "the room is live" : "audience steering closed");
      break;
    case "3":
      await post("/demo/alert");
      toast("external alert — sendNotificationSignal()");
      break;
    case "4":
      await post("/demo/queue");
      toast("queued the changelog — queueMessage()");
      break;
    case "5":
      await post("/demo/approval", { approved: true });
      toast("shipping — sendToolApproval()");
      break;
    case "%":
    case "T":
      await post("/demo/approval", { approved: false });
      toast("declined — sendToolApproval(false)");
      break;
    case "0": {
      await post("/demo/reset");
      threadId = "live" + Date.now();
      localStorage.setItem("threadId", threadId);
      floodgates = false;
      clearBoard();
      toast("fresh thread — everything reset");
      break;
    }
    case "c":
      window.open("/cafe", "_blank");
      break;
  }
});

poll();
setInterval(poll, 1200);
</script>
</body>
</html>
`;
