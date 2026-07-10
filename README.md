# 1,000 Strangers

**Can a webpage find 1,000 strangers in 24 hours — with no ads, no Reddit, no
Hacker News, nothing for sale?**

That's the whole experiment. This repo is a single static page with a live,
bot-filtered visitor counter, a 24-hour countdown, and a hidden 1,000-pixel
picture that only completes if 1,000 verified humans show up in time. Every
visitor lights one pixel. The page's only ask: *send this to one person.*

It runs entirely on free services: **GitHub Pages** hosts it,
**[GoatCounter](https://www.goatcounter.com)** counts it. No backend, no build
step, no cookies.

---

## How it works

```
visitor ──► GitHub Pages (static index.html)
               │
               ├─► count.js ──► yourcode.goatcounter.com   (records the visit, filters bots)
               │
               └─► /counter/%2Flive.json?t=<UTC-minute>    (reads the current count)
```

- **The count is real and shared.** The page polls GoatCounter's public
  counter endpoint. The `?t=<current-minute>` cache key means all visitors in
  the same minute share one cached response — the counter updates about once a
  minute while producing at most ~1,440 origin requests per day, total,
  no matter how much traffic you get.
- **Phases are driven by one config value.** `startTimeUTC` unset = rehearsal
  mode (simulated counter, nothing tracked). Before the start it shows a
  countdown to the bell; during the 24 hours it counts pageviews to the
  `/live` path (the number on the page); afterwards it freezes into a
  success or failure verdict.
- **The mosaic is deterministic.** The reveal order is a seeded shuffle fixed
  before launch, so every visitor watches the same picture emerge. Your own
  pixel is outlined (your visitor number is stored only in your browser's
  localStorage).

## Bot filtering — why the number is humans

| Layer | What it catches |
|---|---|
| GoatCounter server-side | Known bots, crawlers, and scrapers by User-Agent and other signals |
| JS-required counting | `curl`, scripts, and **link-preview fetchers** (WhatsApp, iMessage, Slack, Discord unfurlers) never execute `count.js`, so pasting the link in a chat doesn't inflate the count |
| Client guards in `app.js` | `navigator.webdriver` (Selenium/Playwright), headless and preview User-Agents — these never even load the analytics script |
| Visit-based metric | The displayed number is GoatCounter *visits*, so one person refreshing all day counts once per session, and localhost is never counted |

Honest caveats: a determined person with a headless browser farm could still
inflate it, and visitors running strict ad-blockers (some blocklists include
GoatCounter) are silently *not* counted. The number errs toward undercounting
humans rather than counting robots. For this experiment, that's the right
direction to be wrong in.

---

## Setup (one-time, ~15 minutes)

### 1. Put it on your GitHub and turn on Pages

```powershell
cd 1000-strangers
git remote add origin https://github.com/YOURUSERNAME/1000-strangers.git
git push -u origin main
```

Then on github.com: **repo → Settings → Pages → Source: Deploy from a branch →
Branch: `main`, folder `/ (root)` → Save.** A minute later the page is at
`https://YOURUSERNAME.github.io/1000-strangers/`.

### 2. Create the GoatCounter site (free)

1. Sign up at [goatcounter.com/signup](https://www.goatcounter.com/signup)
   and pick a code — e.g. `strangers1000` → your dashboard lives at
   `https://strangers1000.goatcounter.com`.
2. **Settings → check "Allow adding a visitor counter"** and save. Without
   this, the public counter endpoint returns HTTP 400 and the page can't read
   its own count.
3. Optional but in the spirit of the thing: make the dashboard **public**
   (also in Settings) and put its URL in `publicStatsUrl` so visitors can
   audit the number themselves.

### 3. Fill in the config and the meta tags

Edit `config.js`: set `goatcounterCode`, `canonicalUrl`, `repoUrl`, and
(optionally) `publicStatsUrl`. Leave `startTimeUTC: null` for now.

The OpenGraph tags in `index.html` need absolute URLs (link-preview robots
don't run JS). One command fixes all of them:

```powershell
(Get-Content index.html) -replace 'REPLACE-ME.github.io/1000-strangers', 'YOURUSERNAME.github.io/1000-strangers' | Set-Content index.html -Encoding utf8
```

Commit and push. 

### 4. Rehearse

```powershell
python -m http.server 8000   # then open http://localhost:8000
```

You'll see the full page in **rehearsal mode**: banner on top, simulated
counter climbing, mosaic revealing. Nothing is tracked (localhost is never
counted, and rehearsal mode doesn't load analytics at all). The deployed page
shows the same rehearsal state to anyone who stumbles in early.

Check the share card too: paste your Pages URL into
[opengraph.xyz](https://www.opengraph.xyz) — you should see `og.png`.

---

## Launch day playbook

### Pick the moment

Evening kickoff, Thursday or Friday, works well: group chats are active and
the window spans an evening + a full day. Convert your local time to UTC —
e.g. Friday 5:00 PM Pacific (UTC-7 in summer) is `"2026-07-18T00:00:00Z"`.

At T-minus ~15 minutes, set it and push:

```js
startTimeUTC: "2026-07-18T00:00:00Z",
```

Early visitors see a countdown to the bell (and get counted under `/preview`,
not `/live` — the official window stays clean).

### Seed it — with tagged links

Dark-social sharing strips referrers, so every channel you personally seed
gets its own `?ref=` tag. These show up in GoatCounter's referrer list as
`campaign:<tag>`; anything untagged with no referrer is organic forwarding —
the thing you're measuring. The page's own share button tags with `ref=fwd`.

| Channel | Link to paste | Notes |
|---|---|---|
| Group chats (aim for 10–20) | `…/?ref=chat` | Family, friends, coworkers, alumni, neighbors, parents' groups |
| Threads | `…/?ref=threads` | Algorithmic feed — small accounts can reach strangers |
| Bluesky | `…/?ref=bsky` | Loves web toys |
| X | `…/?ref=x` | Follower-graph; expect less unless it catches |
| TikTok / Reels / Shorts | `…/?ref=video` | Say the URL out loud; link in bio too |
| Anything else | `…/?ref=misc` | QR poster, email footer, Discord you belong to |

House rules baked into the premise (and stated on the page): no Reddit, no
Hacker News, no Product Hunt, no paid promotion. If someone else posts it
somewhere, that's the internet doing its thing — you just don't.

**Group chat template** (send as yourself, not as a broadcast):

> ok weird favor. I built a webpage that has 24 hours to get 1,000 strangers
> to visit — no ads, nothing for sale, it's just an experiment about whether
> people still forward things. Every visitor lights one pixel of a hidden
> picture. It dies at [time] tomorrow: [link]?ref=chat

**Feed post template:**

> I gave a webpage 24 hours to live. It needs 1,000 strangers, it has no ads,
> sells nothing, and can't spread through Reddit or HN — only through people
> sending it to people. Every visitor lights one pixel. Clock's running: [link]?ref=threads

**20-second video beats:** phone screen recording of the counter ticking up →
cut to the half-revealed mosaic → "this page dies at 5 PM tomorrow" → say the
URL slowly, once, and pin it in a comment.

### During the day

- Reply to every response in your chats — threads that talk, forward.
- One nudge per chat maximum, around the two-thirds mark, and only with news:
  "we're at 640 with 6 hours left" is news; "please click" is spam.
- Screenshot milestones (100, 500, goal) — those are your posting material.

---

## Reading the dashboard

Your GoatCounter dashboard during the run:

- **`/live` visits** — the official number, the same one the page shows.
- **`/preview` and `/after`** — traffic outside the window, kept separate.
- **Referrers** — `campaign:chat`, `campaign:threads`, … for your seeds;
  `campaign:fwd` for people who used the share button; actual site referrers
  for public posts; *(no referrer)* + untagged = raw dark-social forwarding.
- **Events `share-native` / `share-copy`** — how many visitors hit the share
  button (native share sheet vs. clipboard copy).
- **Locations / devices** — strangers in countries you know nobody in is the
  clearest signal it escaped your own graph.

The one metric that decides the outcome: **forwarding rate ≈ share events ÷
`/live` visits.** Above ~0.3 early on, the cascade can carry itself; below
~0.1, seed more chats — the artifact isn't spreading on its own.

Afterwards: **GoatCounter → Settings → Export** gives you the full CSV for a
proper post-mortem (first-hour curve, campaign breakdown, where the chain
died or caught).

## After the 24 hours

The page handles its own ending: at the deadline it freezes, shows the
verdict — final count, success or failure copy — and completes the mosaic
only if the goal was hit. Leave it deployed; it's now a permanent record of
the outcome either way. If you rerun the experiment, change `startTimeUTC`
to a new window and (to start the count from zero) use a fresh GoatCounter
code or delete the old site data.

---

## Config reference (`config.js`)

| Key | Meaning |
|---|---|
| `goatcounterCode` | Your GoatCounter subdomain code. `""` = counter offline |
| `startTimeUTC` | ISO 8601 UTC start. `null` = rehearsal mode, nothing tracked |
| `windowHours` | Length of the window (default 24) |
| `goal` | Target visitors (default 1000; the mosaic always has 1,000 cells) |
| `canonicalUrl` | Public URL, used to build the share link |
| `repoUrl` | Footer "source" link (`""` hides it) |
| `publicStatsUrl` | Footer "live stats" link (`""` hides it) |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Counter stuck on "waking the counter up…" | `goatcounterCode` wrong, or **"Allow adding a visitor counter" not enabled** in GoatCounter settings (endpoint returns 400/404 until it is) |
| Count doesn't move for ~a minute | By design — one shared cache refresh per minute |
| Your own visits don't count | Also by design: localhost is excluded, and your browser may be running an ad-blocker that blocks GoatCounter |
| Page 404 on github.io | Pages not enabled, or wrong branch/folder in repo Settings → Pages |
| Share preview has no image | OG URLs still say `REPLACE-ME`, or the platform cached an old card — re-check with opengraph.xyz |

## Development

- Logic tests: `node tests/test.cjs` (also prints the hidden picture)
- Regenerate the share card: `powershell -ExecutionPolicy Bypass -File tools\make-og.ps1`
- Everything pure/testable lives in `logic.js`; DOM and network in `app.js`.

## Privacy

No cookies, no fingerprinting, no personal data. GoatCounter is open-source,
privacy-respecting analytics (no persistent identifiers). The only thing
stored on a visitor's device is their own visitor number, in their own
localStorage, so the page can point at their pixel when they come back.

## License

MIT — see [LICENSE](LICENSE).
