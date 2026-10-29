// Checks the web addresses in a message: lookalike names, punycode, hidden scripts,
// unusual endings and link shorteners. Nothing is opened or fetched.
export const OFFICIAL = {
  "canada.ca": "the Government of Canada", "gc.ca": "the Government of Canada", "antifraudcentre.ca": "the Canadian Anti-Fraud Centre", "antifraudcentre-centreantifraude.ca": "the Canadian Anti-Fraud Centre",
  "rcmp.ca": "the RCMP", "getcybersafe.ca": "Get Cyber Safe", "ontario.ca": "the Government of Ontario", "toronto.ca": "the City of Toronto",
  "canadapost.ca": "Canada Post", "canadapost-postescanada.ca": "Canada Post", "interac.ca": "Interac", "rbc.com": "RBC", "rbcroyalbank.com": "RBC", "td.com": "TD",
  "tdcanadatrust.com": "TD", "scotiabank.com": "Scotiabank", "bmo.com": "BMO", "cibc.com": "CIBC", "desjardins.com": "Desjardins", "tangerine.ca": "Tangerine",
  "amazon.ca": "Amazon", "amazon.com": "Amazon", "netflix.com": "Netflix", "purolator.com": "Purolator", "ups.com": "UPS", "fedex.com": "FedEx", "dhl.com": "DHL",
};
// Names scammers borrow, matched inside other addresses.
const BRANDS = [["canadapost", "Canada Post"], ["postescanada", "Canada Post"], ["interac", "Interac"], ["etransfer", "Interac"], ["scotiabank", "Scotiabank"], ["desjardins", "Desjardins"], ["tangerine", "Tangerine"], ["rbcroyal", "RBC"], ["royalbank", "RBC"], ["tdcanada", "TD"], ["cibc", "CIBC"], ["bmo", "BMO"], ["amazon", "Amazon"], ["netflix", "Netflix"], ["purolator", "Purolator"], ["fedex", "FedEx"], ["revenue", "the CRA"], ["cra-", "the CRA"], ["-cra", "the CRA"], ["crarefund", "the CRA"], ["servicecanada", "Service Canada"], ["canada-ca", "the Government of Canada"], ["gc-ca", "the Government of Canada"]];
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rebrand.ly", "ow.ly", "shorturl.at", "tiny.cc", "rb.gy", "t.ly", "s.id"]);
const ODD_TLDS = new Set(["info", "xyz", "top", "icu", "cfd", "click", "link", "live", "online", "site", "shop", "su", "ru", "sbs", "buzz", "rest", "monster", "cyou", "vip", "work", "support", "bond", "lat", "mom", "pw"]);
const SECOND_LEVEL = new Set(["gc.ca", "on.ca", "qc.ca", "bc.ca", "ab.ca", "co.uk", "com.au"]);

const URL_RX = /\b((?:https?:\/\/)?(?:[a-z0-9\u00a1-\uffff](?:[a-z0-9\u00a1-\uffff-]{0,61}[a-z0-9\u00a1-\uffff])?\.)+(?:[a-z\u00a1-\uffff]{2,24}|xn--[a-z0-9-]+)|https?:\/\/\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(\/[^\s<>"')]*)?/gi;
const TLD_OK = /^(com|ca|net|org|info|xyz|top|icu|cfd|click|link|live|online|site|shop|su|ru|cn|co|io|me|ly|gy|at|cc|id|uk|au|us|biz|app|dev|sbs|buzz|rest|monster|cyou|vip|work|support|bond|lat|mom|pw|gd|xn--[a-z0-9-]+|[\u00a1-\uffff]+)$/i;

export function registrable(host) {
  const parts = host.split(".");
  const last2 = parts.slice(-2).join(".");
  return SECOND_LEVEL.has(last2) && parts.length > 2 ? parts.slice(-3).join(".") : last2;
}
export function officialOwner(host) {
  for (const [dom, who] of Object.entries(OFFICIAL)) if (host === dom || host.endsWith("." + dom)) return who;
  return null;
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const DIGIT_SWAP = { 0: "o", 1: "l", 3: "e", 5: "s", 4: "a", 7: "t" };

export function findLinks(text) {
  const out = [];
  for (const m of text.matchAll(URL_RX)) {
    let raw = m[0].replace(/[.,;:!?]+$/, "");
    let host = raw.replace(/^https?:\/\//i, "").split(/[/:?#]/)[0].toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const tld = host.split(".").pop();
    if (!/^\d+$/.test(tld) && !TLD_OK.test(tld)) continue; // "e.g" or "Mr.Smith" are not links
    if (/^\d+(\.\d+)?$/.test(host)) continue; // "$49.99"
    out.push({ raw, host, index: m.index, end: m.index + raw.length });
  }
  return out;
}

export function checkLink({ raw, host }) {
  const flags = [];
  const add = (id, weight, label, why) => flags.push({ id, weight, label, why });
  const owner = officialOwner(host);
  const reg = registrable(host);
  const ascii = /^[\x00-\x7f]*$/.test(host);
  if (/(^|\.)xn--/.test(host)) add("punycode", 4, "Disguised characters (punycode)", `The address starts with "xn--", which means it uses letters from another alphabet that can look identical to normal ones.`);
  if (!ascii) add("script", 4, "Letters from another alphabet", "Some letters in this address are not normal Latin letters, a trick used to copy real names.");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) add("ip", 3, "A bare number instead of a name", "Real organisations use a name, not a raw number, for their websites.");
  if (raw.includes("@") && /https?:\/\/[^/]*@/.test(raw)) add("at", 3, "Hidden real address", "Everything before the @ is ignored. The link really goes somewhere else.");
  if (SHORTENERS.has(host)) add("short", 2, "Shortened link", "A short link hides where it really goes.");
  const tld = host.split(".").pop();
  if (ODD_TLDS.has(tld)) add("tld", 2, `Unusual ending (.${tld})`, "Government and bank websites in Canada don't use endings like this.");
  if (!owner) {
    const flat = host.replace(/\./g, "-").replace(/[013457]/g, (c) => DIGIT_SWAP[c]);
    const brand = BRANDS.find(([b]) => flat.includes(b));
    if (brand) add("lookalike", 4, `Borrows the name of ${brand[1]}`, `This is not an address that belongs to ${brand[1]}. Real ones end in ${Object.entries(OFFICIAL).filter(([, w]) => w === brand[1]).map(([d]) => d).join(" or ") || "their own name"}.`);
    else {
      const label = reg.split(".")[0].replace(/[013457]/g, (c) => DIGIT_SWAP[c]);
      const near = Object.entries(OFFICIAL).find(([d]) => { const l = d.split(".")[0]; return l.length >= 5 && lev(label, l) <= (l.length > 8 ? 2 : 1); });
      if (near) add("lookalike", 4, `Looks like ${near[0]}, but isn't`, `"${reg}" is one or two letters away from ${near[0]}, the real address of ${near[1]}.`);
    }
  }
  return { raw, host, registrable: reg, owner, flags };
}
