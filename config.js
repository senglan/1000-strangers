/*
 * 1,000 Strangers — experiment configuration.
 * This is the ONLY file you need to edit. See README.md for the full walkthrough.
 */
window.EXPERIMENT_CONFIG = {
  // Your GoatCounter site code. If your dashboard lives at
  // https://strangers1000.goatcounter.com, this is "strangers1000".
  // Leave "" until you've created the (free) account.
  goatcounterCode: "",

  // The moment the 24-hour clock starts, in UTC (ISO 8601).
  // Leave null for rehearsal mode: the page renders fully with a simulated
  // counter and NOTHING is tracked. Example: "2026-07-17T22:00:00Z"
  startTimeUTC: null,

  // Length of the experiment window, in hours.
  windowHours: 24,

  // The target. The mosaic has exactly 1,000 cells either way; a different
  // goal just changes how many visitors each cell represents.
  goal: 1000,

  // The public URL of this page once deployed, WITHOUT query string.
  // Example: "https://YOURUSERNAME.github.io/1000-strangers/"
  // Used to build the share link. Falls back to the current address if "".
  canonicalUrl: "",

  // Optional transparency links shown in the footer ("" hides them).
  repoUrl: "",        // e.g. "https://github.com/YOURUSERNAME/1000-strangers"
  publicStatsUrl: ""  // e.g. "https://strangers1000.goatcounter.com" if you make your dashboard public
};
