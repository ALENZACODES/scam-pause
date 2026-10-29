// Scores the rules on a labelled set: a scam counts as caught at "pause" or "stop".
import { analyze } from "./engine.js";
export function evaluate(set) {
  let tp = 0, fn = 0, tn = 0, fp = 0, storyRight = 0, storyN = 0; const misses = [];
  for (const c of set) {
    const r = analyze(c.text, { channel: c.channel }); const flagged = r.level !== "low";
    if (c.kind === "scam") { if (flagged) tp++; else { fn++; misses.push(c.text); } if (c.story) { storyN++; if (r.story?.id === c.story) storyRight++; } }
    else { if (flagged) { fp++; misses.push(c.text); } else tn++; }
  }
  return { n: set.length, scams: tp + fn, reals: tn + fp, tp, fn, tn, fp, storyRight, storyN, misses,
    recall: tp / (tp + fn), precision: tp / (tp + fp || 1), specificity: tn / (tn + fp) };
}
