# BUMBLEBEE — Cinematic New Tab

Hey, I'm **Samarth** — 15, from India. Student, SolidWorks CAD nerd, now learning to build hardware *and* the software that runs on it. This is my custom Chrome New Tab — not a template, every interaction was sketched and tested by me.

### What it is
A **Manifest V3** new-tab override that turns a blank tab into a small, fast desktop: full-bleed video behind, a retro TV that actually plays, a sticky note you can drag, live weather where you are, 5 most-visited, search with suggestions, and a horizontal Discover news strip you get by scrolling — Apple-style glass, Bumblebee amber, no framework.

### Features
- **Cinematic background** — your `assets/video.mp4` loops muted full-bleed (`object-fit: cover`) with a soft Ken Burns zoom and a dark scrim so text stays readable
- **TV frame** — `assets/tv-frame.png` + `assets/sticker.mp4` inside the empty screen slot (only place with sound — click play to unmute, Chrome needs a gesture). Drag by header, traffic-light dots: red close / yellow minimize / green expand, plus a clean bar below the TV
- **Clock** — frosted glass type, 24h `14:53` + `Monday, 5 June`, live
- **Search** — glass pill, Google/URL detect, live suggest via Google → DuckDuckGo fallback
- **5 Most Visited** — `chrome.topSites` single row, favicons via Google S2, no toggle
- **Sticky Note** — draggable, 6 colors, auto-saves
- **Weather (tiny, top-left)** — tries device location, if blocked asks for your city, fallback Silicon Valley `37.3875,-122.0575`, via Open-Meteo + Nominatim, 11px
- **Discover News** — horizontal swipe, BBC RSS via `api.rss2json.com`, 8 cards, bubble dots, Tech/Sports/Business/Entertainment pills

### Tech Deck
- **Core:** `index.html` / `style.css` / `script.js` — vanilla, no build
- **Extension:** `manifest.json` V3, `chrome_url_overrides.newtab`, `permissions: [topSites, favicon]`
- **Styling:** hand-built glass (`backdrop-filter: blur() saturate()`, `rgba(255,255,255,.12)` + amber `#F5C518`), `clamp()` type, `grid`/`flex`
- **APIs & Data:**
  - **Geolocation:** `navigator.geolocation` → device lat/lon
  - **Weather:** `api.open-meteo.com/v1/forecast?current=...` + `nominatim.openstreetmap.org/reverse|search` for city → temp/condition
  - **News:** `api.rss2json.com/v1/api.json?rss_url=` wrapping `feeds.bbci.co.uk/news/.../rss.xml` (images from `ichef.bbci.co.uk`)
  - **Suggest:** `suggestqueries.google.com/complete/search?client=chrome` → `duckduckgo.com/ac/`
  - **Favicons:** `google.com/s2/favicons?domain=HOST&sz=64`
  - **Local:** `assets/video.mp4` / `bg.mp4` / `sticker.mp4` / `tv-frame.png`, `localStorage` for positions/notes/cache

### Run locally
1. `chrome://extensions` → Developer mode → Load unpacked → pick this folder
2. Put your videos in `assets/` (`video.mp4` background muted, `sticker.mp4` TV sound, `tv-frame.png` your TV)
3. Reload the new tab — allow location for weather, scroll down for news

Built idea-by-idea by me — AI helped with boilerplate, but every flow, timing, and pixel was chosen here. A lot of hours finding the right videos and frames.

— Samarth
