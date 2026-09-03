# ViscoLoop

Your company's one-stop shop: company documents, quick links to the third-party tools your
team uses, and an AI assistant employees can ask policy/document questions.

Built as an **installable web app (PWA)** — one codebase, no app stores. Employees open the
URL once on their phone, tablet, or desktop and "install" it for an app-like icon and full-screen
experience. A single small Node server serves the app and its data (documents, tools, and the bot).

## What's here

```
public/            The app itself (plain HTML/CSS/JS — no build step)
  index.html        Home / Documents / Company Tools / Ask ViscoLoop tabs
  manifest.webmanifest, sw.js   PWA install + offline shell caching
server/            Backend: serves public/ and provides the APIs
  src/routes/documents.js   Document hub (links + file uploads)
  src/routes/tools.js       Company Tools tab (add/edit/delete links)
  src/routes/chat.js        The AI assistant (calls Claude)
  knowledge/                 Policy text files the bot answers from
  data/                      documents.json / tools.json (simple JSON storage for v1)
```

## Before you can run it: install Node.js

This machine doesn't have Node.js yet, which the server needs to run.

1. Download the **LTS** installer from **https://nodejs.org** and run it (defaults are fine).
2. Open a new terminal (PowerShell) and confirm it worked:
   ```bash
   node -v
   npm -v
   ```

## Running ViscoLoop locally

```bash
cd server
npm install
copy .env.example .env
```

Then open `server\.env` and paste in an Anthropic API key (from https://console.anthropic.com/)
so the "Ask ViscoLoop" bot can answer for real. Without a key, the bot still runs but replies
that it isn't configured yet.

Start it:

```bash
npm start
```

Then open **http://localhost:3000** in your browser. You'll see an "Install" banner (Chrome/Edge)
to add it to your desktop. To try Documents, Company Tools, and the chat bot, use the tabs at
the top.

## Making it available on phones/tablets, not just this PC

Right now it only runs on `localhost` on this machine. For real company-wide use:

1. **Deploy the server somewhere reachable**, e.g. a small VM, Railway, Render, or Azure App
   Service. Any of these can run this Node app as-is.
2. Point a real domain (or subdomain) at it with **HTTPS** — required for "Add to Home Screen"
   to work on phones/tablets (localhost is exempt, but nothing else is).
3. Share that URL with the team. Each person opens it once and installs it like any PWA.

I can help set up a specific host (Railway/Render/Azure/etc.) once you pick one.

## Filling in real content

- **Documents tab**: use "+ Add document" to link out to your existing Google Drive/SharePoint/
  Notion docs, or upload a file directly. Seeded with 3 placeholder examples — delete those.
- **Company Tools tab**: use "+ Add tool" for every third-party platform your team uses (Slack,
  HR system, CRM, etc). Seeded with 3 placeholder examples.
- **Ask ViscoLoop bot**: replace the placeholder files in `server/knowledge/` with your real
  policy documents (plain `.md` or `.txt`). The bot only answers from what's in that folder —
  add as many files as you like, one policy per file works well.

## Known v1 limitations (worth knowing before wider rollout)

- **No login/authentication yet** — anyone with the URL can view, add, and delete documents/tools.
  Fine for an internal pilot on a trusted network; add auth (e.g. SSO via Microsoft Entra/Google
  Workspace) before a company-wide rollout.
- **App icon is a placeholder SVG** (`public/icons/icon.svg`) — swap in your real logo as PNG
  files (192×192 and 512×512 at minimum) for the best install experience on iOS.
- **Document/tool data lives in JSON files** on the server (`server/data/`) — fine for v1, but
  move to a real database if this grows past a small team or you need audit history.
- **Retrieval for the bot is simple keyword matching**, not semantic search — works well for a
  modest number of policy docs; revisit if the knowledge base grows large.

## Next ideas (not built yet)

- Authentication / SSO
- Admin-only permissions for adding/editing/deleting
- Full-text or semantic search across documents
- Push notifications for new/updated policies
