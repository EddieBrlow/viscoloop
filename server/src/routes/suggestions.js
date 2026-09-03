import { Router } from "express";
import { randomUUID } from "node:crypto";
import { jsonStore } from "../lib/store.js";

const DATA_FILE = new URL("../../data/suggestions.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const store = jsonStore(DATA_FILE);

export const STATUSES = ["Submitted", "Under Review", "Planned", "In Progress", "Implemented", "Declined"];

export const suggestionsRouter = Router();

suggestionsRouter.get("/", async (req, res) => {
  const suggestions = await store.readAll();
  const { status } = req.query;
  const filtered = status ? suggestions.filter((s) => s.status === status) : suggestions;
  res.json(filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
});

// { title, description, category, submittedBy }
suggestionsRouter.post("/", async (req, res) => {
  const { title, description, category, submittedBy } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });

  const now = new Date().toISOString();
  const suggestions = await store.readAll();
  const suggestion = {
    id: randomUUID(),
    title,
    description: description || "",
    category: category || "General",
    submittedBy: submittedBy || "Anonymous",
    status: "Submitted",
    history: [{ status: "Submitted", at: now }],
    createdAt: now,
    updatedAt: now,
  };
  suggestions.push(suggestion);
  await store.writeAll(suggestions);
  res.status(201).json(suggestion);
});

// Move a suggestion to a new status in the pipeline: { status, note? }
suggestionsRouter.patch("/:id/status", async (req, res) => {
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

  await store.writeAll(suggestions);
  res.json(suggestion);
});

suggestionsRouter.delete("/:id", async (req, res) => {
  const suggestions = await store.readAll();
  const next = suggestions.filter((s) => s.id !== req.params.id);
  if (next.length === suggestions.length) return res.status(404).json({ error: "not found" });
  await store.writeAll(next);
  res.status(204).end();
});
