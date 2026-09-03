import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveContext } from "../lib/knowledge.js";

export const chatRouter = Router();

const SYSTEM_PROMPT = `You are the ViscoLoop assistant, an internal helper for company employees.
Answer questions about company policies, documents, and internal tools using ONLY the context
provided below each question. Be concise and friendly.

Rules:
- If the context answers the question, answer it directly and name which policy/document it came from.
- If the context does NOT contain the answer, say you couldn't find it in the knowledge base and
  suggest the employee check the Documents tab or ask their manager/HR — do not make things up.
- Never invent policy details, numbers, or dates that aren't in the context.`;

chatRouter.post("/", async (req, res) => {
  const { message, history } = req.body ?? {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      reply:
        "The AI assistant isn't configured yet. An admin needs to add ANTHROPIC_API_KEY to server/.env and restart the server.",
      configured: false,
    });
  }

  try {
    const matches = await retrieveContext(message);
    const context = matches.length
      ? matches.map((m) => `### ${m.title}\n${m.content}`).join("\n\n")
      : "(No matching internal documents were found for this question.)";

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        ...(Array.isArray(history) ? history.slice(-6) : []),
        {
          role: "user",
          content: `Context:\n${context}\n\nEmployee question: ${message}`,
        },
      ],
    });

    const reply = response.content.find((b) => b.type === "text")?.text ?? "Sorry, I couldn't generate a reply.";
    res.json({ reply, sources: matches.map((m) => m.title), configured: true });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong talking to the AI assistant." });
  }
});
