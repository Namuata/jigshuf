# Jigshuffle — launch guide

Everything is plain static files (`index.html`, `privacy.html`). No build step.

## 1. Put it online (free)

Pick one host and drag-drop the folder, or connect a Git repo:

| Host | How | Custom domain |
|------|-----|---------------|
| **Cloudflare Pages** | pages.cloudflare.com → Create → upload folder | free, easy |
| **Netlify** | app.netlify.com → drag the folder onto the dashboard | free |
| **Vercel** | vercel.com → New Project → import | free |
| **GitHub Pages** | push repo → Settings → Pages | free, but AdSense reviewers prefer a real domain |

You need a **real domain** (e.g. from Cloudflare/Namecheap, ~$10/yr) for AdSense approval — a `*.pages.dev`/`*.netlify.app` subdomain sometimes works but a top-level domain is safer.

## 2. Turn on the global leaderboard (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of `supabase-setup.sql` → **Run**.
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.
4. In `index.html`, set near the top:
   ```js
   const SUPABASE_URL = "https://YOURPROJECT.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";   // the anon public key
   ```
   The anon key is meant to be public — Row-Level Security limits it to inserting/reading scores.

Until you do this, the leaderboard quietly stays per-device (localStorage) and shows a hint.

## 3. Protect the TMDB key (Cloudflare Worker proxy)

The TMDB key must **never** live in `index.html` — a static site is fully public. Instead it
sits as a secret inside a free Cloudflare Worker that the site calls. The file is
`tmdb-proxy.worker.js`.

1. **Regenerate your TMDB key** at themoviedb.org (the old one was already public).
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Worker**
   → paste the contents of `tmdb-proxy.worker.js` → **Deploy**.
3. Worker → **Settings → Variables and Secrets** → add an **encrypted secret**
   named `TMDB_KEY` = your new TMDB key.
4. In `tmdb-proxy.worker.js`, set `ALLOWED_ORIGINS` to your GitHub Pages origin
   (e.g. `https://yourname.github.io`) and redeploy.
5. Copy the Worker's `*.workers.dev` URL and paste it into `index.html`:
   ```js
   const TMDB_PROXY = "https://your-worker.your-subdomain.workers.dev";
   ```

Movies / TV / People stay disabled with a hint until `TMDB_PROXY` is set. Super Heroes,
Anime, Pokémon and Flags need no key at all. The Worker also caches responses for 5 min
and rejects requests from other sites' origins.

## 4. AdSense (after the site is live with content)

AdSense approval requires a live site on your domain, a privacy policy (included:
`privacy.html` — fill in your email), and enough genuine content. Game-only sites are
sometimes rejected as "thin," so consider adding a short About/how-to-play section or a
few blog posts before applying.

1. Apply at [adsense.google.com](https://adsense.google.com) and add your domain.
2. After approval, copy your publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`).
3. In `index.html` set:
   ```js
   const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";
   ```
4. (Optional) Create display ad units in AdSense and paste each unit's slot id into the
   `data-ad-slot` attributes on `#adTop` / `#adBottom` in `index.html`.

The ad slots stay hidden until `ADSENSE_CLIENT` is set, so the page looks clean during dev.

### Heads-up on "made for kids"
Pokémon/anime/character content skews young. In AdSense, review the EU/child-directed
settings; tagging content as child-directed (where required) disables personalized ads and
lowers revenue but keeps you compliant (COPPA / GDPR-K).

## 5. Before sharing on social
- `og:image`/`og:title` meta tags are already in `index.html` — set `og:url` and add a
  1200×630 `share.png` to your domain for nice link previews.
- Replace `YOUR_EMAIL_HERE` in `privacy.html`.
- Confirm the TMDB key only lives in the Cloudflare Worker secret (step 3) — never in
  `index.html` or the repo.
