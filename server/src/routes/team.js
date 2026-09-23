import { Router } from "express";
import { randomUUID } from "node:crypto";
import { jsonStore } from "../lib/store.js";

const DATA_FILE = new URL("../../data/team.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const store = jsonStore(DATA_FILE);

export const teamRouter = Router();

teamRouter.get("/", async (_req, res) => {
  const people = await store.readAll();
  res.json(people.sort((a, b) => a.name.localeCompare(b.name)));
});

// { name, role, department, phone, email }
teamRouter.post("/", async (req, res) => {
  const { name, role, department, phone, email } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const people = await store.readAll();
  const person = {
    id: randomUUID(),
    name,
    role: role || "",
    department: department || "General",
    phone: phone || "",
    email: email || "",
    updatedAt: new Date().toISOString(),
  };
  people.push(person);
  await store.writeAll(people);
  res.status(201).json(person);
});

teamRouter.put("/:id", async (req, res) => {
  const people = await store.readAll();
  const idx = people.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  people[idx] = { ...people[idx], ...req.body, id: people[idx].id, updatedAt: new Date().toISOString() };
  await store.writeAll(people);
  res.json(people[idx]);
});

teamRouter.delete("/:id", async (req, res) => {
  const people = await store.readAll();
  const next = people.filter((p) => p.id !== req.params.id);
  if (next.length === people.length) return res.status(404).json({ error: "not found" });
  await store.writeAll(next);
  res.status(204).end();
});
