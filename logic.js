/*
 * 1,000 Strangers — pure logic, shared by the page (app.js) and the
 * node test suite (tests/test.cjs). No DOM access in this file.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ExperimentLogic = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  // GoatCounter formats counts with thousands separators ("1,234" or "1 234").
  // Returns null when there's no digit to be found.
  function parseCount(raw) {
    if (raw === null || raw === undefined) return null;
    var digits = String(raw).replace(/\D/g, "");
    return digits ? parseInt(digits, 10) : null;
  }

  // rehearsal (no valid start) -> pre (before start) -> live -> ended
  function phaseFor(nowMs, startIso, windowHours) {
    if (!startIso) return "rehearsal";
    var start = Date.parse(startIso);
    if (isNaN(start)) return "rehearsal";
    var end = start + windowHours * 3600 * 1000;
    if (nowMs < start) return "pre";
    if (nowMs < end) return "live";
    return "ended";
  }

  // UTC minute stamp, e.g. "202607171605". Used as a cache key so every
  // visitor in the same minute shares one cached GoatCounter response.
  function minuteBucket(date) {
    function p(n) { return String(n).length < 2 ? "0" + n : String(n); }
    return "" + date.getUTCFullYear() + p(date.getUTCMonth() + 1) +
      p(date.getUTCDate()) + p(date.getUTCHours()) + p(date.getUTCMinutes());
  }

  function counterUrl(code, path, bucket) {
    return "https://" + code + ".goatcounter.com/counter/" +
      encodeURIComponent(path) + ".json?t=" + bucket;
  }

  // Deterministic PRNG so every visitor sees the identical reveal order.
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) | 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Fisher–Yates with a seeded PRNG: order[i] = which cell lights up i-th.
  function revealOrder(seedStr, n) {
    var rnd = mulberry32(hashSeed(seedStr));
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = i;
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var tmp = a[j]; a[j] = a[k]; a[k] = tmp;
    }
    return a;
  }

  // The hidden picture: a heart from the classic implicit curve
  // (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0, sampled on a cols x rows grid of
  // square cells. Returns a flat boolean array (row-major).
  function heartMask(cols, rows) {
    var mask = new Array(cols * rows);
    var scale = rows * 0.4;   // grid units per heart unit
    var yShift = 0.16;        // nudge so lobes and tip both fit, centered
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = (c - (cols - 1) / 2) / scale;
        var y = ((rows - 1) / 2 - r) / scale + yShift;
        var v = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
        mask[r * cols + c] = v <= 0;
      }
    }
    return mask;
  }

  // Client-side belt-and-suspenders on top of GoatCounter's own server-side
  // bot filtering. Most bots and link-preview fetchers never execute JS at
  // all; this catches automation that does.
  var BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|preview|scan|monitor|validator|fetch|curl|wget|python|httpx|axios|node-fetch|facebookexternalhit|whatsapp|telegram|discordapp|discordbot|skypeuripreview|twitterbot|linkedinbot|pinterest|embedly|quora link|vkshare|snapchat|viber/i;

  function isLikelyBot(env) {
    if (!env) return false;
    if (env.webdriver === true) return true;
    return BOT_UA.test(String(env.ua || ""));
  }

  return {
    parseCount: parseCount,
    phaseFor: phaseFor,
    minuteBucket: minuteBucket,
    counterUrl: counterUrl,
    mulberry32: mulberry32,
    hashSeed: hashSeed,
    revealOrder: revealOrder,
    heartMask: heartMask,
    isLikelyBot: isLikelyBot
  };
});
