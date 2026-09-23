// Thin fetch wrappers around the ViscoLoop API. Kept dependency-free so the
// whole frontend runs with zero build step.

function leadershipHeaders() {
  const passcode = sessionStorage.getItem("viscoloop-leadership-passcode");
  return passcode ? { "x-leadership-passcode": passcode } : {};
}

// Generic CRUD for the simple "list of resources" endpoints: tools, HR, work guides, team.
function crudApi(base) {
  return {
    async list() {
      const res = await fetch(base);
      return res.json();
    },
    async add(payload) {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add");
      return res.json();
    },
    async remove(id) {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Failed to delete");
    },
  };
}

const toolsApi = crudApi("/api/tools");
const hrApi = crudApi("/api/hr");
const workGuidesApi = crudApi("/api/workguides");
const teamApi = crudApi("/api/team");

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

  getTools: () => toolsApi.list(),
  addTool: (payload) => toolsApi.add(payload),
  deleteTool: (id) => toolsApi.remove(id),

  getHrResources: () => hrApi.list(),
  addHrResource: (payload) => hrApi.add(payload),
  deleteHrResource: (id) => hrApi.remove(id),

  getWorkGuides: () => workGuidesApi.list(),
  addWorkGuide: (payload) => workGuidesApi.add(payload),
  deleteWorkGuide: (id) => workGuidesApi.remove(id),

  getTeam: () => teamApi.list(),
  addPerson: (payload) => teamApi.add(payload),
  deletePerson: (id) => teamApi.remove(id),

  async getSuggestionMeta() {
    const res = await fetch("/api/suggestions/meta");
    return res.json();
  },
  async unlockLeadership(passcode) {
    const res = await fetch("/api/suggestions/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Incorrect passcode");
    return data;
  },
  async getSuggestions() {
    const res = await fetch("/api/suggestions");
    return res.json();
  },
  async addSuggestion(payload) {
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to submit suggestion");
    return res.json();
  },
  async addSuggestionComment(id, author, text) {
    const res = await fetch(`/api/suggestions/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, text }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to add comment");
    return res.json();
  },
  async setSuggestionStatus(id, status, note) {
    const res = await fetch(`/api/suggestions/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...leadershipHeaders() },
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to update status");
    return res.json();
  },
  async updateSuggestionPlan(id, fields) {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...leadershipHeaders() },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
    return res.json();
  },
  async deleteSuggestion(id) {
    const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE", headers: leadershipHeaders() });
    if (!res.ok && res.status !== 404) throw new Error((await res.json()).error || "Failed to delete suggestion");
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
