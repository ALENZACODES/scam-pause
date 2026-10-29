# Devpost submission: Scam Pause (SafeSpace Hacks)

Paste each block into the matching field. Fill [LIVE_URL], [REPO_URL] and [YOUTUBE_URL].

**Project name**
Scam Pause

**Elevator pitch** (200 characters max)
Someone wants money, a code or your card, right now. Scam Pause explains each warning sign with its Canadian source, starts a 10 minute pause and writes a message to someone you trust.

**Built with**
javascript, html5, css3, node.js, playwright, github-pages

**Try it out links**
* [LIVE_URL]
* [REPO_URL]

**Video demo link**
[YOUTUBE_URL]

**Image gallery** (in this order; all are in docs/)
1. gallery-1-stop.png: "A fake bank fraud call: stopped, named, and every warning sign explained with its source"
2. gallery-4-pause.png: "The ten minute pause, with a checklist for calling back safely"
3. gallery-5-trusted.png: "A message to someone you trust, with links, codes and card numbers taken out"
4. gallery-2-call.png: "On a phone call: three quick questions instead of pasting text"
5. gallery-3-link.png: "A fake delivery text: the lookalike link is caught without opening it"
6. gallery-6-real.png: "A real bank alert gets no warnings, and honest wording about what that means"
7. gallery-7-phone.png: "On a phone: the grandparent scam, and how to check safely"
8. gallery-8-about.png: "Tested on 96 made up messages, with its limits stated plainly"

---

## About the project (story field)

## Inspiration
Canadians reported $704 million lost to fraud in 2025, and the Canadian Anti-Fraud Centre says only 5% to 10% of frauds are reported at all. Behind those numbers is the same moment, again and again: a caller who sounds like the bank, the CRA or a grandchild, a reason it has to happen now, and a reason not to tell anyone.

Most advice about scams is a list you read once and forget. I wanted something you use in that moment, that slows it down and brings a second person in.

## Who it is for, the risk, and what changes
* **Intended users**: older adults, newcomers to Canada and anyone getting a call or text that asks for money, and the family members or friends who look out for them.
* **The risk**: being talked into sending money, gift cards, crypto, a one time code or a bank card by someone pretending to be a bank, the CRA, the police, a delivery company or family.
* **The practical improvement**: a few seconds of plain explanation, a ten minute pause the Anti-Fraud Centre itself recommends, the right number to call instead, and a ready message to a trusted person. Scams depend on speed and secrecy; this removes both.

## What it does
* **Check a text or email**: paste it and Scam Pause shows each warning sign in plain words, with the exact words that triggered it and the Canadian source behind it: how they want to be paid, what they ask you to do, how they pressure you, and who they claim to be.
* **Check a phone call**: there's nothing to paste, so you answer three quick questions instead (who they said they were, how they want money, what else they asked).
* **Names the story**: the bank investigator scam, a fake CRA message, the grandparent scam, a fake delivery text, a task job, a crypto investment pitch, a money recovery scam, or a phishing link, and says what usually happens next and how to check safely.
* **Checks links without opening them**: lookalike names (canadap0st, netf1ix), punycode and letters from other alphabets, borrowed brand names, unusual endings, shorteners and bare number addresses.
* **Honest wording**: Stop, Pause or No common warning signs, and it always says what it cannot know. "No warning signs" never claims a message is safe.
* **A ten minute pause** with a checklist: hang up, don't use their number, call back on one you already had, use another phone if you can.
* **Ask someone you trust**: a message written for you, with links, codes and card numbers removed so it is safe to forward, plus one tap to text or call them.
* **Already sent money?** The steps in order: your bank, the card or exchange, your devices, then the police and the Canadian Anti-Fraud Centre, and a warning about recovery scams.
* **Numbers to use instead of theirs**, and a reminder that caller ID can be faked.

## How I built it
Plain JavaScript modules, HTML and CSS, with no framework, no server and no build step, hosted free on GitHub Pages.

* `signals.js`: 26 warning signs, each a small set of patterns with a weight, a plain explanation and a source from the Canadian Anti-Fraud Centre, the CRA or Canada Post. Signs that appear in good advice ("we will never ask for your code") are ignored when they are negated.
* `links.js`: finds web addresses and checks them against a list of official Canadian domains, with edit distance and digit swaps for lookalikes, punycode and script checks, and lists of shorteners and unusual endings. It never opens a link.
* `engine.js`: adds up the signs, matches known scam stories, picks the level and writes the honest wording, the trusted person message and the redaction.
* Privacy: a Content Security Policy with `connect-src 'none'` means the page cannot send anything. Nothing you paste is stored. The only thing saved, on your device, is the trusted person's name and number.
* Tests: 11 Node tests and a 16 step headless Chrome check, including a blocked attempt to send data out and a check that pasted text is never stored.

## Measuring it, honestly
All test messages are synthetic, written for this project. There are two sets:
* **Development set**, 72 messages written while building: 40 of 40 scams flagged, 32 of 32 real messages left alone, the right story 37 of 37 times.
* **Held out set**, 24 messages written after the rules were frozen and never used to tune them: 13 of 14 scams flagged, 10 of 10 real messages left alone, the right story 8 of 9 times. The miss was a fake furniture sale asking for an e-Transfer deposit, which uses none of the usual pressure words.

The app computes both tables live on its own page, so the numbers can't drift from the code.

## One safer outcome, and one limitation
* **Safer outcome (example)**: Pat, 74, gets a call from "Daniel at the TD fraud department" who says her card was used in Montreal and asks her to move her savings to a secure account and stay on the line. She describes the call with the three questions. Scam Pause says Stop, names the bank investigator scam, and starts a ten minute pause. She hangs up, waits, and calls the number on the back of her card. The bank tells her there was no fraud. Her savings stay where they are, and she sends the prepared message to her daughter.
* **Limitation**: it reads words, not voices or sender details. A scammer who avoids the usual words, with no payment method, no rush and no secrecy, can score low, like the furniture deposit in the held out set. It cannot verify who sent a message, and it is not an emergency service or a replacement for the bank or the police.

## Challenges I ran into
False alarms. Real banks send messages full of scam words: "we will never ask for your password or a code", "if this wasn't you, call the number on your card". A rule that only looks for words flags them all. I added negation handling, so advice is not counted as a request, and treated official addresses differently from unknown ones. And I kept a held out set so I couldn't fool myself by tuning to my own examples.

Writing for a stressed reader. Every sentence had to work for someone with a caller in their ear: short, concrete, and never claiming more certainty than it has.

## What I learned
The strongest signs are not technical. Being told to keep it secret, to stay on the line, or to move money to keep it safe are almost never legitimate, and they show up in nearly every story. Speed and isolation are the scam; a pause and a second person are the defence.

## What's next for Scam Pause
* French, Punjabi, Mandarin, Cantonese, Tagalog and the other languages Toronto speaks
* a family mode: a trusted person's number set up ahead of time on a parent's phone
* a share target, so a suspicious text can be sent straight to Scam Pause on a phone
* testing with seniors' groups and newcomer services, measured by how often people pause before paying

## Work done during the event, and credits
* **Built during SafeSpace Hacks**: all of the code, rules, tests, synthetic messages and docs were written from scratch on October 29, 2026, inside the October 17 to November 22 build window. It does not reuse code from any of my earlier projects.
* **Pre-existing work**: the navy and red page theme (`src/theme/`) is reused from my earlier projects.
* **Libraries**: none in the app. Playwright is used only for the browser check and the demo recording.
* **Sources for the warning signs**: the Canadian Anti-Fraud Centre (bank investigator, emergency, job and investment scams, and the 2025 figures), the Canada Revenue Agency's "Recognize a scam" page, and Canada Post's guide to fraudulent emails and texts. Each is linked in the app.
* **AI assistance**: I used an AI coding assistant to help write and test the code and the docs. I checked every rule against the official sources.
* **Data**: every message, name and number in the app and the tests is made up.

## Setup steps
1. Open [LIVE_URL], or clone [REPO_URL] and run `python3 -m http.server 8000` in the folder, then open http://localhost:8000.
2. Tap an example, or switch to "A phone call" and answer the questions. Add `?speed=40` to the address to speed up the pause for a demo.
3. Run the tests with `node --test` (Node 20 or newer).

---

## Submission form answers

**Team**: John Khan (solo), Toronto, Ontario

## Before submitting (checklist for John)
1. Make the repo public and turn on GitHub Pages from the main branch root. Keep it up until at least November 24 (judging runs November 23 to 24).
2. Open the live link and tap "Bank fraud call".
3. Upload docs/demo-captioned.mp4 to YouTube as Public or Unlisted (2:46; a video of about 2 to 3 minutes is optional).
4. Replace [LIVE_URL], [REPO_URL] and [YOUTUBE_URL] above.
5. Upload the eight gallery images in order.
