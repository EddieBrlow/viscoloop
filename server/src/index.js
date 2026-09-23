import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { documentsRouter } from "./routes/documents.js";
import { toolsRouter } from "./routes/tools.js";
import { chatRouter } from "./routes/chat.js";
import { suggestionsRouter } from "./routes/suggestions.js";
import { teamRouter } from "./routes/team.js";
import { hrRouter } from "./routes/hr.js";
import { workGuidesRouter } from "./routes/workguides.js";

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
app.use("/api/suggestions", suggestionsRouter);
app.use("/api/team", teamRouter);
app.use("/api/hr", hrRouter);
app.use("/api/workguides", workGuidesRouter);

// The PWA itself
app.use(express.static(PUBLIC_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ViscoLoop running at http://localhost:${PORT}`);
});
