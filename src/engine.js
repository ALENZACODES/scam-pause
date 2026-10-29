// Reads a message or a description of a call and explains, sign by sign, why it does or
// doesn't look like a scam. Plain rules, no model, nothing sent anywhere.
import { SIGNALS } from "./signals.js";
import { findLinks, checkLink } from "./links.js";
import { SOURCES } from "./sources.js";

// Signs like "we will never ask for your code" are advice, not a request.
const NEG = /\b(do not|don'?t|never|not|no one|nobody|won'?t|will not|cannot|can'?t)\b[^.!?\n]{0,90}$/i;
const NEGATABLE = new Set(["code", "personal", "remote", "giftcards", "crypto", "cardpickup", "safeaccount", "cash", "fee", "askmoney", "etransfer"]);

export function scan(text) {
  const hits = [];
  for (const s of SIGNALS) {
    const matches = [];
    for (const rx of s.rx) for (const m of text.matchAll(rx)) {
      const before = text.slice(Math.max(0, m.index - 120), m.index);
      const clause = before.split(/[.!?\n]/).pop();
      if (NEGATABLE.has(s.id) && NEG.test(clause)) continue;
      if (s.unless && s.unless.test(clause)) continue;
      matches.push({ index: m.index, end: m.index + m[0].length, text: m[0] });
    }
    if (matches.length) hits.push({ ...s, matches: dedupe(matches) });
  }
  return hits;
}
const dedupe = (ms) => ms.sort((a, b) => a.index - b.index).filter((m, i, a) => !a.slice(0, i).some((p) => p.index <= m.index && p.end >= m.end));

// Known scam stories: who they say they are, plus what they ask for.
export const STORIES = [
  { id: "bank", name: "the bank investigator scam", when: (S) => (S.as_bank || S.as_police) && any(S, "safeaccount", "code", "remote", "cardpickup", "stayon", "secret") || any(S, "safeaccount", "cardpickup"),
    next: "Next they usually show you \"fraud\" on your account, then ask you to move money to a \"safe\" account, read back a code, install an app or hand over your card.",
    check: "Hang up. Call the number on the back of your card, from a different phone if you can, or wait ten minutes first. Scammers can keep the line open after you hang up.", source: "bank" },
  { id: "cra", name: "a fake CRA or government message", when: (S, L) => S.as_cra && (any(S, "giftcards", "crypto", "cash", "etransfer", "threat", "personal", "fee", "prize", "reply", "urgent") || L.some((l) => !l.owner)),
    next: "Next they usually demand payment by gift cards, crypto or e-Transfer, threaten arrest or deportation, or send a link to a fake sign in page.",
    check: "Don't use the link or the number they gave. Sign in to your CRA account by typing canada.ca/myaccount yourself, or call the CRA at 1-800-959-8281.", source: "cra" },
  { id: "emergency", name: "an emergency or grandparent scam", when: (S) => S.as_family && any(S, "askmoney", "giftcards", "cash", "crypto", "etransfer", "fee", "secret") && (S.as_family.matches.length > 1 || any(S, "urgent", "secret", "giftcards", "cash", "crypto")),
    next: "Next they usually ask for bail, a lawyer or a phone repair, in cash, gift cards or crypto, and beg you not to tell anyone. Sometimes a \"lawyer\" or \"officer\" takes over the call.",
    check: "Call your family member on the number you already have, not the new one. In Canada, nobody can be bailed out with cash or crypto.", source: "emergency" },
  { id: "delivery", name: "a fake delivery text", when: (S, L) => S.as_post && (any(S, "fee", "personal", "askmoney") || L.length > 0) && !L.every((l) => l.owner),
    next: "Next the link opens a copy of a delivery site that asks for a small fee and your card number.",
    check: "Track the parcel by typing the carrier's address yourself. Canada Post texts only come from 272727 or 55555, and never ask for payment.", source: "post" },
  { id: "job", name: "a task job scam", when: (S) => S.as_job && any(S, "fee", "crypto", "toogood", "remote", "askmoney"),
    next: "Next there are small tasks and a small first payment, then deposits to \"unlock\" more work. The balance on screen grows, but it can't be withdrawn.",
    check: "Never pay to get a job. Look up the company yourself and call its official number.", source: "job" },
  { id: "invest", name: "an investment or crypto scam", when: (S) => (S.as_invest && any(S, "crypto", "toogood", "fee", "askmoney")) || (S.toogood && any(S, "crypto", "fee")),
    next: "Next a trading site shows big gains, lets you withdraw a little, then asks for more and blocks the rest.",
    check: "Be suspicious of any unsolicited investment, even from a friend. Check the firm with the Ontario Securities Commission before you send anything.", source: "invest" },
  { id: "recovery", name: "a money recovery scam", when: (S) => S.as_recovery && any(S, "fee", "remote", "personal", "crypto", "askmoney"),
    next: "Next they ask for a fee or remote access, and no money ever comes back.",
    check: "Nobody legitimate charges you up front to recover lost money. Report the first scam to the police and the Canadian Anti-Fraud Centre instead.", source: "invest" },
  { id: "phishing", name: "a phishing link", when: (S, L) => L.some((l) => l.flags.some((f) => f.weight >= 3)) || (L.some((l) => !l.owner) && any(S, "threat", "personal", "prize") && any(S, "as_bank", "as_cra", "as_post", "urgent")),
    next: "Next the link opens a convincing copy of a real sign in page and keeps whatever you type.",
    check: "Don't tap it. Type the real address yourself, or open the organisation's own app.", source: "cra" },
];
const any = (S, ...ids) => ids.some((id) => S[id]);

export function analyze(text, opts = {}) {
  const hits = scan(text);
  const links = findLinks(text).map(checkLink);
  const S = Object.fromEntries(hits.map((h) => [h.id, h]));
  const unofficial = links.filter((l) => !l.owner);
  // Any link to an unknown address is a small sign; known official ones are not.
  if (unofficial.length) {
    S.link = { id: "link", group: "ask", weight: 1, label: "Has a link to tap", why: "Links in unexpected messages can lead to convincing fake sites. It is safer to type the official address yourself.", source: "cra", matches: findLinks(text).filter((l) => !links.find((x) => x.raw === l.raw)?.owner).map(({ index, end, raw }) => ({ index, end, text: raw })) };
    hits.push(S.link);
  }
  const linkFlags = links.flatMap((l) => l.flags.map((f) => ({ ...f, host: l.host })));
  const stories = STORIES.filter((st) => st.when(S, links)).map((st) => ({ ...st, support: hits.filter((h) => h.group !== "who").reduce((n, h) => n + h.weight, 0) }));
  const story = stories.sort((a, b) => b.support - a.support)[0] || null;
  // Score: each sign counts once; the strongest link problem counts once.
  const signScore = hits.reduce((n, h) => n + h.weight, 0);
  const linkScore = linkFlags.length ? Math.max(...linkFlags.map((f) => f.weight)) + (linkFlags.length > 1 ? 1 : 0) : 0;
  const score = signScore + linkScore + (story ? 2 : 0);
  const strongest = Math.max(0, ...hits.map((h) => h.weight), ...linkFlags.map((f) => f.weight));
  const level = score >= 8 || (story && score >= 6) || (strongest >= 5 && score >= 6) ? "stop" : score >= 3 ? "pause" : "low";
  return { text, hits: hits.sort((a, b) => b.weight - a.weight), links, linkFlags, story, stories, score, level, ...words(level, story, hits, opts) };
}

function words(level, story, hits, { channel = "message" } = {}) {
  const what = channel === "call" ? "this call" : "this message";
  if (level === "stop") return {
    headline: "Stop. This has strong signs of a scam.",
    honest: `${story ? `It matches ${story.name}. ` : ""}No app can be certain from words alone, but the things ${what} asks for are things real banks, the CRA and police don't ask for.`,
  };
  if (level === "pause") return {
    headline: "Pause. There are warning signs.",
    honest: `${story ? `It has parts of ${story.name}. ` : ""}It may be real, but check it yourself before you send money, a code or your details, using a number or address you already have.`,
  };
  return {
    headline: "No common warning signs found.",
    honest: `That doesn't prove ${what} is safe. Scam Pause looks for the usual signs, and a careful scammer can avoid them. If it asks for money or a code, check with the sender using a number you already have.`,
  };
}

const BRIEF = { giftcards: "asks for gift cards", crypto: "asks for crypto", cash: "wants cash or a wire transfer", safeaccount: "wants me to move money to a \"safe\" account", etransfer: "mentions an e-Transfer", askmoney: "asks for money", fee: "wants a fee first", code: "asks for a code I was sent", remote: "wants remote access to my device", cardpickup: "wants to pick up my card", personal: "asks for personal details", reply: "asks me to reply or call their number", urgent: "rushes me", threat: "threatens me", secret: "tells me to keep it secret", stayon: "wants me to stay on the phone", toogood: "promises easy money", prize: "says I won something", link: "has a link to tap" };
// What to share with someone you trust: no codes, card numbers or links.
export function redact(text) {
  return text
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]")
    .replace(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|ca|net|org|info|xyz|top|icu|cfd|click|link|live|online|site|shop|su|ru|co|io|me|ly)(\/\S*)?/gi, "[link removed]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email removed]")
    .replace(/\b\d(?:[ -]?\d){3,}\b/g, "[number removed]");
}

export function trustedMessage(result, { name = "", channel = "message" } = {}) {
  const signs = result.hits.filter((h) => h.group !== "who" && BRIEF[h.id]).slice(0, 4).map((h) => BRIEF[h.id]);
  const lf = result.linkFlags[0];
  if (lf) signs.push(`has a link with a warning sign (${lf.label.toLowerCase()})`);
  const quote = redact(result.text).trim().replace(/\s+/g, " ");
  const short = quote.length > 260 ? quote.slice(0, 257).replace(/\s\S*$/, "") + "..." : quote;
  return `Hi${name ? " " + name : ""}, I got a ${channel === "call" ? "phone call" : "message"} that ${result.story ? `looks like ${result.story.name}` : "I'm not sure about"}.${signs.length ? ` It ${signs.length > 1 ? signs.slice(0, -1).join(", ") + " and " + signs.slice(-1) : signs[0]}.` : ""} I haven't sent anything. Can you call me before I do?\n\nWhat it said: "${short}"`;
}

export function sourceFor(id) { return SOURCES[id]; }

// The quick questions for a phone call, turned into sentences the same rules can read.
export const CALL_QUESTIONS = [
  { id: "who", q: "Who did they say they were?", options: [["", "Choose"], ["bank", "My bank or credit card"], ["cra", "The CRA or the government"], ["police", "The police or RCMP"], ["family", "A family member, or calling for one"], ["post", "A delivery company"], ["job", "An employer or recruiter"], ["invest", "An investment or trading company"], ["recovery", "Someone who can recover money I lost"], ["other", "Someone else"]],
    text: { bank: "They said they are from your bank's fraud department.", cra: "They said they are from the CRA, Canada Revenue Agency.", police: "They said they are a police officer.", family: "It's me, your grandson. I was in a car accident.", post: "They said they are from Canada Post about a parcel on hold.", job: "They offered a work from home job with commission.", invest: "They talked about an investment opportunity on a trading platform.", recovery: "They said they can recover your lost funds.", other: "" } },
  { id: "pay", q: "How did they want money?", multi: true, options: [["giftcards", "Gift cards"], ["crypto", "Crypto or a bitcoin ATM"], ["cash", "Cash picked up, mailed or wired"], ["safe", "Move my money to a safe account"], ["etransfer", "An e-Transfer"], ["fee", "A fee before I get something"]],
    text: { giftcards: "They asked you to buy gift cards and read the numbers and PIN.", crypto: "They asked you to deposit cash at a bitcoin ATM.", cash: "A courier will come to pick up the cash.", safe: "They asked you to move your savings to a safe account.", etransfer: "They asked you to send an e-Transfer.", fee: "You need to pay a fee to release the money." } },
  { id: "ask", q: "What else did they ask?", multi: true, options: [["code", "Read back a code I was sent"], ["remote", "Install an app or let them see my screen"], ["card", "Hand over or cut up my card"], ["personal", "My SIN, card number or passwords"], ["secret", "Keep it secret, even from my bank or family"], ["stayon", "Stay on the line"], ["threat", "They threatened arrest or a frozen account"], ["urgent", "Do it right now"]],
    text: { code: "They asked you to read back the code we just sent.", remote: "They asked you to install AnyDesk.", card: "They want to pick up your bank card.", personal: "They asked for your SIN and card number.", secret: "They said don't tell anyone, not even your bank.", stayon: "They said stay on the line.", threat: "They said there is a warrant for your arrest.", urgent: "They said you must act immediately." } },
];
export function callToText(answers) {
  const out = [];
  for (const q of CALL_QUESTIONS) {
    const v = answers[q.id];
    for (const k of [].concat(v || [])) if (q.text[k]) out.push(q.text[k]);
  }
  return out.join(" ");
}
