import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { join, extname } from "node:path";
import { jsonStore } from "../lib/store.js";

const DATA_FILE = new URL("../../data/documents.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UPLOADS_DIR = new URL("../../uploads/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const store = jsonStore(DATA_FILE);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export const documentsRouter = Router();

// List all documents, optionally filtered by category: /api/documents?category=HR
documentsRouter.get("/", async (req, res) => {
  const docs = await store.readAll();
  const { category } = req.query;
  const filtered = category ? docs.filter((d) => d.category === category) : docs;
  res.json(filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
});

// Create a link-type document: { title, category, description, url }
documentsRouter.post("/", async (req, res) => {
  const { title, category, description, url } = req.body ?? {};
  if (!title || !url) return res.status(400).json({ error: "title and url are required" });

  const docs = await store.readAll();
  const doc = {
    id: randomUUID(),
    title,
    category: category || "General",
    description: description || "",
    type: "link",
    url,
    updatedAt: new Date().toISOString(),
  };
  docs.push(doc);
  await store.writeAll(docs);
  res.status(201).json(doc);
});

// Upload a file-type document: multipart form with fields title, category, description + file "file"
documentsRouter.post("/upload", upload.single("file"), async (req, res) => {
  const { title, category, description } = req.body ?? {};
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const docs = await store.readAll();
  const doc = {
    id: randomUUID(),
    title: title || req.file.originalname,
    category: category || "General",
    description: description || "",
    type: "file",
    url: `/files/${req.file.filename}`,
    originalName: req.file.originalname,
    updatedAt: new Date().toISOString(),
  };
  docs.push(doc);
  await store.writeAll(docs);
  res.status(201).json(doc);
});

documentsRouter.delete("/:id", async (req, res) => {
  const docs = await store.readAll();
  const next = docs.filter((d) => d.id !== req.params.id);
  if (next.length === docs.length) return res.status(404).json({ error: "not found" });
  await store.writeAll(next);
  res.status(204).end();
});
