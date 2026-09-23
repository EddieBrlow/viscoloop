import { Router } from "express";
import { randomUUID } from "node:crypto";
import { jsonStore } from "./store.js";

// Shared "curated list of links" pattern used by Company Tools, HR, and Work
// Guides -- each is just {title/name, category, description, url, icon}
// with simple CRUD. Documents keeps its own router since it also supports
// file uploads.
export function createLinkDirectoryRouter(dataFilePath, { nameField = "name", defaultIcon = "🔗" } = {}) {
  const store = jsonStore(dataFilePath);
  const router = Router();

  router.get("/", async (_req, res) => {
    const items = await store.readAll();
    res.json(items.sort((a, b) => a[nameField].localeCompare(b[nameField])));
  });

  router.post("/", async (req, res) => {
    const body = req.body ?? {};
    const name = body[nameField];
    if (!name || !body.url) return res.status(400).json({ error: `${nameField} and url are required` });

    const items = await store.readAll();
    const item = {
      id: randomUUID(),
      [nameField]: name,
      url: body.url,
      description: body.description || "",
      category: body.category || "General",
      icon: body.icon || defaultIcon,
      updatedAt: new Date().toISOString(),
    };
    items.push(item);
    await store.writeAll(items);
    res.status(201).json(item);
  });

  router.put("/:id", async (req, res) => {
    const items = await store.readAll();
    const idx = items.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "not found" });
    items[idx] = { ...items[idx], ...req.body, id: items[idx].id, updatedAt: new Date().toISOString() };
    await store.writeAll(items);
    res.json(items[idx]);
  });

  router.delete("/:id", async (req, res) => {
    const items = await store.readAll();
    const next = items.filter((t) => t.id !== req.params.id);
    if (next.length === items.length) return res.status(404).json({ error: "not found" });
    await store.writeAll(next);
    res.status(204).end();
  });

  return router;
}
