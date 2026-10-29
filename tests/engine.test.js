import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze, scan, redact, trustedMessage, callToText } from "../src/engine.js";
import { findLinks, checkLink, registrable } from "../src/links.js";
import { SIGNALS } from "../src/signals.js";
import { SOURCES } from "../src/sources.js";
import { CORPUS } from "../src/corpus.js";
import { HOLDOUT } from "../src/holdout.js";
import { evaluate } from "../src/evaluate.js";

test("every sign has words, a weight, a reason and a real source", () => {
  for (const s of SIGNALS) { assert.ok(s.rx.length && s.weight >= 1 && s.weight <= 5 && s.why.length > 30, s.id); assert.ok(SOURCES[s.source], s.id); }
  for (const src of Object.values(SOURCES)) assert.match(src.url, /^https:\/\/(www\.)?(canada\.ca|antifraudcentre-centreantifraude\.ca|canadapost-postescanada\.ca)\//);
});

test("the four classic stories are named", () => {
  assert.equal(analyze("This is the RBC fraud department. Move your funds to a secure account and stay on the line.").story.id, "bank");
  assert.equal(analyze("CRA: pay your tax debt with gift cards or you will be arrested.").story.id, "cra");
  assert.equal(analyze("Hi grandma it's me, new number. I need $2,000 for bail, don't tell mom.").story.id, "emergency");
  assert.equal(analyze("Canada Post: parcel on hold, pay the $1.99 fee at canadapost-help.info").story.id, "delivery");
});

test("advice is not a request: negated signs are ignored", () => {
  const r = analyze("Your code is 482913. Do not share this code with anyone. We will never ask you to move money to a safe account or hand over your card.");
  assert.equal(r.level, "low");
  assert.ok(!scan("Never read the code back to anyone.").some((h) => h.id === "code"));
  assert.ok(scan("Read me the code we just sent.").some((h) => h.id === "code"));
});

test("link checks: lookalikes, punycode, odd endings, shorteners, numbers", () => {
  const f = (u) => checkLink(findLinks(u)[0]).flags.map((x) => x.id);
  assert.ok(f("http://xn--intrac-9ya.com/x").includes("punycode"));
  assert.ok(f("canadap0st.ca/update").includes("lookalike"));
  assert.ok(f("netf1ix-billing.com").includes("lookalike"));
  assert.ok(f("rbc-secure-login.xyz").includes("tld"));
  assert.ok(f("bit.ly/abc").includes("short"));
  assert.ok(f("http://192.168.4.7/login").includes("ip"));
  assert.ok(f("cra-gc-ca.com").includes("lookalike"));
  assert.deepEqual(f("https://www.canada.ca/en/revenue-agency.html"), []);
  assert.equal(checkLink(findLinks("canadapost.ca/track")[0]).owner, "Canada Post");
  assert.equal(registrable("www.cra-arc.gc.ca"), "cra-arc.gc.ca");
  assert.deepEqual(findLinks("Pay $49.99 e.g. today"), []);
});

test("a message to a trusted person never carries links, codes or card numbers", () => {
  const t = "TD: read back code 482913 and confirm card 4520 1234 5678 9012 at td-secure.top/login or email help@td-secure.top";
  const red = redact(t);
  assert.ok(!/\d{4}/.test(red) && !/td-secure/.test(red), red);
  const m = trustedMessage(analyze(t), { name: "Priya" });
  assert.match(m, /^Hi Priya, I got a message/);
  assert.ok(!/482913|9012|td-secure/.test(m));
  assert.match(m, /Can you call me before I do\?/);
});

test("the phone call questions read like a call and score like one", () => {
  const text = callToText({ who: "bank", pay: ["safe"], ask: ["code", "stayon"] });
  const r = analyze(text, { channel: "call" });
  assert.equal(r.level, "stop"); assert.equal(r.story.id, "bank"); assert.match(r.honest, /this call/);
  assert.equal(analyze(callToText({ who: "other", pay: [], ask: [] }) || "nothing", { channel: "call" }).level, "low");
});

test("honest wording at every level", () => {
  assert.match(analyze("Hey, dinner Friday?").honest, /doesn't prove/);
  assert.match(analyze("Urgent: confirm your details").headline, /^Pause/);
  assert.match(analyze("Buy gift cards and send the PIN immediately, don't tell anyone").honest, /No app can be certain/);
});

test("development set: catches the scams and leaves real messages alone", () => {
  const e = evaluate(CORPUS);
  assert.ok(e.scams >= 40 && e.reals >= 30);
  assert.ok(e.recall >= 0.95, `recall ${e.recall}`); assert.ok(e.specificity >= 0.95, `specificity ${e.specificity}`);
  assert.ok(e.storyRight / e.storyN >= 0.9);
});

test("held out set, never tuned on: floor, not a target", () => {
  const e = evaluate(HOLDOUT);
  assert.ok(e.recall >= 0.85, `recall ${e.recall}`); assert.ok(e.precision >= 0.9, `precision ${e.precision}`);
  // Recorded as the app reports it: 13 of 14 scams, 10 of 10 real, 8 of 9 stories.
  assert.deepEqual([e.tp, e.scams, e.tn, e.reals, e.storyRight, e.storyN], [13, 14, 10, 10, 8, 9]);
});

test("the page is locked: no network, no outside scripts, no inline styles", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /default-src 'self'; script-src 'self'; style-src 'self';[^"]*connect-src 'none'; form-action 'none'/);
  assert.ok(!/style="/.test(html));
  for (const f of ["app.js", "engine.js", "links.js", "signals.js", "sources.js", "evaluate.js"]) {
    const s = readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML/.test(s), f);
  }
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.ok(!/localStorage\.setItem\([^)]*msg/.test(app), "pasted messages are never stored");
});

test("public text uses no dashes as punctuation", () => {
  for (const f of ["index.html", "README.md", "DEVPOST.md"]) {
    let t; try { t = readFileSync(new URL(`../${f}`, import.meta.url), "utf8"); } catch { continue; }
    t = t.replace(/<[^>]+>/g, " ").replace(/\[[^\]]*\]\([^)]*\)/g, " ").replace(/`[^`]*`/g, " ").replace(/https?:\S+/g, " ");
    assert.ok(!/ [–—-] |—|–/.test(t), f);
  }
});
