export const phoneHtml = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Steer the agent</title>
<style>
  :root {
    --bg:#0b0b0d; --card:#151519; --line:#26262e; --text:#f2f2f5; --dim:#8e8e9c;
    --accent:#8b7cf6; --good:#4ade80; --bad:#f87171; --amber:#fbbf24;
  }
  * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body {
    background:var(--bg); color:var(--text); min-height:100vh;
    font:16px/1.5 -apple-system,"SF Pro Text",Inter,system-ui,sans-serif;
    padding:18px 16px calc(28px + env(safe-area-inset-bottom)); max-width:520px; margin:0 auto;
  }
  header { margin-bottom:16px; }
  h1 { font-size:19px; font-weight:650; letter-spacing:-.01em; }
  header p { color:var(--dim); font-size:13.5px; margin-top:2px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:15px; margin-bottom:12px; }
  label {
    font-weight:600; font-size:11.5px; line-height:1; text-transform:uppercase;
    letter-spacing:.09em; color:var(--dim); display:block; margin-bottom:8px;
  }
  input, textarea {
    width:100%; background:#101014; color:var(--text);
    font-family:inherit; font-size:16px;
    border:1px solid var(--line); border-radius:10px; padding:12px; resize:none;
  }
  input:focus, textarea:focus { outline:none; border-color:var(--accent); }
  button {
    font-family:inherit; font-weight:600; font-size:15px;
    border-radius:10px; padding:13px 16px; width:100%;
    border:1px solid var(--line); background:#1e1e24; color:var(--text); cursor:pointer; margin-top:10px;
  }
  button.primary { background:var(--accent); color:#0d0919; border-color:var(--accent); }
  button:disabled { opacity:.5; }
  .hint { color:var(--dim); font-size:12.5px; margin-top:8px; }
  .flash { font-size:13.5px; margin-top:10px; min-height:19px; }
  .flash.ok { color:var(--good); } .flash.err { color:var(--amber); }
  .vote { border-color:var(--accent); box-shadow:0 0 0 3px #8b7cf622; }
  .vote h2 { font-size:16px; margin-bottom:5px; }
  .vote .q { color:var(--dim); font-size:13.5px; margin-bottom:12px; }
  .vote .row { display:flex; gap:10px; }
  .vote .row button { margin-top:0; }
  .yes { background:var(--good); color:#04120a; border-color:var(--good); }
  .no  { background:#2a1618; color:var(--bad); border-color:#5f2224; }
  .tally { text-align:center; color:var(--dim); font-size:13px; margin-top:10px; font-variant-numeric:tabular-nums; }
  .who { display:flex; align-items:center; gap:8px; color:var(--dim); font-size:13px; margin-bottom:14px; }
  .who b { color:var(--text); font-weight:600; }
  .who button { width:auto; margin:0; padding:5px 10px; font-size:12px; background:none; border:0; color:var(--accent); }
  a { color:var(--accent); }
  .hidden { display:none; }
</style>
</head>
<body>
<header>
  <h1>Steer the agent</h1>
  <p>Agent (After) Hour · Motoring Coffee</p>
</header>

<div class="who">you are <b id="who">…</b> <button id="rename">change</button></div>

<div class="card vote hidden" id="voteCard">
  <h2>The agent wants to open a pull request.</h2>
  <div class="q" id="voteSummary"></div>
  <div class="row">
    <button class="yes" id="voteYes">Ship it</button>
    <button class="no" id="voteNo">Not yet</button>
  </div>
  <div class="tally" id="voteTally"></div>
</div>

<div class="card">
  <label for="report">Found a bug on the order page?</label>
  <textarea id="report" rows="3" placeholder="A large latte is cheaper than a medium…"></textarea>
  <button class="primary" id="sendReport">File a report</button>
  <div class="hint">Goes straight into MongoDB. The agent reads it live.</div>
  <div class="flash" id="reportFlash"></div>
</div>

<div class="card">
  <label for="steer">Or talk to the agent, right now</label>
  <textarea id="steer" rows="2" placeholder="fix the pricing bug first, people are being overcharged"></textarea>
  <button id="sendSteer">Send into the run</button>
  <div class="hint" id="steerHint">Delivered into the agent's loop while it's still thinking.</div>
  <div class="flash" id="steerFlash"></div>
</div>

<p style="text-align:center;color:var(--dim);font-size:13px;margin-top:16px">
  <a href="/cafe" target="_blank">Open the order page →</a>
</p>

<script type="module">
const $ = (id) => document.getElementById(id);
const ANIMALS = ["otter","heron","marmot","ibex","tapir","lynx","civet","dingo","quokka","kestrel","vole","shrike"];

function makeHandle() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)] + Math.floor(10 + Math.random() * 89);
}
let handle = localStorage.getItem("handle");
if (!handle) { handle = makeHandle(); localStorage.setItem("handle", handle); }
$("who").textContent = handle;

$("rename").onclick = () => {
  const next = (prompt("Pick a handle (shown on the big screen):", handle) || "").trim().slice(0, 24);
  if (next) { handle = next; localStorage.setItem("handle", handle); $("who").textContent = handle; }
};

function flash(el, msg, ok) {
  el.textContent = msg;
  el.className = "flash " + (ok ? "ok" : "err");
  setTimeout(() => { el.textContent = ""; }, 4000);
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

$("sendReport").onclick = async () => {
  const text = $("report").value.trim();
  if (!text) return;
  $("sendReport").disabled = true;
  const r = await post("/room/report", { handle, text });
  $("sendReport").disabled = false;
  if (r.ok) { $("report").value = ""; flash($("reportFlash"), "Filed. It's in the backlog.", true); }
  else flash($("reportFlash"), r.reason ?? "Try again.", false);
};

$("sendSteer").onclick = async () => {
  const text = $("steer").value.trim();
  if (!text) return;
  $("sendSteer").disabled = true;
  const r = await post("/room/steer", { handle, text });
  $("sendSteer").disabled = false;
  if (r.ok) {
    $("steer").value = "";
    flash($("steerFlash"), r.gated ? "Queued — the room isn't open yet." : "Sent into the live run.", true);
  } else flash($("steerFlash"), r.reason ?? "Try again.", false);
};

let votedThisRound = false;
async function castVote(approve) {
  await post("/room/vote", { handle, approve });
  votedThisRound = true;
  $("voteYes").disabled = $("voteNo").disabled = true;
}
$("voteYes").onclick = () => castVote(true);
$("voteNo").onclick = () => castVote(false);

async function poll() {
  try {
    const s = await (await fetch("/room/state")).json();
    const v = s.vote;
    $("voteCard").classList.toggle("hidden", !v.open);
    if (v.open) {
      $("voteSummary").textContent = v.summary;
      $("voteTally").textContent = \`\${v.yes} ship it · \${v.no} not yet\`;
      if (!votedThisRound) $("voteYes").disabled = $("voteNo").disabled = false;
    } else {
      votedThisRound = false;
    }
    $("steerHint").textContent = s.floodgatesOpen
      ? \`Live. One message from the room reaches the agent every \${Math.round(s.steerIntervalMs / 1000)}s — \${s.queued} waiting.\`
      : "Delivered into the agent's loop while it's still thinking.";
  } catch {}
}
poll();
setInterval(poll, 1500);
</script>
</body>
</html>
`;
