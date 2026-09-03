# Deploying ViscoLoop (no local Node.js needed)

Since Node.js can't be installed on this machine, skip local dev entirely — push the code to a
host that installs and runs Node for you, then test through the live URL in any browser. Git is
already installed here and the project is already a local git repo with one commit.

We'll use **Render** (generous free tier, connects straight to a GitHub repo, zero server
config). Railway or Azure App Service work the same way if you'd rather use one of those.

## 1. Push the code to GitHub

If you don't already have a GitHub account, create one at **github.com** (free) — that's
something only you can do, since it needs your own email/login.

Then create a new, empty repository (no README/license — this project already has one), and
run from `C:\Users\EddieBarlow\ViscoLoop`:

```bash
git remote add origin https://github.com/<your-username>/viscoloop.git
git push -u origin main
```

## 2. Create the web service on Render

1. Sign up at **render.com** (free) and connect your GitHub account.
2. **New +** → **Web Service** → pick the `viscoloop` repo.
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. **Environment** → add a variable:
   - `ANTHROPIC_API_KEY` = your key from https://console.anthropic.com/
5. Click **Create Web Service**. Render installs dependencies and starts it — first deploy
   takes a couple of minutes. You'll get a live URL like `https://viscoloop.onrender.com`.

## 3. Try it

Open that URL on your phone, tablet, and desktop. Each device can "Add to Home Screen" /
"Install" it as a PWA straight from the browser — no app store needed, and it's HTTPS by
default so install works everywhere (not just localhost).

## Important: data persistence on the free tier

`server/data/*.json` (Company Tools, Documents metadata) lives on disk. On Render's **free**
tier, that disk is wiped on every redeploy/restart — fine for kicking the tires, not fine for
real content people rely on.

Before rolling this out for real, do one of:
- Upgrade to a paid Render instance and attach a **persistent Disk** mounted at `/data`, then
  point `server/src/lib/store.js` paths at it (I can wire this up when you're ready), **or**
- Move `documents.json`/`tools.json` into a small real database (e.g. Render's free Postgres,
  or Supabase) — a bigger but more durable change.

Since Documents now mostly link out to OneDrive rather than storing files here, the only data
actually at risk on redeploy is the **list of links/tools themselves** — worth fixing before
more than a couple of people start relying on it, but not urgent for a first look.

## Updating the live app later

Whenever you want to ship a change:

```bash
git add -A
git commit -m "describe the change"
git push
```

Render redeploys automatically on every push to `main`.
