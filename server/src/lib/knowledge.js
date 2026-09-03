// Very small keyword-overlap retrieval over the /knowledge markdown files.
// This is intentionally simple (no embeddings/vector DB) so v1 works with
// zero extra infrastructure. Good enough to ground the bot's answers in your
// real policies; swap in a proper vector store later if the doc set grows.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const KNOWLEDGE_DIR = new URL("../../knowledge/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

let cache = null;

async function loadDocs() {
  if (cache) return cache;
  let files = [];
  try {
    files = (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith(".md") || f.endsWith(".txt"));
  } catch {
    files = [];
  }
  cache = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(KNOWLEDGE_DIR, file), "utf-8");
      const title = content.match(/^#\s*(.+)/m)?.[1] ?? file;
      return { file, title, content, tokens: new Set(tokenize(content)) };
    })
  );
  return cache;
}

// Call this if knowledge files change while the server is running.
export function invalidateKnowledgeCache() {
  cache = null;
}

export async function retrieveContext(question, topN = 3) {
  const docs = await loadDocs();
  if (docs.length === 0) return [];

  const qTokens = tokenize(question);
  const scored = docs.map((doc) => {
    const overlap = qTokens.filter((t) => doc.tokens.has(t)).length;
    return { ...doc, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((d) => d.score > 0).slice(0, topN);
}
