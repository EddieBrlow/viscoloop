# ViscoLoop

Your company's one-stop shop: company documents, quick links to the third-party tools your
team uses, a team directory, HR resources, work guides, a suggestion program with a full
review/implementation kanban workflow, and an AI assistant employees can ask policy/document
questions.

Built as an **installable web app (PWA)** — one codebase, no app stores. Employees open the
URL once on their phone, tablet, or desktop and "install" it for an app-like icon and full-screen
experience. A single small Node server serves the app and its data.

Navigation follows a hub layout: the Home page is a tile grid linking out to each section, and
every section has a "← Back to portal" link rather than a persistent tab bar — this is deliberate
(matches the design pattern of [viscoloop.pplx.app](https://viscoloop.pplx.app), a reference
build of this same app) and scales better as sections are added.

## What's here

```
public/            The app itself (plain HTML/CSS/JS — no build step)
  index.html        Home hub + Documents / Company Tools / Team Directory / HR /
                     Work Guides / Suggestions / Ask ViscoLoop sections
  manifest.webmanifest, sw.js   PWA install + offline shell caching
server/            Backend: serves public/ and provides the APIs
  src/routes/documents.js    Document hub (links + file uploads)
  src/routes/tools.js        Company Tools (add/edit/delete links)
  src/routes/team.js         Team Directory (name/role/department/phone/email)
  src/routes/hr.js           HR resources (uses the shared link-directory factory)
  src/routes/workguides.js   Work Guides (uses the shared link-directory factory)
  src/routes/suggestions.js  Suggestions: full kanban workflow, comments, leadership unlock
  src/routes/chat.js         The AI assistant (calls Claude)
  src/lib/linkDirectory.js   Shared CRUD factory for "list of link resources" sections
  knowledge/                  Policy text files the bot answers from
  data/                       *.json (simple JSON storage for v1 — one file per section)
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

- **Documents / HR / Work Guides**: all three follow the same pattern — files live in your
  shared **OneDrive**. In OneDrive, right-click a file or folder → **Share** → **Copy link**,
  then use the "+ Add…" button in that section and paste the link in. Each is seeded with 2–3
  placeholder examples — delete those. (Documents also supports direct file upload as a
  fallback — see the note in DEPLOY.md about why uploaded files don't reliably persist on the
  free hosting tier.)
- **Company Tools**: use "+ Add tool" for every third-party platform your team uses (Slack, HR
  system, CRM, etc).
- **Team Directory**: use "+ Add person" for each teammate (name, role, department, phone,
  email). Seeded with one placeholder entry — update or delete it.
- **Suggestions**: anyone can submit an idea ("+ Submit suggestion") with a category, urgency,
  problem/solution/benefit, and an optional name — no login needed. It moves through a kanban
  board: **Submitted → In Review → Approved → Action Plan → In Progress → Implemented** (or
  **Deferred** / **Closed**). Comments are open to everyone; changing status, editing the action
  plan (owner/target date/steps), or deleting a suggestion requires **unlocking leadership
  controls** via the button in the header — see below.
- **Ask ViscoLoop bot**: replace the placeholder files in `server/knowledge/` with your real
  policy documents (plain `.md` or `.txt`). The bot only answers from what's in that folder —
  add as many files as you like, one policy per file works well.

## Leadership passcode (optional)

By default, anyone can unlock leadership controls on Suggestions (fine for a small trusted
pilot). To require a real passcode, set `LEADERSHIP_PASSCODE` in the server's environment
variables (same place as `ANTHROPIC_API_KEY`) and restart. Employees then need that passcode to
change a suggestion's status, edit its action plan, or delete it — submitting ideas and adding
comments stay open to everyone either way.

## Known v1 limitations (worth knowing before wider rollout)

- **No real authentication** — the leadership passcode (if set) is a single shared secret, not
  per-person login, and everything else has no login at all. Once deployed, the URL is reachable
  by anyone on the internet who has it. Fine for a quiet pilot with a handful of trusted people;
  add real auth (e.g. SSO via Microsoft Entra/Google Workspace) before sharing the link more
  widely.
- **App icon** (`public/icons/icon-192.png` / `icon-512.png`) is a center-cropped square of the
  brand photo (`scripts/crop-logo-photo.ps1` generated it from `Downloads\Image (1).jpg`) — swap
  in a dedicated square logo file the same way if one becomes available later.
- **All data lives in JSON files** on the server (`server/data/`), and on the free hosting tier
  that disk doesn't persist across redeploys — see [DEPLOY.md](DEPLOY.md) for why and how to fix
  it before relying on it.
- **Retrieval for the bot is simple keyword matching**, not semantic search — works well for a
  modest number of policy docs; revisit if the knowledge base grows large.

## Next ideas (not built yet)

- Real per-person authentication / SSO
- Full-text or semantic search across documents
- Push notifications for new/updated policies
- Drag-and-drop between kanban columns (currently: open a card → change status)
