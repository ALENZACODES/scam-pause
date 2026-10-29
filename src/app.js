import { analyze, trustedMessage, CALL_QUESTIONS, callToText } from "./engine.js";
import { GROUPS } from "./signals.js";
import { SOURCES, NUMBERS } from "./sources.js";
import { CORPUS } from "./corpus.js";
import { HOLDOUT } from "./holdout.js";
import { evaluate } from "./evaluate.js";

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const SPEED = Math.max(1, Math.min(120, Number(qs.get("speed")) || 1)); // for demos only
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v; else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const toast = (m) => { const t = h("div", { class: "toast", role: "status", text: m }); document.body.append(t); setTimeout(() => t.remove(), 2200); };
const WEIGHT = { 5: "very strong", 4: "very strong", 3: "strong", 2: "caution", 1: "context" };

let mode = "message"; let last = null; let timer = null;
function setTab(m) {
  mode = m; $("tabMsg").setAttribute("aria-selected", m === "message"); $("tabCall").setAttribute("aria-selected", m === "call");
  $("msgPane").hidden = m !== "message"; $("callPane").hidden = m !== "call";
  resetResult();
}
function resetResult() {
  for (const id of ["result", "pause", "ask", "sent"]) $(id).hidden = true;
  clearInterval(timer); delete document.body.dataset.level; delete document.body.dataset.pauseDone;
}
$("tabMsg").addEventListener("click", () => setTab("message"));
$("tabCall").addEventListener("click", () => setTab("call"));

// Examples
$("samples").replaceChildren(...CORPUS.filter((c) => c.sample).map((c) => h("button", { class: "linkish", type: "button", "data-sample": c.sample, onclick: () => { setTab("message"); $("msg").value = c.text; check(); }, text: c.sample })));

// Call questions
$("callQs").replaceChildren(...CALL_QUESTIONS.map((q) => q.multi
  ? h("fieldset", {}, h("legend", { text: q.q }), h("div", { class: "chips" }, ...q.options.map(([v, t]) => h("label", {}, h("input", { type: "checkbox", name: q.id, value: v }), t))))
  : h("fieldset", {}, h("legend", { text: q.q }), h("select", { id: `q-${q.id}`, name: q.id, "aria-label": q.q }, ...q.options.map(([v, t]) => h("option", { value: v, text: t }))))));
function callAnswers() {
  const a = {};
  for (const q of CALL_QUESTIONS) a[q.id] = q.multi ? [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map((i) => i.value) : $(`q-${q.id}`).value;
  return a;
}

function check() {
  const text = mode === "call" ? callToText(callAnswers()) : $("msg").value.trim();
  if (!text) { toast(mode === "call" ? "Pick at least one answer" : "Paste or type the message first"); return; }
  resetResult();
  const r = analyze(text, { channel: mode });
  last = r; render(r);
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("checkBtn").addEventListener("click", check);

function render(r) {
  $("result").hidden = false;
  document.body.dataset.level = r.level;
  $("banner").className = `banner ${r.level}`;
  $("banner").replaceChildren(h("h2", { text: r.headline }), h("p", { text: r.honest }));
  const st = $("story"); st.hidden = !r.story;
  if (r.story) st.replaceChildren(h("div", { class: "kicker", text: "It looks like" }), h("h3", { text: cap(r.story.name) }),
    h("p", {}, h("strong", { text: "What usually happens next: " }), r.story.next), h("p", {}, h("strong", { text: "How to check safely: " }), r.story.check),
    h("p", { class: "note" }, "Source: ", h("a", { href: SOURCES[r.story.source].url, target: "_blank", rel: "noopener", text: SOURCES[r.story.source].name })));
  // Signs grouped
  const signs = $("signs"); signs.replaceChildren();
  if (!r.hits.length && !r.linkFlags.length) signs.append(h("li", { class: "empty", text: "None of the common signs. Still check before sending money or a code." }));
  for (const g of Object.keys(GROUPS)) {
    const hs = r.hits.filter((x) => x.group === g); if (!hs.length) continue;
    signs.append(h("li", { class: "grp", text: GROUPS[g] }));
    for (const s of hs) signs.append(h("li", {}, h("div", { class: "t" }, s.label, h("span", { class: `w w${s.weight}`, text: WEIGHT[s.weight] })), h("p", { text: s.why }),
      h("div", { class: "q", text: `Its words: ${s.matches.slice(0, 2).map((m) => `"${m.text}"`).join(", ")}` }),
      h("a", { class: "src", href: SOURCES[s.source].url, target: "_blank", rel: "noopener", text: SOURCES[s.source].name })));
  }
  // Marked text
  const spans = r.hits.flatMap((x) => x.matches.map((m) => ({ ...m, g: x.id === "link" ? "link" : x.group, label: x.label }))).sort((a, b) => a.index - b.index || b.end - a.end);
  const parts = []; let at = 0;
  for (const s of spans) { if (s.index < at) continue; if (s.index > at) parts.push(document.createTextNode(r.text.slice(at, s.index))); parts.push(h("mark", { class: `g-${s.g}`, title: s.label, text: r.text.slice(s.index, s.end) })); at = s.end; }
  if (at < r.text.length) parts.push(document.createTextNode(r.text.slice(at)));
  $("marked").replaceChildren(...parts);
  $("linksBox").replaceChildren(...r.links.map((l) => h("div", { class: `linkcheck ${l.flags.length ? "bad" : l.owner ? "ok" : ""}` },
    h("div", {}, "Link: ", h("code", { text: l.host })),
    l.owner && !l.flags.length ? h("div", { text: `This address belongs to ${l.owner}. Even so, it is safer to type it yourself than to tap it.` }) : null,
    !l.owner && !l.flags.length ? h("div", { text: "Not an address Scam Pause knows. That alone proves nothing, but don't enter details there." }) : null,
    ...l.flags.map((f) => h("div", {}, h("strong", { text: `${f.label}. ` }), f.why)))));
  // Trusted message
  $("tMsg").value = trustedMessage(r, { name: $("tName").value.trim(), channel: mode });
  updateLinks();
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Pause
const CHECKS = ["Hang up or stop replying. You can always call back later.", "Don't use any number, link or app they gave you.", "Call the organisation or person yourself, using a number you already had: the back of your card, their website typed by hand, or your contacts.", "If you can, use a different phone, or wait the full ten minutes before calling. Scammers can keep a line open.", "Tell someone you trust what happened.", "Don't send money, gift cards, crypto or a code while you are unsure."];
function startPause() {
  $("pause").hidden = false; $("pauseDone").hidden = true;
  $("checklist").replaceChildren(...CHECKS.map((c, i) => h("li", {}, h("label", {}, h("input", { type: "checkbox", id: `ck${i}` }), c))));
  const end = Date.now() + (10 * 60 * 1000) / SPEED;
  clearInterval(timer);
  const tick = () => {
    const left = Math.max(0, end - Date.now()) * SPEED; const s = Math.ceil(left / 1000);
    $("timer").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    if (left <= 0) { clearInterval(timer); donePause(); }
  };
  tick(); timer = setInterval(tick, 250);
  $("pause").scrollIntoView({ behavior: "smooth", block: "start" });
}
function donePause() {
  $("timer").textContent = "0:00"; $("pauseDone").hidden = false;
  $("pauseDone").textContent = "Ten minutes are up. If it was real, it is still real now. Call back using a number you found yourself, never the one they gave you.";
  document.body.dataset.pauseDone = "1";
}
$("pauseBtn").addEventListener("click", startPause);
$("stopPause").addEventListener("click", () => { clearInterval(timer); donePause(); });

// Trusted person
const TKEY = "scam-pause-trusted";
try { const t = JSON.parse(localStorage.getItem(TKEY) || "{}"); $("tName").value = t.name || ""; $("tPhone").value = t.phone || ""; } catch {}
function saveTrusted() { localStorage.setItem(TKEY, JSON.stringify({ name: $("tName").value.trim(), phone: $("tPhone").value.trim() })); }
function updateLinks() {
  const ph = $("tPhone").value.replace(/[^\d+]/g, "");
  $("smsLink").href = ph ? `sms:${ph}?&body=${encodeURIComponent($("tMsg").value)}` : "#";
  $("callLink").href = ph ? `tel:${ph}` : "#";
  $("smsLink").setAttribute("aria-disabled", !ph); $("callLink").setAttribute("aria-disabled", !ph);
}
for (const id of ["tName", "tPhone"]) $(id).addEventListener("input", () => { saveTrusted(); if (last) $("tMsg").value = trustedMessage(last, { name: $("tName").value.trim(), channel: mode }); updateLinks(); });
$("tMsg").addEventListener("input", updateLinks);
for (const id of ["smsLink", "callLink"]) $(id).addEventListener("click", (e) => { if ($(id).getAttribute("href") === "#") { e.preventDefault(); $("tPhone").focus(); toast("Add their phone number first"); } });
$("askBtn").addEventListener("click", () => { $("ask").hidden = false; $("ask").scrollIntoView({ behavior: "smooth", block: "start" }); });
$("copyMsg").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("tMsg").value); toast("Copied"); } catch { $("tMsg").select(); toast("Selected. Press Ctrl+C to copy"); } });
$("sentBtn").addEventListener("click", () => { $("sent").hidden = false; $("sent").scrollIntoView({ behavior: "smooth", block: "start" }); });

// Numbers
$("numbers").replaceChildren(...NUMBERS.map((n) => h("li", {}, n.num ? h("b", {}, h("a", { href: `tel:${n.num.replace(/-/g, "")}`, text: n.num })) : h("b", { text: "On your card" }), n.who)));

// About, with the test results computed live from the two made up sets
const dev = evaluate(CORPUS), held = evaluate(HOLDOUT);
const pct = (x) => `${Math.round(x * 100)}%`;
$("about").replaceChildren(
  h("h3", { text: "How it works" }),
  h("p", { text: `Scam Pause reads the words with plain rules, one for each warning sign the Canadian Anti-Fraud Centre, the CRA and Canada Post describe: how they want to be paid, what they ask you to do, how they pressure you, and who they claim to be. It checks web addresses for lookalike names, disguised letters and unusual endings without opening them. When the signs fit a known story, like the bank investigator scam, it says so and tells you what usually comes next. There is no AI model and no server, so it works offline and every flag can be explained.` }),
  h("h3", { text: "How well it does, on made up messages" }),
  h("table", {}, h("tr", {}, h("th", { text: "Set" }), h("th", { text: "Messages" }), h("th", { text: "Scams flagged" }), h("th", { text: "Real messages left alone" }), h("th", { text: "Right story" })),
    ...[["Written while building", dev], ["Written after, never tuned on", held]].map(([n, e]) => h("tr", {}, h("td", { text: n }), h("td", { text: String(e.n) }), h("td", { text: `${e.tp} of ${e.scams} (${pct(e.recall)})` }), h("td", { text: `${e.tn} of ${e.reals} (${pct(e.specificity)})` }), h("td", { text: `${e.storyRight} of ${e.storyN}` })))),
  h("p", { class: "note", text: "All messages were written for this project. Real scams change their wording, so expect it to do worse on real ones." }),
  h("h3", { text: "What it cannot do" }),
  h("ul", {}, ...["It reads words, not voices. A caller who avoids the usual words, with no payment method, no rush and no secrecy, can score low.", "It cannot tell who really sent a message. Caller ID and sender names can be faked, and it can't check them.", "It can't open links, so a real looking address can still lead somewhere bad after a redirect.", "It is in English only for now.", "It is not an emergency service and not a replacement for your bank or the police."].map((t) => h("li", { text: t }))),
  h("h3", { text: "Sources" }),
  h("ul", {}, ...Object.values(SOURCES).map((s) => h("li", {}, h("a", { href: s.url, target: "_blank", rel: "noopener", text: s.name })))));
if (qs.get("example")) { const c = CORPUS.find((x) => x.sample === qs.get("example")); if (c) { $("msg").value = c.text; check(); } }
document.body.dataset.ready = "1";
