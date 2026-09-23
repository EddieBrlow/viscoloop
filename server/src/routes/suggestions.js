import { Router } from "express";
import { randomUUID } from "node:crypto";
import { jsonStore } from "../lib/store.js";

const DATA_FILE = new URL("../../data/suggestions.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const store = jsonStore(DATA_FILE);

export const STATUSES = [
  "Submitted",
  "In Review",
  "Approved",
  "Action Plan",
  "In Progress",
  "Implemented",
  "Deferred",
  "Closed",
];

export const CATEGORIES = [
  "Safety",
  "Quality",
  "Efficiency",
  "Cost Savings",
  "Tools & Equipment",
  "Communication",
  "Jobsite Logistics",
  "Office Process",
  "Other",
];

export const URGENCIES = ["Low", "Medium", "High"];

// Leadership actions (status changes, deletes, editing the action plan) require
// this passcode. Comments and new submissions stay open to everyone -- matches
// the "no login to submit" / "unlock to manage" pattern. If unset, leadership
// actions are open to anyone (fine for a small trusted pilot).
function requireLeadership(req, res, next) {
  const configured = process.env.LEADERSHIP_PASSCODE;
  if (!configured) return next();
  const supplied = req.get("x-leadership-passcode");
  if (supplied !== configured) return res.status(401).json({ error: "Leadership unlock required" });
  next();
}

export const suggestionsRouter = Router();

suggestionsRouter.get("/meta", (_req, res) => {
  res.json({ statuses: STATUSES, categories: CATEGORIES, urgencies: URGENCIES });
});

suggestionsRouter.post("/unlock", (req, res) => {
  const configured = process.env.LEADERSHIP_PASSCODE;
  if (!configured) return res.json({ ok: true, openMode: true });
  const { passcode } = req.body ?? {};
  if (passcode !== configured) return res.status(401).json({ ok: false, error: "Incorrect passcode" });
  res.json({ ok: true });
});

suggestionsRouter.get("/", async (req, res) => {
  const suggestions = await store.readAll();
  const { status } = req.query;
  const filtered = status ? suggestions.filter((s) => s.status === status) : suggestions;
  res.json(filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
});

// { title, category, urgency, problem, solution, benefit, submittedBy, role }
suggestionsRouter.post("/", async (req, res) => {
  const { title, category, urgency, problem, solution, benefit, submittedBy, role } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });

  const now = new Date().toISOString();
  const suggestions = await store.readAll();
  const suggestion = {
    id: randomUUID(),
    title,
    category: CATEGORIES.includes(category) ? category : "Other",
    urgency: URGENCIES.includes(urgency) ? urgency : "Medium",
    problem: problem || "",
    solution: solution || "",
    benefit: benefit || "",
    submittedBy: submittedBy || "Anonymous",
    role: role || "",
    status: "Submitted",
    owner: "",
    targetDate: "",
    actionSteps: "",
    history: [{ status: "Submitted", at: now }],
    comments: [{ author: submittedBy || "Anonymous", text: "Suggestion submitted.", at: now }],
    createdAt: now,
    updatedAt: now,
  };
  suggestions.push(suggestion);
  await store.writeAll(suggestions);
  res.status(201).json(suggestion);
});

suggestionsRouter.post("/:id/comments", async (req, res) => {
  const { author, text } = req.body ?? {};
  if (!text) return res.status(400).json({ error: "text is required" });

  const suggestions = await store.readAll();
  const idx = suggestions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const now = new Date().toISOString();
  suggestions[idx].comments.push({ author: author || "Anonymous", text, at: now });
  suggestions[idx].updatedAt = now;
  await store.writeAll(suggestions);
  res.status(201).json(suggestions[idx]);
});

suggestionsRouter.patch("/:id/status", requireLeadership, async (req, res) => {
  const { status, note } = req.body ?? {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
  }

  const suggestions = await store.readAll();
  const idx = suggestions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const now = new Date().toISOString();
  const suggestion = suggestions[idx];
  suggestion.status = status;
  suggestion.updatedAt = now;
  suggestion.history.push({ status, at: now, note: note || undefined });
  suggestion.comments.push({ author: "Leadership", text: `Status moved to "${status}".${note ? ` ${note}` : ""}`, at: now });

  await store.writeAll(suggestions);
  res.json(suggestion);
});

// Leadership-only edit of the action plan fields.
suggestionsRouter.patch("/:id", requireLeadership, async (req, res) => {
  const suggestions = await store.readAll();
  const idx = suggestions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const { owner, targetDate, actionSteps } = req.body ?? {};
  const suggestion = suggestions[idx];
  if (owner !== undefined) suggestion.owner = owner;
  if (targetDate !== undefined) suggestion.targetDate = targetDate;
  if (actionSteps !== undefined) suggestion.actionSteps = actionSteps;
  suggestion.updatedAt = new Date().toISOString();

  await store.writeAll(suggestions);
  res.json(suggestion);
});

suggestionsRouter.delete("/:id", requireLeadership, async (req, res) => {
  const suggestions = await store.readAll();
  const next = suggestions.filter((s) => s.id !== req.params.id);
  if (next.length === suggestions.length) return res.status(404).json({ error: "not found" });
  await store.writeAll(next);
  res.status(204).end();
});
