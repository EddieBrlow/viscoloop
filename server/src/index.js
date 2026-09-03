import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { documentsRouter } from "./routes/documents.js";
import { toolsRouter } from "./routes/tools.js";
import { chatRouter } from "./routes/chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "..", "public");
const UPLOADS_DIR = join(__dirname, "..", "uploads");

const app = express();
app.use(cors());
app.use(express.json());

// Uploaded documents are served from /files
app.use("/files", express.static(UPLOADS_DIR));

// API
app.use("/api/documents", documentsRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/chat", chatRouter);

// The PWA itself
app.use(express.static(PUBLIC_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ViscoLoop running at http://localhost:${PORT}`);
});
