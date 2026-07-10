/* Node test suite for the pure logic. Run: node tests/test.cjs */
"use strict";
const path = require("path");
const L = require(path.join(__dirname, "..", "logic.js"));

let fails = 0;
function eq(name, got, want) {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? "PASS" : "FAIL") + "  " + name + (pass ? "" : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`));
}
function ok(name, cond) { eq(name, !!cond, true); }

/* ---- parseCount ---- */
eq("parseCount comma", L.parseCount("1,234"), 1234);
eq("parseCount space separator", L.parseCount("1 234"), 1234);
eq("parseCount plain", L.parseCount("12"), 12);
eq("parseCount zero", L.parseCount("0"), 0);
eq("parseCount empty -> null", L.parseCount(""), null);
eq("parseCount null -> null", L.parseCount(null), null);

/* ---- phaseFor ---- */
const startIso = "2026-07-17T22:00:00Z";
const start = Date.parse(startIso);
const DAY = 24 * 3600 * 1000;
eq("phase: no start -> rehearsal", L.phaseFor(start, null, 24), "rehearsal");
eq("phase: bad date -> rehearsal", L.phaseFor(start, "garbage", 24), "rehearsal");
eq("phase: 1ms before start -> pre", L.phaseFor(start - 1, startIso, 24), "pre");
eq("phase: at start -> live", L.phaseFor(start, startIso, 24), "live");
eq("phase: 1ms before end -> live", L.phaseFor(start + DAY - 1, startIso, 24), "live");
eq("phase: at end -> ended", L.phaseFor(start + DAY, startIso, 24), "ended");

/* ---- minuteBucket / counterUrl ---- */
eq("minuteBucket format", L.minuteBucket(new Date(Date.UTC(2026, 6, 17, 22, 5, 33))), "202607172205");
eq("minuteBucket pads", L.minuteBucket(new Date(Date.UTC(2026, 0, 2, 3, 4, 0))), "202601020304");
eq("counterUrl", L.counterUrl("demo", "/live", "202607172205"),
  "https://demo.goatcounter.com/counter/%2Flive.json?t=202607172205");

/* ---- revealOrder ---- */
const a = L.revealOrder("a-thousand-strangers", 1000);
const b = L.revealOrder("a-thousand-strangers", 1000);
ok("revealOrder deterministic", JSON.stringify(a) === JSON.stringify(b));
ok("revealOrder is a permutation of 0..999",
  new Set(a).size === 1000 && Math.min(...a) === 0 && Math.max(...a) === 999);
ok("revealOrder different seed differs",
  JSON.stringify(L.revealOrder("other-seed", 1000)) !== JSON.stringify(a));

/* ---- heartMask ---- */
const COLS = 40, ROWS = 25;
const mask = L.heartMask(COLS, ROWS);
const heartCells = mask.filter(Boolean).length;
ok(`heartMask cell count sane (${heartCells} of 1000)`, heartCells > 150 && heartCells < 600);
// symmetry check: mirrored columns should match closely
let asym = 0;
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++)
    if (mask[r * COLS + c] !== mask[r * COLS + (COLS - 1 - c)]) asym++;
eq("heartMask symmetric", asym, 0);

console.log("\nThe hidden picture (visual check):");
let art = "";
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) art += mask[r * COLS + c] ? "█" : "·";
  art += "\n";
}
console.log(art);

/* ---- isLikelyBot ---- */
ok("bot: whatsapp preview", L.isLikelyBot({ ua: "WhatsApp/2.23.20", webdriver: false }));
ok("bot: googlebot", L.isLikelyBot({ ua: "Mozilla/5.0 (compatible; Googlebot/2.1)", webdriver: false }));
ok("bot: headless chrome", L.isLikelyBot({ ua: "Mozilla/5.0 HeadlessChrome/120.0", webdriver: false }));
ok("bot: webdriver flag", L.isLikelyBot({ ua: "Mozilla/5.0 (iPhone) Safari/605.1", webdriver: true }));
ok("human: iphone safari", !L.isLikelyBot({
  ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  webdriver: false
}));
ok("human: android chrome", !L.isLikelyBot({
  ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  webdriver: false
}));

console.log(fails === 0 ? "\nAll tests passed." : `\n${fails} test(s) FAILED.`);
process.exit(fails ? 1 : 0);
