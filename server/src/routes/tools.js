import { Router } from "express";
import { randomUUID } from "node:crypto";
import { jsonStore } from "../lib/store.js";

const DATA_FILE = new URL("../../data/tools.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const store = jsonStore(DATA_FILE);

export const toolsRouter = Router();

toolsRouter.get("/", async (_req, res) => {
  const tools = await store.readAll();
  res.json(tools.sort((a, b) => a.name.localeCompare(b.name)));
});

// { name, url, description, category, icon } — icon is a single emoji shown on the card.
toolsRouter.post("/", async (req, res) => {
  const { name, url, description, category, icon } = req.body ?? {};
  if (!name || !url) return res.status(400).json({ error: "name and url are required" });

  const tools = await store.readAll();
  const tool = {
    id: randomUUID(),
    name,
    url,
    description: description || "",
    category: category || "General",
    icon: icon || "🔗",
    updatedAt: new Date().toISOString(),
  };
  tools.push(tool);
  await store.writeAll(tools);
  res.status(201).json(tool);
});

toolsRouter.put("/:id", async (req, res) => {
  const tools = await store.readAll();
  const idx = tools.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  tools[idx] = { ...tools[idx], ...req.body, id: tools[idx].id, updatedAt: new Date().toISOString() };
  await store.writeAll(tools);
  res.json(tools[idx]);
});

toolsRouter.delete("/:id", async (req, res) => {
  const tools = await store.readAll();
  const next = tools.filter((t) => t.id !== req.params.id);
  if (next.length === tools.length) return res.status(404).json({ error: "not found" });
  await store.writeAll(next);
  res.status(204).end();
});
