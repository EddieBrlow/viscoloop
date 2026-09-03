# ViscoLoop

Your company's one-stop shop: company documents, quick links to the third-party tools your
team uses, a suggestion box with a review/implementation pipeline, and an AI assistant employees
can ask policy/document questions.

Built as an **installable web app (PWA)** — one codebase, no app stores. Employees open the
URL once on their phone, tablet, or desktop and "install" it for an app-like icon and full-screen
experience. A single small Node server serves the app and its data (documents, tools, and the bot).

## What's here

```
public/            The app itself (plain HTML/CSS/JS — no build step)
  index.html        Home / Documents / Company Tools / Suggestions / Ask ViscoLoop tabs
  manifest.webmanifest, sw.js   PWA install + offline shell caching
server/            Backend: serves public/ and provides the APIs
  src/routes/documents.js    Document hub (links + file uploads)
  src/routes/tools.js        Company Tools tab (add/edit/delete links)
  src/routes/suggestions.js  Suggestions tab (submit + move through the review pipeline)
  src/routes/chat.js         The AI assistant (calls Claude)
  knowledge/                  Policy text files the bot answers from
  data/                       documents.json / tools.json / suggestions.json (simple JSON storage for v1)
```

## Running it — no local Node.js needed

This machine doesn't have (and can't easily get) Node.js installed, so skip running it locally.
Instead, deploy straight to a free cloud host that installs and runs Node for you — you test and
use it through a live HTTPS URL from any browser, on any device.

👉 See **[DEPLOY.md](DEPLOY.md)** for the full walkthrough (GitHub + Render, ~10 minutes).

Once deployed, open the live URL and paste an Anthropic API key (from
https://console.anthropic.com/) into the service's environment variables so the "Ask ViscoLoop"
bot can answer for real. Without a key, the bot still runs but replies that it isn't configured
yet.

*(If you later get Node installed some other way, local dev still works the usual way: `cd
server && npm install && copy .env.example .env && npm start`, then open
http://localhost:3000.)*

## Filling in real content

- **Documents tab**: files live in your shared **OneDrive**. In OneDrive, right-click a file or
  folder → **Share** → **Copy link**, then use "+ Add document" in ViscoLoop and paste that link
  in. Seeded with 3 placeholder OneDrive-link examples — replace those with your real links.
  (Direct file upload is still available as a fallback in the "+ Add document" form, but OneDrive
  links are the intended path — see the note in DEPLOY.md about why uploaded files don't
  reliably persist on the free hosting tier.)
- **Company Tools tab**: use "+ Add tool" for every third-party platform your team uses (Slack,
  HR system, CRM, etc). Seeded with 3 placeholder examples.
- **Suggestions tab**: anyone can submit an idea ("+ Submit suggestion") with an optional name.
  Move a suggestion through the pipeline with the "Move to" dropdown on its card — every move is
  timestamped in that suggestion's `history` array (visible via `GET /api/suggestions`), so you
  can see when it went from Submitted → Under Review → Planned → In Progress → Implemented (or
  Declined). There's no separate "admin" role yet — see Known limitations below. Seeded with 2
  placeholder examples — delete those.
- **Ask ViscoLoop bot**: replace the placeholder files in `server/knowledge/` with your real
  policy documents (plain `.md` or `.txt`). The bot only answers from what's in that folder —
  add as many files as you like, one policy per file works well.

## Known v1 limitations (worth knowing before wider rollout)

- **No login/authentication yet** — and once deployed, the URL is reachable by anyone on the
  internet who has it, not just people on your network. Anyone with the link can view, add, and
  delete documents/tools, and can move any suggestion through the review pipeline (there's no
  separate reviewer/admin role — that's the main thing worth adding before wider rollout, so
  status changes reflect an actual decision rather than anyone clicking a dropdown). Fine for a
  quiet pilot with a handful of trusted people; add auth (e.g. SSO via Microsoft Entra/Google
  Workspace) before sharing the link more widely.
- **App icon** (`public/icons/icon-192.png` / `icon-512.png`) is a center-cropped square of the
  brand photo (`scripts/crop-logo-photo.ps1` generated it from `Downloads\Image (1).jpg`) — swap
  in a dedicated square logo file the same way if one becomes available later.
- **Document/tool data lives in JSON files** on the server (`server/data/`), and on the free
  hosting tier that disk doesn't persist across redeploys — see [DEPLOY.md](DEPLOY.md) for why
  and how to fix it before relying on it.
- **Retrieval for the bot is simple keyword matching**, not semantic search — works well for a
  modest number of policy docs; revisit if the knowledge base grows large.

## Next ideas (not built yet)

- Authentication / SSO
- Admin-only permissions for adding/editing/deleting
- Full-text or semantic search across documents
- Push notifications for new/updated policies
