// Thin fetch wrappers around the ViscoLoop API. Kept dependency-free so the
// whole frontend runs with zero build step.
const api = {
  async getDocuments() {
    const res = await fetch("/api/documents");
    return res.json();
  },
  async addDocumentLink(payload) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to add document");
    return res.json();
  },
  async uploadDocument(formData) {
    const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to upload document");
    return res.json();
  },
  async deleteDocument(id) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error("Failed to delete document");
  },

  async getTools() {
    const res = await fetch("/api/tools");
    return res.json();
  },
  async addTool(payload) {
    const res = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to add tool");
    return res.json();
  },
  async deleteTool(id) {
    const res = await fetch(`/api/tools/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error("Failed to delete tool");
  },

  async sendChatMessage(message, history) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error("Failed to reach the assistant");
    return res.json();
  },
};
