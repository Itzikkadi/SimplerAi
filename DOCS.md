# Simpler — Setup & Insights
> "Sampling, simplified." — AI-powered vocal sample discovery for music producers

---

## 1. Project Overview

Simpler is a web app that lets producers upload a track, get AI-matched vocal samples, preview them in-browser, and decide on rights — all in one place.

**Core flow:**
```
Upload track → auto-detect BPM/key/mood → search Freesound API → hear samples → save to library
```

**What makes it different from Splice/Tracklib:**
- Starts from YOUR track and works backwards
- Shows all rights info (PD / CC0 / Clearable / Risky) — user decides
- "Most Obscure" sort — finds samples nobody else is using
- Reference track input — algorithm learns your vibe
- No rabbit holes, no tab switching — everything in one place

---

## 2. Architecture

```
simpler/
├── frontend/          ← React app (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SearchBar.jsx
│   │   │   ├── QuickTags.jsx
│   │   │   ├── SortToolbar.jsx
│   │   │   ├── ResultsList.jsx
│   │   │   ├── ResultRow.jsx
│   │   │   └── Player.jsx
│   │   ├── hooks/
│   │   │   ├── useSearch.js      ← search with abort controller
│   │   │   ├── usePlayer.js      ← audio player with RAF
│   │   │   └── useSavedSamples.js
│   │   └── api/
│   │       └── freesound.js      ← API layer
│   └── .env                      ← VITE_BACKEND_URL
└── backend/           ← Vercel serverless function
    └── api/
        └── search.js             ← Freesound proxy (handles CORS)
```

**Why a backend proxy?**
Freesound API does not support CORS — direct calls from the browser are blocked. The Vercel serverless function acts as a proxy, forwarding requests server-side.

---

## 3. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + CSS Modules |
| Backend | Vercel Serverless (Node.js) |
| Audio source | Freesound API (CC0 samples) |
| Audio analysis | librosa (Python) — BPM/key detection |
| AI matching | Claude API (planned) |
| Payments | Stripe (planned) |
| Plugin V2 | Max for Live (Ableton) |

---

## 4. Environment Variables

### Frontend (.env)
```
VITE_BACKEND_URL=https://simpler-backend-v3-pb1bezv8g-simpler1.vercel.app
```

### Backend (Vercel Dashboard → Environment Variables)
```
FREESOUND_API_KEY=eh3xuoTAmLExFgb4uWxFMGiFrnH7A78jvQYGKzAB
```

> ⚠️ Never commit the API key to GitHub. Keep it in Vercel env variables only.

---

## 5. Vercel Projects (Team: simpler1)

| Project | URL | Purpose |
|---|---|---|
| simpler-app | simpler-app.vercel.app | Frontend (old HTML version) |
| simpler-backend-v3 | simpler-backend-v3-pb1bezv8g-simpler1.vercel.app | Live backend proxy ✅ |
| simpler-backend-v2 | simpler-backend-v2-... | Old backend (deprecated) |
| simpler-backend | simpler-backend-dusky-... | Old backend (deprecated) |

**Team ID:** `team_P9DBhw6325ZegUjqwcUjI7IF`

---

## 6. GitHub Repo

**URL:** https://github.com/Itzikkadi/SimplerAi

**To push code (run in Terminal):**
```bash
cd ~/Downloads/simpler-react
git init
git add .
git commit -m "Initial commit — Simpler React app"
git branch -M main
git remote add origin https://github.com/Itzikkadi/SimplerAi.git
git push -u origin main --force
```

**To connect GitHub → Vercel (auto-deploy on every push):**
1. vercel.com/new → Import Git Repository → select SimplerAi
2. Add env variable: `VITE_BACKEND_URL`
3. Deploy

---

## 7. Local Development

```bash
cd simpler-react
npm install
npm run dev
# Open http://localhost:5173
```

The Vite proxy in `vite.config.js` forwards `/api` calls to the backend automatically.

---

## 8. API Reference

### Backend endpoint
```
GET /api/search?q=vocal+shout&sort=score&page_size=15
```

**Sort options:**
- `score` — most relevant
- `downloads` — most popular
- `created` — newest
- `downloads` (ascending) — most obscure

**Response:** Freesound JSON with `count` and `results[]`

Each result includes:
- `id`, `name`, `username`, `duration`
- `previews['preview-hq-mp3']` — direct audio URL for playback
- `license` — CC0 / CC BY / etc.
- `tags[]`

---

## 9. Known Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `Failed to fetch` | CORS blocked | Use backend proxy (v3) |
| `Freesound error: 401` | API key missing | Set `FREESOUND_API_KEY` in Vercel env vars |
| `404: NOT_FOUND` | Wrong URL (root has no content) | Use `/api/search?q=...` not just `/` |
| Audio won't play in Claude widget | iframe security restrictions | Use standalone Vercel URL |
| BPM detection off | librosa inaccurate on synth-heavy tracks | Upgrade to Essentia + let user confirm BPM |

---

## 10. Freesound API

- **Client ID:** `u3r0y0ZE6TY8Rjqhmtnz`
- **Apply for key:** freesound.org/apiv2/apply
- **Docs:** freesound.org/docs/api
- **Total CC0 samples:** 500k+

---

## 11. Roadmap

### V1 (current)
- [x] Freesound search with live results
- [x] Built-in audio player
- [x] Sort: Relevant / Popular / Newest / Most Obscure
- [x] Rights badges (CC0, CC, PD)
- [x] Quick tags
- [x] Track upload + BPM/key detection (simulated)
- [x] Reference track input
- [ ] Real BPM analysis with Essentia
- [ ] Archive.org integration
- [ ] Tracklib clearance API
- [ ] Sample library (save + organize)
- [ ] Stripe $4.99/month subscription

### V2
- [ ] Ableton Max for Live plugin
- [ ] Auto-detect BPM/key from Ableton session
- [ ] Drag & drop sample to clip slot

### V3
- [ ] FL Studio / Logic plugins
- [ ] Ad space (plugins, gear, sample packs)
- [ ] Social feed — "Used this sample in..."
- [ ] Producer community + collab feature
- [ ] Clearance marketplace

---

## 12. Key Product Insights (from development)

**Speed is the #1 competitive advantage.**
Producers spend hours digging — Simpler's biggest edge is getting from "open the app" to "hear something useful" in under 10 seconds.

**BPM + key alone is not enough for matching.**
The algorithm needs: mood + density + vocal role + BPM + key. Without mood/density, results are wrong even with correct BPM.

**"Most Obscure" sort is the killer feature.**
Nobody else has this. Producers want samples that haven't been used by everyone else.

**Rights info should inform, not gatekeep.**
Show PD / CC0 / Risky badges and let the producer decide. Don't block results.

**Reference track > manual parameters.**
Uploading a reference track (e.g. a Travis Scott beat) tells the algorithm more than 10 filter dropdowns.

---

## 13. Pricing

| Tier | Price | Features |
|---|---|---|
| Free | $0 | 5 searches/month, PD only, no upload |
| Pro | $4.99/month | Unlimited, all sources, upload, library, tips |

---

## 14. Brand

- **Name:** Simpler
- **Tagline:** "Sampling, simplified."
- **Primary color:** `#1D9E75` (teal)
- **Logo style:** `simpl` + `er` (er in teal)
- **Voice:** Direct, fast, speaks to producers — not the music industry
