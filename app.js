/*
 * 1,000 Strangers — page behavior.
 * Pure, testable pieces live in logic.js; everything DOM-flavored is here.
 */
(function () {
  "use strict";

  var CFG = window.EXPERIMENT_CONFIG || {};
  var L = window.ExperimentLogic;

  var GOAL = CFG.goal > 0 ? CFG.goal : 1000;
  var COLS = 40, ROWS = 25, CELLS = COLS * ROWS; // exactly 1,000 cells
  var SEED = "a-thousand-strangers";
  var POLL_CHECK_MS = 5000; // how often we *check* whether a new minute began

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var els = {
    body: document.body,
    banner: document.getElementById("banner"),
    count: document.getElementById("count"),
    countLabel: document.getElementById("count-label"),
    you: document.getElementById("you"),
    status: document.getElementById("status"),
    meter: document.getElementById("meter"),
    meterFill: document.getElementById("meter-fill"),
    meterNums: document.getElementById("meter-nums"),
    clock: document.getElementById("clock"),
    clockLabel: document.getElementById("clock-label"),
    mosaic: document.getElementById("mosaic"),
    mosaicCaption: document.getElementById("mosaic-caption"),
    share: document.getElementById("share"),
    shareDone: document.getElementById("share-done"),
    verdict: document.getElementById("verdict"),
    srcLink: document.getElementById("src-link"),
    srcItem: document.getElementById("src-item"),
    statsLink: document.getElementById("stats-link"),
    statsItem: document.getElementById("stats-item")
  };

  var state = {
    phase: null,
    countedPhase: null,   // which phase we've sent a pageview for
    gcReady: false,
    count: null,          // last verified count from GoatCounter
    shownCount: 0,        // what the big number currently displays
    visitorNum: null,
    lastBucket: null,
    outcome: null,        // "success" | "fail" once ended
    celebrated: false,
    simStart: Date.now(),
    isBot: L.isLikelyBot({
      ua: navigator.userAgent,
      webdriver: navigator.webdriver === true
    })
  };

  var order = L.revealOrder(SEED, CELLS);
  var mask = L.heartMask(COLS, ROWS);
  var heartRowMin = ROWS, heartRowMax = 0;
  for (var i = 0; i < CELLS; i++) {
    if (mask[i]) {
      var rr = Math.floor(i / COLS);
      if (rr < heartRowMin) heartRowMin = rr;
      if (rr > heartRowMax) heartRowMax = rr;
    }
  }

  /* ---------------- analytics (GoatCounter) ---------------- */

  function setupGoatCounter() {
    if (!CFG.goatcounterCode || state.isBot || state.phase === "rehearsal") return;
    window.goatcounter = { no_onload: true };
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter",
      "https://" + CFG.goatcounterCode + ".goatcounter.com/count");
    s.onload = function () {
      state.gcReady = true;
      maybeCountPageview();
    };
    document.head.appendChild(s);
  }

  // One pageview per phase: /preview before launch, /live during the
  // 24-hour window (this is the number on the page), /after once it ends.
  function maybeCountPageview() {
    if (!state.gcReady || state.isBot) return;
    if (!window.goatcounter || !window.goatcounter.count) return;
    if (state.phase === "rehearsal" || state.countedPhase === state.phase) return;
    var path = state.phase === "live" ? "/live"
      : state.phase === "pre" ? "/preview" : "/after";
    var vars = { path: path, title: "1,000 Strangers" };
    var ref = new URLSearchParams(location.search).get("ref");
    if (ref) vars.referrer = "campaign:" + ref.slice(0, 32);
    window.goatcounter.count(vars);
    state.countedPhase = state.phase;
  }

  function trackEvent(name) {
    if (state.isBot || state.phase === "rehearsal") return;
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: name, event: true });
    }
  }

  /* ---------------- the counter ---------------- */

  function simulatedCount() {
    // Rehearsal mode: a believable, monotonically climbing fake.
    return Math.min(986, 137 + Math.floor((Date.now() - state.simStart) / 4000));
  }

  function pollTick(force) {
    if (state.phase === "rehearsal") { onCount(simulatedCount()); return; }
    if (state.phase === "pre") { onCount(0); return; }
    if (!CFG.goatcounterCode) {
      setStatus("counter offline — no GoatCounter code configured");
      return;
    }
    if (document.hidden && !force) return;
    var bucket = L.minuteBucket(new Date());
    if (!force && bucket === state.lastBucket) return;
    state.lastBucket = bucket;
    fetch(L.counterUrl(CFG.goatcounterCode, "/live", bucket))
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        var n = L.parseCount(j.count);
        if (n !== null) { setStatus(""); onCount(n); }
      })
      .catch(function () {
        setStatus(state.count === null
          ? "waking the counter up…"
          : "counter reconnecting…");
      });
  }

  function onCount(n) {
    if (state.count !== null && n < state.count) n = state.count; // never go backwards
    var changed = n !== state.count;
    state.count = n;

    if (state.visitorNum === null && !state.isBot) {
      if (state.phase === "live") {
        state.visitorNum = readOrAssignVisitorNum(n, true);
      } else if (state.phase === "ended") {
        // returning visitor after the window: show their number, never mint one
        state.visitorNum = readOrAssignVisitorNum(n, false);
      }
    }

    if (changed || state.shownCount !== n) renderCount();
    renderMeter();
    drawMosaic();
    checkOutcome();
  }

  function readOrAssignVisitorNum(count, mayCreate) {
    var key = "strangers:visitor:" + String(CFG.startTimeUTC || "rehearsal");
    try {
      var saved = localStorage.getItem(key);
      if (saved) return parseInt(saved, 10);
      if (!mayCreate) return null;
      var num = Math.max(1, count + 1);
      localStorage.setItem(key, String(num));
      return num;
    } catch (e) {
      return mayCreate ? Math.max(1, count + 1) : null; // private mode: not sticky
    }
  }

  /* ---------------- rendering ---------------- */

  function fmtNum(n) { return n.toLocaleString("en-US"); }

  function setStatus(msg) { els.status.textContent = msg; }

  var countAnim = null;
  function renderCount() {
    var target = state.count || 0;
    if (reduceMotion || Math.abs(target - state.shownCount) < 2) {
      state.shownCount = target;
      els.count.textContent = fmtNum(target);
    } else {
      var from = state.shownCount, start = performance.now();
      if (countAnim) cancelAnimationFrame(countAnim);
      var step = function (t) {
        var k = Math.min(1, (t - start) / 900);
        k = 1 - Math.pow(1 - k, 3); // ease-out cubic
        state.shownCount = Math.round(from + (target - from) * k);
        els.count.textContent = fmtNum(state.shownCount);
        if (k < 1) countAnim = requestAnimationFrame(step);
      };
      countAnim = requestAnimationFrame(step);
    }
    if (state.visitorNum !== null && (state.phase === "live" || state.phase === "ended")) {
      els.you.innerHTML = (state.phase === "ended" ? "you were visitor " : "you're visitor ") +
        "<strong>#" + fmtNum(state.visitorNum) + "</strong>";
      els.you.hidden = false;
    }
    els.countLabel.textContent =
      state.count !== null && state.count >= GOAL && state.phase === "live"
        ? "verified visitors — goal reached, clock still running"
        : "verified visitors";
  }

  function renderMeter() {
    var n = state.count || 0;
    var pct = Math.min(100, (n / GOAL) * 100);
    els.meterFill.style.width = pct + "%";
    els.meter.setAttribute("aria-valuenow", String(Math.min(n, GOAL)));
    els.meterNums.textContent = fmtNum(n) + " / " + fmtNum(GOAL);
  }

  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var days = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    function p(n) { return n < 10 ? "0" + n : String(n); }
    return (days > 0 ? days + "d " : "") + p(h) + ":" + p(m) + ":" + p(sec);
  }

  function renderClock(now) {
    var start = CFG.startTimeUTC ? Date.parse(CFG.startTimeUTC) : NaN;
    var end = start + CFG.windowHours * 3600 * 1000;
    if (state.phase === "rehearsal") {
      els.clock.textContent = fmtClock(CFG.windowHours * 3600 * 1000);
      els.clockLabel.textContent = "on the clock (rehearsal)";
    } else if (state.phase === "pre") {
      els.clock.textContent = fmtClock(start - now);
      els.clockLabel.textContent = "until the clock starts";
    } else if (state.phase === "live") {
      els.clock.textContent = fmtClock(end - now);
      els.clockLabel.textContent = "left on the clock";
    } else {
      els.clock.textContent = "00:00:00";
      els.clockLabel.textContent = "time's up";
    }
  }

  /* ---------------- mosaic ---------------- */

  function mix(c1, c2, t) {
    var r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    var g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    var b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    return [r, g, b];
  }

  var ROSE = [255, 77, 109], AMBER = [255, 178, 36], SLATE = [40, 44, 56];

  function cellColor(idx) {
    var r = Math.floor(idx / COLS);
    var jitter = (L.hashSeed("cell" + idx) % 100) / 100 - 0.5; // -0.5..0.5
    var c;
    if (mask[idx]) {
      var t = (r - heartRowMin) / Math.max(1, heartRowMax - heartRowMin);
      c = mix(ROSE, AMBER, t);
      c = mix(c, [255, 255, 255], Math.max(0, jitter * 0.16));
    } else {
      c = mix(SLATE, [70, 76, 94], (jitter + 0.5) * 0.5);
    }
    return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  }

  function revealedCells() {
    if (state.outcome === "success") return CELLS;
    var n = state.count || 0;
    return Math.min(CELLS, Math.round((Math.min(n, GOAL) / GOAL) * CELLS));
  }

  function drawMosaic() {
    var canvas = els.mosaic;
    var cssW = canvas.clientWidth;
    if (!cssW) return;
    var dpr = window.devicePixelRatio || 1;
    var cell = cssW / COLS;
    var cssH = cell * ROWS;
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var revealed = revealedCells();
    var pad = Math.max(0.5, cell * 0.09);
    for (var i = 0; i < CELLS; i++) {
      var idx = order[i];
      var r = Math.floor(idx / COLS), c = idx % COLS;
      ctx.fillStyle = i < revealed ? cellColor(idx) : "rgba(255,255,255,0.045)";
      ctx.fillRect(c * cell + pad, r * cell + pad, cell - 2 * pad, cell - 2 * pad);
    }

    // your pixel, outlined
    if (state.visitorNum !== null && state.visitorNum <= CELLS) {
      var mine = order[state.visitorNum - 1];
      var mr = Math.floor(mine / COLS), mc = mine % COLS;
      ctx.strokeStyle = "#ffb224";
      ctx.lineWidth = Math.max(1.5, cell * 0.12);
      ctx.strokeRect(mc * cell + pad / 2, mr * cell + pad / 2,
        cell - pad, cell - pad);
    }

    canvas.setAttribute("aria-label",
      "Mosaic: " + revealed + " of " + CELLS + " pixels revealed.");
    els.mosaicCaption.textContent =
      state.visitorNum !== null && state.visitorNum <= CELLS
        ? "Every visitor lights one pixel — the outlined one is yours. At " +
          fmtNum(GOAL) + " the picture completes."
        : "Every visitor lights one pixel. At " + fmtNum(GOAL) +
          " the picture completes.";
  }

  /* ---------------- outcome ---------------- */

  function checkOutcome() {
    if (state.phase === "live" && state.count >= GOAL) celebrate();
    if (state.phase !== "ended" || state.count === null) return;
    var success = state.count >= GOAL;
    var outcome = success ? "success" : "fail";
    if (state.outcome === outcome) return;
    state.outcome = outcome;
    els.body.setAttribute("data-outcome", outcome);
    els.verdict.hidden = false;
    if (success) {
      els.verdict.innerHTML =
        "<h2>Goal reached.</h2>" +
        "<p><strong>" + fmtNum(state.count) + "</strong> visitors in " +
        CFG.windowHours + " hours.</p>";
      celebrate();
    } else {
      els.verdict.innerHTML =
        "<h2>Time's up.</h2>" +
        "<p><strong>" + fmtNum(state.count) + "</strong> of " + fmtNum(GOAL) + ".</p>";
    }
    drawMosaic();
  }

  function celebrate() {
    if (state.celebrated || reduceMotion) { state.celebrated = true; return; }
    state.celebrated = true;
    var cv = document.createElement("canvas");
    cv.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99";
    document.body.appendChild(cv);
    var dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    var colors = ["#ffb224", "#ff4d6d", "#f4f5f7", "#4ade80"];
    var parts = [];
    for (var i = 0; i < 140; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.4,
        y: -20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 2 + Math.random() * 3,
        s: 4 + Math.random() * 5,
        c: colors[i % colors.length],
        rot: Math.random() * Math.PI
      });
    }
    var t0 = performance.now();
    (function frame(t) {
      var elapsed = t - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j];
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.rot += 0.08;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (elapsed < 2600) requestAnimationFrame(frame);
      else cv.remove();
    })(t0);
  }

  /* ---------------- share ---------------- */

  function shareUrl() {
    var base = (CFG.canonicalUrl || location.origin + location.pathname)
      .replace(/[?#].*$/, "");
    return base + "?ref=fwd";
  }

  function shareText() {
    var head = state.visitorNum !== null
      ? "I'm visitor #" + fmtNum(state.visitorNum) + " of " + fmtNum(GOAL) + "."
      : "";
    return (head ? head + " " : "") +
      "This page has one day to get " + fmtNum(GOAL) +
      " strangers to visit — no ads, nothing for sale. " +
      "It only moves if someone sends it. Consider yourself someone:";
  }

  function doShare() {
    var url = shareUrl(), text = shareText();
    if (navigator.share) {
      navigator.share({ title: "1,000 Strangers", text: text, url: url })
        .then(function () { trackEvent("share-native"); })
        .catch(function () { /* user backed out; that's fine */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text + " " + url).then(function () {
        els.shareDone.hidden = false;
        els.shareDone.textContent = "copied — now paste it somewhere human";
        trackEvent("share-copy");
      });
    } else {
      prompt("Copy this:", text + " " + url); // museum-grade browser fallback
    }
  }

  /* ---------------- phases & boot ---------------- */

  function applyPhase(phase) {
    if (phase === state.phase) return;
    state.phase = phase;
    els.body.setAttribute("data-phase", phase);
    if (phase === "rehearsal") {
      els.banner.textContent =
        "Rehearsal mode — the clock hasn't started and the counter is simulated. Nothing is tracked.";
    } else if (phase === "pre") {
      els.banner.textContent = "The clock hasn't started yet. Come back at the bell.";
    }
    maybeCountPageview();
    pollTick(true);
  }

  function tick() {
    var now = Date.now();
    applyPhase(L.phaseFor(now, CFG.startTimeUTC, CFG.windowHours));
    renderClock(now);
  }

  function boot() {
    // footer links
    if (CFG.repoUrl) { els.srcLink.href = CFG.repoUrl; } else { els.srcItem.parentNode.removeChild(els.srcItem); }
    if (CFG.publicStatsUrl) { els.statsLink.href = CFG.publicStatsUrl; } else { els.statsItem.parentNode.removeChild(els.statsItem); }
    els.meter.setAttribute("aria-valuemax", String(GOAL));

    applyPhase(L.phaseFor(Date.now(), CFG.startTimeUTC, CFG.windowHours));
    setupGoatCounter();
    tick();
    pollTick(true);
    setInterval(tick, 250);
    setInterval(function () { pollTick(false); }, POLL_CHECK_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) pollTick(false);
    });
    var resizeRaf = null;
    window.addEventListener("resize", function () {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(function () {
        resizeRaf = null;
        drawMosaic();
      });
    });
    els.share.addEventListener("click", doShare);
    drawMosaic();
  }

  boot();
})();
